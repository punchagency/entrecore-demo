import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guides - Entrecore",
  description: "Manage guides for automated data processing and analysis",
};

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      {children}
    </div>
  );
} 