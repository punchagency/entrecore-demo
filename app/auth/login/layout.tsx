import { ReactNode } from "react";

export const metadata = {
  title: "Metrics | Entrecore",
  description: "Login to your Entrecore account to get started with our platform.",
  keywords: "login, registration, sign in, entrecore platform",
  openGraph: {
    title: "Login | Entrecore",
    description: "Login to your Entrecore account to get started with our platform.",
    type: "website",
  },
};

interface SignupLayoutProps {
  children: ReactNode;
}

export default function LoginLayout({ children }: SignupLayoutProps) {
  return <>{children}</>;
}
