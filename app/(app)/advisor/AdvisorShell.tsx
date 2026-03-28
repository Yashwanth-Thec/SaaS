"use client";
import { useState }          from "react";
import { Brain, Users }       from "lucide-react";
import { cn }                 from "@/lib/utils";
import { AdvisorClient }      from "./AdvisorClient";
import { SavingsCommittee }   from "./SavingsCommittee";

type Tab = "chat" | "committee";

export function AdvisorShell({
  orgName,
  userName,
  apiKeySet,
}: {
  orgName:   string;
  userName:  string;
  apiKeySet: boolean;
}) {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b border-border bg-surface flex-shrink-0">
        <div className="flex">
          {([
            { id: "chat",      icon: Brain, label: "SaaS Advisor",          sub: "Chat + tool use + thinking" },
            { id: "committee", icon: Users, label: "Savings Committee",     sub: "Multi-agent analysis" },
          ] as { id: Tab; icon: typeof Brain; label: string; sub: string }[]).map(({ id, icon: Icon, label, sub }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3.5 text-sm border-b-2 transition-colors",
                tab === id
                  ? "border-accent text-primary"
                  : "border-transparent text-muted hover:text-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium leading-none">{label}</div>
                <div className="text-xs text-muted mt-0.5">{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "chat"      && <AdvisorClient orgName={orgName} userName={userName} apiKeySet={apiKeySet} />}
        {tab === "committee" && <SavingsCommittee />}
      </div>
    </div>
  );
}
