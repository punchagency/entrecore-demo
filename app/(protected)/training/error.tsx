"use client";

import { SectionError, type SectionErrorProps } from "@/components/section-error";

export default function TrainingError(props: Omit<SectionErrorProps, "section">) {
  return <SectionError {...props} section="Training" />;
}
