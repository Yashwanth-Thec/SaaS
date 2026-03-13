"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const STEPS = ["Your profile", "Your company", "Done"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]         = useState(0);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName]   = useState("");
  const [domain, setDomain]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 0) { setStep(1); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, orgName, domain }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed"); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Shield className="w-4 h-4 text-base" />
          </div>
          <span className="font-display font-bold text-lg text-primary">SaaS-Scrub</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${
                i < step ? "bg-accent text-base" :
                i === step ? "bg-accent/20 text-accent border border-accent/40" :
                "bg-elevated text-muted border border-border"
              }`}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "text-primary" : "text-muted"}`}>{label}</span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted" />}
            </div>
          ))}
        </div>

        <div className="card p-6">
          {step === 0 ? (
            <>
              <h1 className="font-display font-bold text-xl text-primary mb-1">Create your account</h1>
              <p className="text-secondary text-sm mb-6">You&apos;ll be the workspace admin.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Full Name" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
                <Input label="Work Email" type="email" placeholder="jane@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
                <Input label="Password" type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                <Button type="submit" className="w-full mt-2" size="lg">Continue →</Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-xl text-primary mb-1">Your workspace</h1>
              <p className="text-secondary text-sm mb-6">This is how your team will find you.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Company Name" placeholder="Acme Corp" value={orgName} onChange={e => setOrgName(e.target.value)} required />
                <Input label="Company Domain" placeholder="acmecorp.io" value={domain} onChange={e => setDomain(e.target.value)} hint="Used to auto-detect employees" />
                {error && (
                  <div className="px-3 py-2.5 rounded bg-danger/10 border border-danger/20 text-xs text-danger">{error}</div>
                )}
                <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
                  Create Workspace
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-secondary mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
