"use client";

import { SectionError, type SectionErrorProps } from "@/components/section-error";

export default function AbstractionError(props: Omit<SectionErrorProps, "section">) {
  return <SectionError {...props} section="Abstraction" />;
}
