/**
 * AWS Integration
 *
 * Uses cross-account IAM role assumption (STS AssumeRole) to access:
 *   - AWS Cost Explorer  → AWS services as SaasApps + SpendRecords
 *   - AWS IAM            → IAM users as AppAccess entries
 *
 * No third-party middleware. Customer creates a read-only IAM role in their
 * account and trusts SaaS-Scrub's AWS account to assume it. A per-org
 * External ID prevents confused deputy attacks.
 *
 * Required env vars (SaaS-Scrub side):
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION          (defaults to us-east-1)
 *   AWS_ACCOUNT_ID      (shown to customer in setup instructions)
 */

import { createHmac } from "crypto";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { IAMClient, ListUsersCommand } from "@aws-sdk/client-iam";
import { db } from "@/lib/db";
import type { DiscoveredApp, DiscoveredAccess, DiscoveredSpend } from "./sync-engine";

// ─── Constants ────────────────────────────────────────────────────────────────

const REGION = process.env.AWS_REGION ?? "us-east-1";

/** AWS services → SaaS-Scrub category mapping */
const SERVICE_CATEGORIES: Record<string, string> = {
  "Amazon Elastic Compute Cloud - Compute": "dev",
  "Amazon Simple Storage Service":          "dev",
  "Amazon Relational Database Service":     "dev",
  "AWS Lambda":                             "dev",
  "Amazon CloudFront":                      "dev",
  "Amazon Route 53":                        "dev",
  "Amazon DynamoDB":                        "dev",
  "Amazon ElastiCache":                     "dev",
  "Amazon Simple Queue Service":            "dev",
  "Amazon Simple Notification Service":     "dev",
  "Amazon Elastic Kubernetes Service":      "dev",
  "Amazon Elastic Container Service":       "dev",
  "Amazon Elastic Container Registry":      "dev",
  "AWS Key Management Service":             "security",
  "AWS Shield":                             "security",
  "AWS WAF":                                "security",
  "Amazon GuardDuty":                       "security",
  "AWS CloudTrail":                         "security",
  "Amazon Inspector":                       "security",
  "AWS Secrets Manager":                    "security",
  "Amazon Cognito":                         "security",
  "Amazon Redshift":                        "analytics",
  "Amazon Athena":                          "analytics",
  "AWS Glue":                               "analytics",
  "Amazon QuickSight":                      "analytics",
  "Amazon OpenSearch Service":              "analytics",
  "Amazon SageMaker":                       "analytics",
  "Amazon Rekognition":                     "analytics",
  "Amazon Comprehend":                      "analytics",
  "AWS Cost Explorer":                      "finance",
  "Amazon WorkSpaces":                      "productivity",
  "Amazon Chime":                           "communication",
  "AWS Support":                            "other",
};

/** Shorten verbose AWS service names for display */
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  "Amazon Elastic Compute Cloud - Compute": "AWS EC2",
  "Amazon Simple Storage Service":          "AWS S3",
  "Amazon Relational Database Service":     "AWS RDS",
  "AWS Lambda":                             "AWS Lambda",
  "Amazon CloudFront":                      "AWS CloudFront",
  "Amazon Route 53":                        "AWS Route 53",
  "Amazon DynamoDB":                        "AWS DynamoDB",
  "Amazon ElastiCache":                     "AWS ElastiCache",
  "Amazon Simple Queue Service":            "AWS SQS",
  "Amazon Simple Notification Service":     "AWS SNS",
  "Amazon Elastic Kubernetes Service":      "AWS EKS",
  "Amazon Elastic Container Service":       "AWS ECS",
  "Amazon Elastic Container Registry":      "AWS ECR",
  "AWS Key Management Service":             "AWS KMS",
  "Amazon GuardDuty":                       "AWS GuardDuty",
  "AWS CloudTrail":                         "AWS CloudTrail",
  "AWS Secrets Manager":                    "AWS Secrets Manager",
  "Amazon Cognito":                         "AWS Cognito",
  "Amazon Redshift":                        "AWS Redshift",
  "Amazon Athena":                          "AWS Athena",
  "AWS Glue":                               "AWS Glue",
  "Amazon QuickSight":                      "AWS QuickSight",
  "Amazon OpenSearch Service":              "AWS OpenSearch",
  "Amazon SageMaker":                       "AWS SageMaker",
  "Amazon WorkSpaces":                      "AWS WorkSpaces",
};

// ─── ARN Validation ───────────────────────────────────────────────────────────

/**
 * Validates that a string looks like a valid IAM role ARN.
 * Prevents injection of arbitrary values into the STS call.
 *
 * Format: arn:aws:iam::<account-id>:role/<role-name>
 */
export function isValidRoleArn(arn: string): boolean {
  return /^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]{1,512}$/.test(arn);
}

// ─── Config shape stored in Integration.config ────────────────────────────────

interface AwsConfig {
  roleArn:    string;
  externalId: string;
  accountId:  string; // customer's AWS account ID (extracted from ARN for display)
}

// ─── STS: Assume customer's role ─────────────────────────────────────────────

async function assumeCustomerRole(roleArn: string, externalId: string) {
  const sts = new STSClient({
    region: REGION,
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const result = await sts.send(new AssumeRoleCommand({
    RoleArn:         roleArn,
    RoleSessionName: "SaaSScrubSync",
    ExternalId:      externalId,
    DurationSeconds: 900, // 15 minutes — enough for one sync
  }));

  const creds = result.Credentials;
  if (!creds?.AccessKeyId || !creds?.SecretAccessKey || !creds?.SessionToken) {
    throw new Error("STS did not return valid temporary credentials");
  }

  return {
    accessKeyId:     creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken:    creds.SessionToken,
  };
}

// ─── Cost Explorer: service spend ─────────────────────────────────────────────

async function fetchServiceCosts(
  creds: Awaited<ReturnType<typeof assumeCustomerRole>>
): Promise<{ apps: DiscoveredApp[]; spend: DiscoveredSpend[] }> {
  const ce = new CostExplorerClient({
    region: "us-east-1", // Cost Explorer is only in us-east-1
    credentials: creds,
  });

  // Pull last 3 months of cost data
  const end   = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  const startStr = start.toISOString().slice(0, 7) + "-01"; // first of the month
  const endStr   = end.toISOString().slice(0, 10);

  const response = await ce.send(new GetCostAndUsageCommand({
    TimePeriod:  { Start: startStr, End: endStr },
    Granularity: "MONTHLY",
    Metrics:     ["UnblendedCost"],
    GroupBy:     [{ Type: "DIMENSION", Key: "SERVICE" }],
  }));

  const appMap  = new Map<string, DiscoveredApp>();
  const spendRecords: DiscoveredSpend[] = [];

  for (const period of response.ResultsByTime ?? []) {
    const periodDate = new Date(period.TimePeriod?.Start ?? startStr);

    for (const group of period.Groups ?? []) {
      const rawName = group.Keys?.[0] ?? "Unknown Service";
      if (rawName === "Tax") continue; // skip tax line items

      const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? "0");
      if (amount < 0.01) continue; // skip negligible spend

      const displayName = SERVICE_DISPLAY_NAMES[rawName] ?? rawName;
      const category    = SERVICE_CATEGORIES[rawName]    ?? "dev";

      // Build/update app entry — keep highest monthly spend
      const existing = appMap.get(displayName);
      if (!existing || amount > (existing.monthlySpend ?? 0)) {
        appMap.set(displayName, {
          name:         displayName,
          category,
          monthlySpend: Math.round(amount * 100) / 100,
          source:       "aws",
        });
      }

      spendRecords.push({
        appName:    displayName,
        amount:     Math.round(amount * 100) / 100,
        date:       periodDate,
        description: `${displayName} — ${period.TimePeriod?.Start?.slice(0, 7)}`,
        source:     "aws",
        isRecurring: true,
      });
    }
  }

  return {
    apps:  Array.from(appMap.values()),
    spend: spendRecords,
  };
}

// ─── IAM: list IAM users (map to AppAccess later) ────────────────────────────

async function fetchIamUsers(
  creds: Awaited<ReturnType<typeof assumeCustomerRole>>
): Promise<DiscoveredAccess[]> {
  const iam = new IAMClient({ region: REGION, credentials: creds });
  const access: DiscoveredAccess[] = [];
  let marker: string | undefined;

  do {
    const res = await iam.send(new ListUsersCommand({
      MaxItems: 100,
      Marker:   marker,
    }));

    for (const user of res.Users ?? []) {
      if (!user.UserName) continue;
      // IAM usernames are often emails; skip service accounts (contain +)
      const email = user.UserName.includes("@") ? user.UserName : null;
      if (!email) continue;

      access.push({
        employeeEmail: email,
        appName:       "AWS",  // maps to a synthetic "AWS" top-level app
        lastLoginAt:   user.PasswordLastUsed ?? undefined,
        isActive:      true,
      });
    }

    marker = res.IsTruncated ? res.Marker : undefined;
  } while (marker);

  return access;
}

// ─── Connect: validate ARN and store config ───────────────────────────────────

export async function connectAws(
  orgId:    string,
  roleArn:  string,
  externalId: string
): Promise<void> {
  if (!isValidRoleArn(roleArn)) {
    throw new Error("Invalid Role ARN format. Expected: arn:aws:iam::<account-id>:role/<role-name>");
  }

  // Validate by actually assuming the role — this will throw if trust is wrong
  await assumeCustomerRole(roleArn, externalId);

  const accountId = roleArn.split(":")[4]; // extract from ARN

  const config: AwsConfig = { roleArn, externalId, accountId };

  await db.integration.upsert({
    where:  { orgId_type: { orgId, type: "aws" } },
    update: { config: JSON.stringify(config), status: "connected", lastError: null },
    create: {
      orgId,
      type:   "aws",
      name:   "Amazon Web Services",
      status: "connected",
      config: JSON.stringify(config),
    },
  });
}

// ─── Full sync ────────────────────────────────────────────────────────────────

export async function syncAws(orgId: string): Promise<{
  apps:  DiscoveredApp[];
  spend: DiscoveredSpend[];
  access: DiscoveredAccess[];
}> {
  const integration = await db.integration.findUnique({
    where: { orgId_type: { orgId, type: "aws" } },
  });
  if (!integration?.config) throw new Error("AWS not connected");

  const { roleArn, externalId } = JSON.parse(integration.config) as AwsConfig;

  const creds = await assumeCustomerRole(roleArn, externalId);

  const [{ apps, spend }, access] = await Promise.all([
    fetchServiceCosts(creds),
    fetchIamUsers(creds),
  ]);

  return { apps, spend, access };
}

// ─── Credential check ─────────────────────────────────────────────────────────

export function isAwsConfigured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export function getAwsAccountId(): string {
  return process.env.AWS_ACCOUNT_ID ?? "YOUR_SAAS_SCRUB_ACCOUNT_ID";
}

// ─── External ID generation ───────────────────────────────────────────────────

/**
 * Returns the per-org External ID for use in the trust policy.
 *
 * HMAC-signed with EXTERNAL_ID_SECRET so an attacker who knows or can guess
 * an orgId cannot construct a valid External ID and abuse our STS principal
 * (confused deputy attack).
 *
 * EXTERNAL_ID_SECRET must be set once and never rotated — changing it
 * invalidates all existing customer trust policies.
 */
export function getExternalId(orgId: string): string {
  const secret = process.env.EXTERNAL_ID_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("EXTERNAL_ID_SECRET must be set and at least 32 characters in production");
    }
    // Dev-only fallback
    return `dev-saas-scrub-${orgId}`;
  }
  const hash = createHmac("sha256", secret).update(orgId).digest("hex");
  // Prefix makes it recognizable in AWS CloudTrail logs
  return `ss-${hash}`;
}
