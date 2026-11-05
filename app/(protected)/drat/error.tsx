"use client";

import { SectionError, type SectionErrorProps } from "@/components/section-error";

export default function DratError(props: Omit<SectionErrorProps, "section">) {
  return <SectionError {...props} section="DRAT" />;
}
