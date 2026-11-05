import { ReactNode } from "react";

export const metadata = {
  title: "Financials | Entrecore",
  description: "Manage and share company documents with ease using Entrecore's secure platform.",
  keywords: "company documents, document management, secure sharing, document storage, document sharing",
  openGraph: {
    title: "Financials | Entrecore",
    description: "Manage and share company documents with ease using Entrecore's secure platform.",
    type: "website",
  },
};

interface FinancialsLayoutProps {
  children: ReactNode;
}

export default function FinancialsLayout({ children }: FinancialsLayoutProps) {
  return <>{children}</>;
}   