"use client";

import Image from "next/image";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

/*
 * Onboarding is a single page, so there is no step rail or progress bar here.
 * If the multi-step flow is restored (see the commented branches in page.tsx),
 * the rail lived in this header and derived everything from ONBOARDING_STEPS /
 * STEP_META / stepIndex in app/store/onboardingStore.ts.
 */
export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="relative min-h-dvh w-full bg-white">
      {/* Ambient background — kept behind everything and non-interactive. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[15%] size-[45vw] rounded-full bg-primary/5 blur-[140px]" />
        <div className="absolute -right-[12%] top-[25%] size-[40vw] rounded-full bg-violet-200/25 blur-[150px]" />
        <div className="absolute bottom-[-15%] left-[20%] size-[35vw] rounded-full bg-cyan-100/30 blur-[130px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-6 sm:px-8">
          <Image
            src="/svgs/logo.svg"
            alt="EntreCore"
            width={130}
            height={22}
            priority
            className="shrink-0"
          />
        </div>
      </header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}
