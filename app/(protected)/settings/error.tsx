"use client";

import { SectionError, type SectionErrorProps } from "@/components/section-error";

export default function SettingsError(props: Omit<SectionErrorProps, "section">) {
  return <SectionError {...props} section="Settings" />;
}
