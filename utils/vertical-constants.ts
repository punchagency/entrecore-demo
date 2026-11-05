/**
 * Visual configuration for each of the 14 enterprise verticals.
 * Provides consistent colors, gradients, and icon names across all UI surfaces.
 */

export interface VerticalConfig {
  key: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // e.g. "blue"
  bgClass: string; // badge/chip background
  textClass: string; // badge/chip text
  borderClass: string; // badge/chip border
  dotClass: string; // small status dot
  gradientFrom: string;
  gradientTo: string;
}

export const VERTICAL_CONFIGS: Record<string, VerticalConfig> = {
  strategy: {
    key: "strategy",
    name: "Strategy",
    icon: "Target",
    color: "indigo",
    bgClass: "bg-indigo-50",
    textClass: "text-indigo-700",
    borderClass: "border-indigo-200",
    dotClass: "bg-indigo-500",
    gradientFrom: "from-indigo-500",
    gradientTo: "to-indigo-700",
  },
  finance: {
    key: "finance",
    name: "Finance",
    icon: "DollarSign",
    color: "emerald",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    dotClass: "bg-emerald-500",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-emerald-700",
  },
  operations: {
    key: "operations",
    name: "Operations",
    icon: "Cog",
    color: "amber",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
    dotClass: "bg-amber-500",
    gradientFrom: "from-amber-500",
    gradientTo: "to-amber-700",
  },
  sales: {
    key: "sales",
    name: "Sales",
    icon: "TrendingUp",
    color: "blue",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
    dotClass: "bg-blue-500",
    gradientFrom: "from-blue-500",
    gradientTo: "to-blue-700",
  },
  marketing: {
    key: "marketing",
    name: "Marketing",
    icon: "Megaphone",
    color: "pink",
    bgClass: "bg-pink-50",
    textClass: "text-pink-700",
    borderClass: "border-pink-200",
    dotClass: "bg-pink-500",
    gradientFrom: "from-pink-500",
    gradientTo: "to-pink-700",
  },
  customer: {
    key: "customer",
    name: "Customer",
    icon: "Heart",
    color: "rose",
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
    borderClass: "border-rose-200",
    dotClass: "bg-rose-500",
    gradientFrom: "from-rose-500",
    gradientTo: "to-rose-700",
  },
  people: {
    key: "people",
    name: "People",
    icon: "Users",
    color: "violet",
    bgClass: "bg-violet-50",
    textClass: "text-violet-700",
    borderClass: "border-violet-200",
    dotClass: "bg-violet-500",
    gradientFrom: "from-violet-500",
    gradientTo: "to-violet-700",
  },
  technology: {
    key: "technology",
    name: "Technology",
    icon: "Cpu",
    color: "cyan",
    bgClass: "bg-cyan-50",
    textClass: "text-cyan-700",
    borderClass: "border-cyan-200",
    dotClass: "bg-cyan-500",
    gradientFrom: "from-cyan-500",
    gradientTo: "to-cyan-700",
  },
  data: {
    key: "data",
    name: "Data",
    icon: "Database",
    color: "sky",
    bgClass: "bg-sky-50",
    textClass: "text-sky-700",
    borderClass: "border-sky-200",
    dotClass: "bg-sky-500",
    gradientFrom: "from-sky-500",
    gradientTo: "to-sky-700",
  },
  legal: {
    key: "legal",
    name: "Legal",
    icon: "Scale",
    color: "slate",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
    borderClass: "border-slate-300",
    dotClass: "bg-slate-500",
    gradientFrom: "from-slate-500",
    gradientTo: "to-slate-700",
  },
  risk: {
    key: "risk",
    name: "Risk",
    icon: "ShieldAlert",
    color: "orange",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
    dotClass: "bg-orange-500",
    gradientFrom: "from-orange-500",
    gradientTo: "to-orange-700",
  },
  procurement: {
    key: "procurement",
    name: "Procurement",
    icon: "ShoppingCart",
    color: "teal",
    bgClass: "bg-teal-50",
    textClass: "text-teal-700",
    borderClass: "border-teal-200",
    dotClass: "bg-teal-500",
    gradientFrom: "from-teal-500",
    gradientTo: "to-teal-700",
  },
  product: {
    key: "product",
    name: "Product",
    icon: "Box",
    color: "purple",
    bgClass: "bg-purple-50",
    textClass: "text-purple-700",
    borderClass: "border-purple-200",
    dotClass: "bg-purple-500",
    gradientFrom: "from-purple-500",
    gradientTo: "to-purple-700",
  },
  assets: {
    key: "assets",
    name: "Assets",
    icon: "Building2",
    color: "stone",
    bgClass: "bg-stone-100",
    textClass: "text-stone-700",
    borderClass: "border-stone-300",
    dotClass: "bg-stone-500",
    gradientFrom: "from-stone-500",
    gradientTo: "to-stone-700",
  },
};

/**
 * Get config for a vertical key, with a sensible fallback for unknown keys.
 */
export const getVerticalConfig = (key: string): VerticalConfig => {
  return (
    VERTICAL_CONFIGS[key] || {
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      icon: "Tag",
      color: "gray",
      bgClass: "bg-gray-50",
      textClass: "text-gray-700",
      borderClass: "border-gray-200",
      dotClass: "bg-gray-500",
      gradientFrom: "from-gray-500",
      gradientTo: "to-gray-700",
    }
  );
};

/**
 * All vertical keys in display order.
 */
export const VERTICAL_ORDER = [
  "strategy",
  "finance",
  "operations",
  "sales",
  "marketing",
  "customer",
  "people",
  "technology",
  "data",
  "legal",
  "risk",
  "procurement",
  "product",
  "assets",
] as const;
