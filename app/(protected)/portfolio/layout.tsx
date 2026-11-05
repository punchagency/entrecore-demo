import { ReactNode } from "react";

export const metadata = {
  title: "Portfolio | Entrecore",
  description: "View and manage your  portfolio with Entrecore's comprehensive platform.",
  keywords: "portfolio, Entrecore",
  openGraph: {
    title: "Portfolio | Entrecore",
    description: "View and manage your  portfolio with Entrecore's comprehensive platform.",
    type: "website",
  },
};

interface PortfolioLayoutProps {
  children: ReactNode;
}

export default function PortfolioLayout({ children }: PortfolioLayoutProps) {
  return <div className="w-full p-5">{children}</div>;
}
