import { ReactNode } from "react";

export const metadata = {
  title: "Diligence | Entrecore",
  description:
    "Access and review company information for due diligence with Entrecore's streamlined platform.",
  keywords: "due diligence, company information, Entrecore",
  openGraph: {
    title: "Diligence | Entrecore",
    description:
      "Access and review company information for due diligence with Entrecore's streamlined platform.",
    type: "website",
  },
};

interface DiligenceLayoutProps {
  children: ReactNode;
}

export default function DiligenceLayout({ children }: DiligenceLayoutProps) {
  return <div className="w-full p-5">{children}</div>;
}
