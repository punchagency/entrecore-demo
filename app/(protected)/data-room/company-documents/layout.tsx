import { ReactNode } from "react";

export const metadata = {
  title: "Company Documents | Entrecore",
  description: "Manage and share company documents with ease using Entrecore's secure platform.",
  keywords: "company documents, document management, secure sharing, document storage, document sharing",
  openGraph: {
    title: "Company Documents | Entrecore",
    description: "Manage and share company documents with ease using Entrecore's secure platform.",
    type: "website",
  },
};

interface CompanyDocumentsLayoutProps {
  children: ReactNode;
}

export default function CompanyDocumentsLayout({ children }: CompanyDocumentsLayoutProps) {
  return <>{children}</>;
}   