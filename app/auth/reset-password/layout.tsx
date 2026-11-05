import { ReactNode } from "react";

export const metadata = {
  title: "Reset Password | Entrecore",
  description: "Reset your Entrecore account password securely.",
  keywords: "forgot password, reset password, password recovery, entrecore platform",
  openGraph: {
    title: "Reset Password | Entrecore",
    description: "Reset your Entrecore account password securely.",
    type: "website",
  },
};

interface ResetPasswordLayoutProps {
  children: ReactNode;
}

export default function ResetPasswordLayout({ children }: ResetPasswordLayoutProps) {
  return <>{children}</>;
}
