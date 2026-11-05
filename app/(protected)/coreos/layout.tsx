import AuthWrapper from "@/components/auth-wrapper";
import { ReactNode } from "react";

export const metadata = {
  title: "CoreOS | Entrecore",
  description:
    "Easily view, manage, and filter all your connected apps from one streamlined dashboard in Entrecore.",
  keywords: "metrics, analytics, business metrics, KPIs, MRR, ACV, CAC, LTV, MQLs, gross profit",
  openGraph: {
    title: "CoreOS | Entrecore",
    description:
      "Easily view, manage, and filter all your connected apps from one streamlined dashboard in Entrecore.",
    type: "website",
  },
};

interface MetricsLayoutProps {
  children: ReactNode;
}

export default function MetricsLayout({ children }: MetricsLayoutProps) {
  return <AuthWrapper>{children}</AuthWrapper>;
}
