export type Plan = "free" | "starter" | "growth" | "enterprise" | "owner";

interface PlanFeatures {
  maxIntegrations: number;   // -1 = unlimited
  aiAdvisor: boolean;
  autoOffboarding: boolean;
  renewalAlerts: boolean;
  adminPanel: boolean;
  savingsCommittee: boolean; // multi-agent AI feature
}

const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  free: {
    maxIntegrations: 1,
    aiAdvisor: false,
    autoOffboarding: false,
    renewalAlerts: false,
    adminPanel: false,
    savingsCommittee: false,
  },
  starter: {
    maxIntegrations: 3,
    aiAdvisor: false,
    autoOffboarding: false,
    renewalAlerts: false,
    adminPanel: false,
    savingsCommittee: false,
  },
  growth: {
    maxIntegrations: -1,
    aiAdvisor: true,
    autoOffboarding: true,
    renewalAlerts: true,
    adminPanel: false,
    savingsCommittee: true,
  },
  enterprise: {
    maxIntegrations: -1,
    aiAdvisor: true,
    autoOffboarding: true,
    renewalAlerts: true,
    adminPanel: false,
    savingsCommittee: true,
  },
  owner: {
    maxIntegrations: -1,
    aiAdvisor: true,
    autoOffboarding: true,
    renewalAlerts: true,
    adminPanel: true,
    savingsCommittee: true,
  },
};

export function getFeatures(plan: string): PlanFeatures {
  return PLAN_FEATURES[plan as Plan] ?? PLAN_FEATURES.free;
}

export function canUse(plan: string, feature: keyof PlanFeatures): boolean {
  const f = getFeatures(plan);
  const val = f[feature];
  if (typeof val === "boolean") return val;
  return true; // non-boolean features are always "can use" — check limit separately
}

export function integrationLimit(plan: string): number {
  return getFeatures(plan).maxIntegrations;
}
