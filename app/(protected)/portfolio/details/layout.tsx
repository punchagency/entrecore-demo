import { ReactNode } from "react";

export const metadata = {
  title: "Portfolio Details | Entrecore",
  description: "View and manage your  portfolio with Entrecore's comprehensive platform.",
  keywords: "portfolio, Entrecore",
  openGraph: {
    title: "Portfolio Details | Entrecore",
    description: "View and manage your  portfolio with Entrecore's comprehensive platform.",
    type: "website",
  },
};

interface PortfolioDetailsLayoutProps {
  children: ReactNode;
}

export default function PortfolioLayout({ children }: PortfolioDetailsLayoutProps) {
  return <div className="w-full">{children}</div>;
}
