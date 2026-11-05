import { ReactNode } from "react";

export const metadata = {
  title: "Market | Entrecore",
  description:
    "Explore the Entrecore market, where you can find and connect with the best data providers in the industry.",
  keywords: "market, data providers, data connections, data integration, data marketplace",
  openGraph: {
    title: "Market | Entrecore",
    description:
      "Explore the Entrecore market, where you can find and connect with the best data providers in the industry.",
    type: "website",
  },
};

interface MarketLayoutProps {
  children: ReactNode;
}

export default function MarketLayout({ children }: MarketLayoutProps) {
  return <div className="w-full p-6">{children}</div>;
}
