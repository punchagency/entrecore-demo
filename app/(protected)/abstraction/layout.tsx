import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Document Abstraction | EntreCore",
  description:
    "OCR-driven legal document abstraction protocol. Automatically extract, standardize, validate, and store key legal entities and clauses as structured data.",
  keywords:
    "document abstraction, OCR, legal documents, entity extraction, clause classification, contract analysis",
  openGraph: {
    title: "Document Abstraction | EntreCore",
    description:
      "OCR-driven legal document abstraction protocol for automated legal entity and clause extraction.",
    type: "website",
    locale: "en_US",
  },
};

export default function AbstractionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#EFF4FF] h-full w-full min-h-screen">
      {children}
    </div>
  );
}
