import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Integrations | EntreCore",
  description: "Orchestrate, map, and schedule data pipelines.",
};

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-[#EFF4FF] flex flex-col">
      {children}
    </div>
  );
}
