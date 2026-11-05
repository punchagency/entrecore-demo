import AuthWrapper from "@/components/auth-wrapper";
import { ReactNode } from "react";

export const metadata = {
  title: "Metrics | Entrecore",
  description:
    "View and analyze your business metrics and analytics with Entrecore's comprehensive dashboard.",
  keywords: "metrics, analytics, business metrics, KPIs, MRR, ACV, CAC, LTV, MQLs, gross profit",
  openGraph: {
    title: "Metrics | Entrecore",
    description:
      "View and analyze your business metrics and analytics with Entrecore's comprehensive dashboard.",
    type: "website",
  },
};

interface MetricsLayoutProps {
  children: ReactNode;
}

export default function MetricsLayout({ children }: MetricsLayoutProps) {
  return <div className="w-full p-5">
    <AuthWrapper>
      {children}
    </AuthWrapper>
    </div>;
}
