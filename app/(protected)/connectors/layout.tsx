import AuthWrapper from "@/components/auth-wrapper";
import { ReactNode } from "react";

export const metadata = {
  title: "Connectors | Entrecore",
  description:
    "Connect, crawl, sync, and manage your data connectors without opening CoreOS.",
  keywords: "connectors, integrations, data sync, crawl, BigQuery, NetSuite, Airtable, Notion, Google Drive",
  openGraph: {
    title: "Connectors | Entrecore",
    description:
      "Connect, crawl, sync, and manage your data connectors without opening CoreOS.",
    type: "website",
  },
};

interface ConnectorsLayoutProps {
  children: ReactNode;
}

export default function ConnectorsLayout({ children }: ConnectorsLayoutProps) {
  return <AuthWrapper>{children}</AuthWrapper>;
}
