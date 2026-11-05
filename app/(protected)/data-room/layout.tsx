import { DataRoomHeader } from "./data-room-header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Room | EntreCore",
  description:
    "Secure document repository for company information, financial records, legal documents, and intellectual property.",
  keywords:
    "data room, document management, company documents, financial records, legal documents, intellectual property",
  openGraph: {
    title: "Data Room | EntreCore",
    description:
      "Secure document repository for company information, financial records, legal documents, and intellectual property.",
    type: "website",
    locale: "en_US",
  },
};

const dataRoomTitles: { [key: string]: string } = {
  "/data-room": "Data Room",
  "/data-room/company-documents": "Company Documents",
  "/data-room/financials": "Financials",
  "/data-room/previous-funding": "Previous Funding",
  "/data-room/staff": "Staff",
  "/data-room/others": "Others",
  "/data-room/intellectual-property": "Intellectual Property",
  "/data-room/legal": "Legal",
  "/data-room/knowledge-graph": "Knowledge Graph",
  "/data-room/catalog": "Catalog",
  "/data-room/data-products": "Data Products",
  "/data-room/guides": "Guides",
  "/data-room/integrations": "Data Integrations",
  "/data-room/workflows": "Data Room Workflows",
  "/data-room/workflows/builder": "Workflow Builder",
};

export async function generateStaticParams() {
  return Object.keys(dataRoomTitles).map((path) => ({
    path: path.replace("/data-room/", ""),
  }));
}

export default function DataRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataRoomHeader dataRoomTitles={dataRoomTitles}>
      {children}
    </DataRoomHeader>
  );
}
