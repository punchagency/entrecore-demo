import { ReactNode } from "react";

export const metadata = {
  title: "Investor Access | Entrecore",
  description:
    "Manage investor access and permissions for your Entrecore metrics dashboard.",
  keywords: "investor access, permissions, sharing, metrics access, investor management",
  openGraph: {
    title: "Investor Access | Entrecore",
    description:
      "Manage investor access and permissions for your Entrecore metrics dashboard.",
    type: "website",
  },
};

interface MetricsLayoutProps {
  children: ReactNode;
}

export default function MetricsLayout({ children }: MetricsLayoutProps) {
  return <div className="w-full p-5">{children}</div>;
}
