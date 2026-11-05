"use client";
import { usePathname } from "next/navigation";
import { SettingsNav } from "@/components/settings-nav";

const SettingsLayout = ({ children }: { children: React.ReactNode }) => {

  const pathname = usePathname() ?? "";

  return (
    <>
      {!pathname.includes("/settings/company-profile") && <SettingsNav />}
      {children}
    </>
  );
};

export default SettingsLayout;  
