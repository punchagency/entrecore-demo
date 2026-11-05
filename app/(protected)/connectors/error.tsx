"use client";

import { SectionError, type SectionErrorProps } from "@/components/section-error";

export default function ConnectorsError(props: Omit<SectionErrorProps, "section">) {
  return <SectionError {...props} section="Connectors" />;
}
