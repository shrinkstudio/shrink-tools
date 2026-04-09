// -----------------------------------------
// PROJECT ESTIMATOR — types + pricing maths
// Ported from shrinkstudio/internal-tools (src/lib/calculations.ts).
// Config shape matches shrink-studio-api/api/_data/estimator-config.json.
// -----------------------------------------

export type ServiceType = "discovery" | "development" | "optimisation";

export type Role = {
  id: string;
  title: string;
  baseCostDay: number;
  markupPct: number;
};

type PerSeatDiscoveryTier = {
  id: string;
  label: string;
  description: string;
  pricingMode: "per-seat";
  pricePerSeat: number;
  minSeats: number;
  maxSeats: number;
};

type DayBasedDiscoveryTier = {
  id: string;
  label: string;
  description: string;
  pricingMode: "day-based";
  allocations: { roleId: string; days: number }[];
};

export type DiscoveryTier = PerSeatDiscoveryTier | DayBasedDiscoveryTier;

export type DevItem = {
  id: string;
  name: string;
  phase: string;
  effortMin: number;
  effortMax: number;
  team: string[];
};

export type DevSubtype =
  | {
      id: string;
      label: string;
      description: string;
      mode: "itemised";
      items: DevItem[];
      minInvestment?: number;
    }
  | { id: string; label: string; description: string; mode: "enquiry-only" };

export type OptTier = {
  id: string;
  label: string;
  monthlyPrice: number;
  description: string;
};

export type Addon = {
  id: string;
  name: string;
  appliesTo: ServiceType[];
  effortMin: number;
  effortMax: number;
  team: string[];
};

export type EstimatorConfig = {
  version: 1;
  currency: "GBP";
  overheadPerDay: number;
  annualBillableDays: number;
  roles: Role[];
  services: {
    discovery: { tiers: DiscoveryTier[] };
    development: { subtypes: DevSubtype[] };
    optimisation: { tiers: OptTier[] };
    addons: Addon[];
  };
};

export type Selection = {
  type: ServiceType;
  discoveryTier?: string;
  seats: number;
  devSubtype?: string;
  devItems: string[];
  optTier?: string;
  addons: string[];
};

export type EstimateResult =
  | { mode: "range"; low: number; high: number }
  | { mode: "single"; value: number; recurring?: boolean }
  | { mode: "enquiry" };

// -----------------------------------------
// Pure pricing maths (ported verbatim)
// -----------------------------------------

export function calculateClientDayRate(
  baseCostDay: number,
  overheadPerDay: number,
  markupPct: number
): number {
  const totalCost = baseCostDay + overheadPerDay;
  return totalCost + totalCost * markupPct;
}

export function calculateLineInvestment(
  roleAllocations: { roleId: string; days: number }[],
  roles: Role[],
  overheadPerDay: number
): number {
  return roleAllocations.reduce((total, alloc) => {
    const role = roles.find((r) => r.id === alloc.roleId);
    if (!role) return total;
    return (
      total +
      alloc.days *
        calculateClientDayRate(role.baseCostDay, overheadPerDay, role.markupPct)
    );
  }, 0);
}

// Evenly split a given day count across an item's team roles.
function allocationsFor(item: { team: string[] }, days: number) {
  if (!item.team?.length) return [];
  const per = days / item.team.length;
  return item.team.map((roleId) => ({ roleId, days: per }));
}

function sumItemRange(
  items: { team: string[]; effortMin: number; effortMax: number }[],
  roles: Role[],
  overheadPerDay: number
): { low: number; high: number } {
  let low = 0;
  let high = 0;
  for (const item of items) {
    low += calculateLineInvestment(allocationsFor(item, item.effortMin), roles, overheadPerDay);
    high += calculateLineInvestment(allocationsFor(item, item.effortMax), roles, overheadPerDay);
  }
  return { low, high };
}

function getApplicableAddons(config: EstimatorConfig, selection: Selection): Addon[] {
  return config.services.addons.filter(
    (a) => selection.addons.includes(a.id) && a.appliesTo.includes(selection.type)
  );
}

export function computeEstimate(
  config: EstimatorConfig,
  selection: Selection
): EstimateResult {
  const { roles, overheadPerDay, services } = config;
  const addonItems = getApplicableAddons(config, selection);

  if (selection.type === "discovery") {
    const tier = services.discovery.tiers.find((t) => t.id === selection.discoveryTier);
    if (!tier) return { mode: "enquiry" };

    if (tier.pricingMode === "per-seat") {
      const seats = Math.max(tier.minSeats, selection.seats || tier.minSeats);
      const base = tier.pricePerSeat * seats;
      if (addonItems.length) {
        const addonRange = sumItemRange(addonItems, roles, overheadPerDay);
        return {
          mode: "range",
          low: Math.round(base + addonRange.low),
          high: Math.round(base + addonRange.high),
        };
      }
      return { mode: "single", value: Math.round(base) };
    }

    const tierCost = calculateLineInvestment(tier.allocations, roles, overheadPerDay);
    const addonRange = sumItemRange(addonItems, roles, overheadPerDay);
    return {
      mode: "range",
      low: Math.round(tierCost + addonRange.low),
      high: Math.round(tierCost + addonRange.high),
    };
  }

  if (selection.type === "development") {
    const sub = services.development.subtypes.find((s) => s.id === selection.devSubtype);
    if (!sub) return { mode: "enquiry" };
    if (sub.mode === "enquiry-only") return { mode: "enquiry" };

    const selectedItems = sub.items.filter((i) => selection.devItems.includes(i.id));
    if (!selectedItems.length && !addonItems.length) {
      return { mode: "range", low: 0, high: 0 };
    }
    const { low, high } = sumItemRange([...selectedItems, ...addonItems], roles, overheadPerDay);
    const floor = sub.minInvestment ?? 0;
    return {
      mode: "range",
      low: Math.round(Math.max(low, floor)),
      high: Math.round(Math.max(high, floor)),
    };
  }

  if (selection.type === "optimisation") {
    const tier = services.optimisation.tiers.find((t) => t.id === selection.optTier);
    if (!tier) return { mode: "enquiry" };
    return { mode: "single", value: tier.monthlyPrice, recurring: true };
  }

  return { mode: "enquiry" };
}

export const fmtGBP = (n: number): string =>
  "£" + Math.round(n).toLocaleString("en-GB");
