"use client";

import { SectionError, type SectionErrorProps } from "@/components/section-error";

// Fallback for protected sections without their own error.tsx, and for errors thrown by a
// section's layout.tsx (a segment's error.tsx can't catch its own layout). It renders inside
// the protected layout, so the sidebar stays usable.
export default function ProtectedError(props: Omit<SectionErrorProps, "section">) {
  return <SectionError {...props} section="This section" />;
}
