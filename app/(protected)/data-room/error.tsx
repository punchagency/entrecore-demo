"use client";

import { SectionError, type SectionErrorProps } from "@/components/section-error";

export default function DataRoomError(props: Omit<SectionErrorProps, "section">) {
  return <SectionError {...props} section="Data Intelligence Hub" />;
}
