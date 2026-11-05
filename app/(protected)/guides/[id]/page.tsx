"use client";

import { notFound } from "next/navigation";
import { GuideDetailPage } from "./components/guide-detail-page";
import { useParams } from "next/navigation";

// interface GuideDetailProps {
//   params: {
//     id: string;
//   };
// }

export default function GuideDetail() {
  const params = useParams();

  const id = params?.id as string;

  if (!id) {
    notFound();
  }

  return <GuideDetailPage guideId={id} />;
}
