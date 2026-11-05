import { ReactNode } from "react";

export const metadata = {
  title: "AuthSuccess | Entrecore",
  description: "Successfully logged in to your Entrecore account.",
  keywords: "success, login, entrecore platform",
  openGraph: {
    title: "Auth Success | Entrecore",
    description: "Successfully logged in to your Entrecore account.",
    type: "website",
  },
};

interface SuccessLayoutProps {
  children: ReactNode;
}

export default function SuccessLayout({ children }: SuccessLayoutProps) {
  return <>{children}</>;
}
