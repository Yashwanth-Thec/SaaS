# SaaS-Scrub Integrations

How each integration works, what it pulls, and what's needed to set it up.

---

## 1. Google Workspace

**What it does:** Discovers every employee in the org and every third-party OAuth app they've authorized via "Sign in with Google". Identifies last login per app per user — the core signal for zombie app detection.

**Data pulled:**
- All users → `Employee` table (name, email, department, job title, active/offboarded)
- All OAuth-authorized apps → `SaasApp` table (app name, category)
- Login activity per app → `AppAccess` table (who used what, last login timestamp)

**How it works:**
```
Customer clicks "Connect Google Workspace"
  → OAuth consent screen (customer grants admin read access)
  → Tokens stored in Integration.config for their org
  → Admin Directory API: lists all users
  → Admin Reports API: pulls token events (last 30 days)
  → sync engine upserts Employees + SaasApps + AppAccess
```

**Limitations:**
- Reports API only goes back 30 days
- Only catches apps that use "Sign in with Google" — misses apps employees pay for personally
- Requires a Google Workspace domain admin account (not personal Gmail)

**Setup — you (once):**
1. Google Cloud Console → create project
2. Enable: Admin SDK API, Admin Reports API
3. OAuth consent screen → External → add test users while in development
4. Credentials → Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/integrations/google/callback`
   - `https://saas-scrub.vercel.app/api/integrations/google/callback`
6. Copy Client ID + Secret → `.env` and Vercel env vars:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   NEXT_PUBLIC_URL=https://saas-scrub.vercel.app
   ```

**Setup — customer:**
- Must be a Google Workspace domain admin
- Clicks "Connect Google Workspace" → authorizes read-only access
- No config needed on their end

---

## 2. Plaid (Bank / Corporate Card)

**What it does:** Connects directly to the customer's bank or corporate credit card. Pulls 90 days of transactions and identifies SaaS subscriptions by matching merchant names against a known vendor list. Also detects shadow IT — unrecognized recurring charges that look like SaaS subscriptions.

**Data pulled:**
- Recognized SaaS charges → `SaasApp` + `SpendRecord` tables
- Unrecognized SaaS-like charges → `SpendRecord` table (flagged as potential shadow IT)

**How it works:**
```
Customer clicks "Connect Bank Account"
  → POST /api/integrations/plaid/link → creates a link_token
  → Frontend opens Plaid Link modal (Plaid's UI, not ours)
  → Customer selects their bank and authenticates with Plaid
  → Plaid returns a public_token to the frontend
  → POST /api/integrations/plaid/exchange → exchanges for access_token (stored in DB)
  → POST /api/integrations/plaid/sync → pulls transactions, matches vendors, upserts spend
```

**Shadow IT detection logic:**
A transaction is flagged as shadow IT if it:
- Is a small amount (<$500)
- Is a round number or matches common SaaS price points ($5, $9, $15, $29, $49, $99, etc.)
- Description contains tech keywords (software, cloud, app, platform, ai, etc.)

**Sandbox testing credentials:**
```
Username: user_good
Password: pass_good
```

**Setup — you (once):**
1. Sign up at dashboard.plaid.com
2. Get Client ID and Secret from the dashboard
3. Add to `.env` and Vercel:
   ```
   PLAID_CLIENT_ID=...
   PLAID_SECRET=...
   PLAID_ENV=sandbox       # change to "production" when live
   ```
4. When going to production, apply for Plaid production access (requires business verification)

**Setup — customer:**
- Clicks "Connect Bank Account"
- Plaid modal opens — they log in with their actual bank credentials (handled entirely by Plaid, credentials never touch SaaS-Scrub)
- Done

---

## 3. CSV Upload

**What it does:** Accepts a raw CSV file upload and auto-detects which of three formats it is. No custom formatting required — customers can drop in a bank export, an IT spreadsheet, or an HR export.

**Three auto-detected formats:**

| Format | Required columns | What it produces |
|--------|-----------------|-----------------|
| Bank Statement | `date`, `description`/`memo`, `amount` | SaasApps + SpendRecords |
| App Inventory | `name`/`app`, `cost`/`seats` | SaasApps |
| Employee List | `name`, `email` | Employees |

**How format is detected:**
The parser reads the header row and checks for combinations of key columns. Column names are fuzzy-matched — `memo`, `narration`, `description` all work. `seats`, `licenses`, `users` all work. No exact match required.

**Bank statement flow:**
Each transaction description is scanned against a list of 30+ known SaaS vendor patterns (Slack, Zoom, Figma, GitHub, etc.). Matching transactions become `SpendRecord`s and the vendor becomes a `SaasApp`.

**What customers export and where from:**

| Source | How to export |
|--------|--------------|
| Chase Business | Accounts → Download → CSV |
| Amex Corporate | Statements → Download → CSV |
| BambooHR | Reports → Employee List → Export |
| Rippling | Directory → Export |
| Internal IT spreadsheet | Save As → CSV |

**Setup — you:** Nothing. No API keys needed. Works out of the box.

**Setup — customer:** Click "Upload CSV" → select file → done. Up to 10 MB.

---

## 4. Slack

**What it does:** Sends notifications to a Slack channel when zombie apps are detected, syncs complete, or budget thresholds are hit.

**How it works:**
```
Customer creates a Slack Incoming Webhook URL
  → Pastes it into Settings → Integrations → Slack
  → POST /api/integrations/slack saves the webhook URL per org
  → Notification events call the webhook URL directly
```

This is a webhook-based integration — no OAuth, no Plaid-style modal. The customer generates the URL themselves in Slack and pastes it in.

**Setup — you:** Nothing. No env vars needed.

**Setup — customer:**
1. Go to api.slack.com/apps → Create New App → From Scratch
2. Incoming Webhooks → Activate → Add New Webhook to Workspace
3. Pick the channel to post to → Allow
4. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)
5. Paste it into SaaS-Scrub → Settings → Slack

---

## 5. Amazon Web Services (IAM Role)

**What it does:** Connects to the customer's AWS account using a read-only cross-account IAM role. Pulls AWS Cost Explorer data — every AWS service they're using and what they spend on it each month.

**Data pulled:**
- AWS services in use → `SaasApp` table (EC2, S3, RDS, Lambda, etc.)
- Monthly spend per service → `SpendRecord` table (last 3 months)
- IAM users with console access → `Employee` + `AppAccess` tables

**How it works:**
```
Customer clicks "Connect AWS"
  → UI shows their unique External ID (saas-scrub-{orgId})
  → Step-by-step: create IAM role → paste trust policy → paste permissions policy
  → Customer pastes their Role ARN
  → POST /api/integrations/aws/connect:
      1. Validates ARN format (regex — prevents injection)
      2. STS AssumeRole with External ID (validates trust is set up)
      3. Stores roleArn + externalId in Integration.config
      4. Cost Explorer: GetCostAndUsage grouped by SERVICE (last 3 months)
      5. IAM: ListUsers for console-access employees
      6. upserts SaasApps + SpendRecords + AppAccess
```

**Why cross-account IAM role (not API keys):**
- No long-lived credentials stored — we use temporary STS tokens (15 min lifetime)
- Customer stays in control: they can revoke the role at any time from their AWS Console
- Read-only minimum permissions — no write access requested

**External ID security:**
The External ID (`saas-scrub-{orgId}`) prevents confused deputy attacks — a malicious actor can't trick SaaS-Scrub into assuming a role in an unrelated AWS account because the trust policy requires the specific External ID for that org.

**IAM Role the customer creates:**

Trust Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::<SAAS_SCRUB_ACCOUNT_ID>:root" },
    "Action": "sts:AssumeRole",
    "Condition": { "StringEquals": { "sts:ExternalId": "saas-scrub-<orgId>" } }
  }]
}
```

Permissions Policy (read-only):
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ce:GetCostAndUsage", "ce:GetCostForecast", "iam:ListUsers", "iam:GetAccountSummary"],
    "Resource": "*"
  }]
}
```

**Setup — you (once):**
1. Create an IAM user or role for SaaS-Scrub in your AWS account
2. Grant it permission to call `sts:AssumeRole`
3. Add to `.env` and Vercel:
   ```
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   AWS_ACCOUNT_ID=<your 12-digit account ID>
   NEXT_PUBLIC_AWS_ACCOUNT_ID=<same value>
   ```

**Setup — customer:**
1. Open the AWS integration card → follow the 4-step wizard
2. Create an IAM role in their AWS Console (5 minutes)
3. Paste the Role ARN → click "Validate & Connect"

---

## How all sources combine

All four integrations feed into the same sync engine (`lib/integrations/sync-engine.ts`), which upserts into the same tables. A single org can have all four connected simultaneously — data is deduplicated by app name.

```
Google Workspace ──┐
AWS              ──┤
Plaid            ──┼──► sync-engine ──► Employees + SaasApps + AppAccess + SpendRecords
CSV Upload       ──┤
(Slack is outbound only — it receives notifications, doesn't feed data in)
```

**Zombie detection** runs across all sources: if an app appears in spend records but has no `AppAccess` entry with a login in the last 90 days, it's flagged as a zombie.

---

## Environment variables reference

| Variable | Used by | Required |
|----------|---------|----------|
| `GOOGLE_CLIENT_ID` | Google Workspace OAuth | Yes, for Google integration |
| `GOOGLE_CLIENT_SECRET` | Google Workspace OAuth | Yes, for Google integration |
| `NEXT_PUBLIC_URL` | Google OAuth redirect URI | Yes, for production |
| `PLAID_CLIENT_ID` | Plaid bank connect | Yes, for Plaid integration |
| `PLAID_SECRET` | Plaid bank connect | Yes, for Plaid integration |
| `PLAID_ENV` | Plaid environment | Yes (`sandbox` or `production`) |
| `AWS_ACCESS_KEY_ID` | AWS STS AssumeRole | Yes, for AWS integration |
| `AWS_SECRET_ACCESS_KEY` | AWS STS AssumeRole | Yes, for AWS integration |
| `AWS_REGION` | AWS SDK region | Optional (defaults to us-east-1) |
| `AWS_ACCOUNT_ID` | Shown in server-side trust policy | Yes, for AWS integration |
| `NEXT_PUBLIC_AWS_ACCOUNT_ID` | Shown in UI trust policy instructions | Yes, for AWS integration |
| `DATABASE_URL` | All integrations (via Prisma) | Always |
| `JWT_SECRET` | Session auth on all routes | Always |
