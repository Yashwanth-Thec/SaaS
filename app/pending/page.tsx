import { clearSessionCookie, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function PendingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await db.organization.findUnique({
    where: { id: session.orgId },
    select: { name: true, status: true },
  });

  // If somehow active now, send them in
  if (org?.status === "active") redirect("/dashboard");

  const isSuspended = org?.status === "suspended";

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6L12 2z" fill="#0a0a0a" />
              <path d="M9 12l2 2 4-4" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xl font-black text-primary tracking-tight">SaaS-Scrub</span>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8">
          <div className="text-4xl mb-4">{isSuspended ? "🔒" : "⏳"}</div>
          <h1 className="text-xl font-bold text-primary mb-2">
            {isSuspended ? "Account suspended" : "Account pending approval"}
          </h1>
          <p className="text-secondary text-sm leading-relaxed mb-6">
            {isSuspended
              ? "Your account has been suspended. Please reach out to us directly to resolve this."
              : `Thanks for signing up${org?.name ? ` — ${org.name}` : ""}. We review every account before granting access. We'll be in touch within 24 hours.`}
          </p>
          <div className="bg-base border border-border rounded-xl p-4 text-left mb-6">
            <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Questions?</p>
            <p className="text-sm text-primary font-semibold">yashwanthnarayansb@gmail.com</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl border border-border text-secondary text-sm font-medium hover:bg-base transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
