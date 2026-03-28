import { redirect }       from "next/navigation";
import { getCurrentUser }  from "@/lib/auth";
import { hasAnthropicKey } from "@/lib/ai/claude";
import { AdvisorShell }    from "./AdvisorShell";

export const metadata = { title: "AI Advisor — SaaS-Scrub" };

export default async function AdvisorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AdvisorShell
      orgName={user.org.name}
      userName={user.name}
      apiKeySet={hasAnthropicKey()}
    />
  );
}
