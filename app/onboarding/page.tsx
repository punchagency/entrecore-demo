"use client";

import { useEffect } from "react";

import BasicInfoStep from "./components/basic-info-step";
import { DemoDataButton } from "./components/demo-data-button";
import { useOnboardingStore, useOnboardingHydrated } from "@/app/store/onboardingStore";

/*
 * Onboarding is a single page: name the company, pick an industry, state the goal.
 * Everything else (location, LinkedIn, education, founding details, team, founders)
 * is collected later by <ProfileCompletionPrompt> inside the app, so signup stays short.
 *
 * The remaining steps are kept on disk and wired back up by uncommenting the
 * imports and branches below, plus restoring the step rail in layout.tsx.
 *
 * import RoleSelectionStep from "./components/role-selection-step";
 * import PersonalInfoStep from "./components/personal-info-step";
 * import CompanyDetailsStep from "./components/company-details-step";
 * import ProfileSetupStep from "./components/profile-setup-step";
 */

export default function OnboardingPage() {
  const hydrated = useOnboardingHydrated();
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const resetStore = useOnboardingStore((state) => state.resetStore);

  useEffect(() => {
    document.title = "Build Your Core | EntreCore";
  }, []);

  // A finished run leaves its data in sessionStorage; landing here again means a new run.
  useEffect(() => {
    if (hydrated && useOnboardingStore.getState().hasCompleted) resetStore();
  }, [hydrated, resetStore]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-2xl animate-pulse px-6 pt-28 sm:px-8">
        <div className="h-3 w-24 rounded bg-gray-100" />
        <div className="mt-4 h-10 w-3/4 rounded bg-gray-100" />
        <div className="mt-3 h-5 w-1/2 rounded bg-gray-100" />
        <div className="mt-10 space-y-6">
          <div className="h-12 rounded-xl bg-gray-100" />
          <div className="h-12 rounded-xl bg-gray-100" />
          <div className="h-12 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <DemoDataButton />

      {/*
        Keyed on the step so each one mounts fresh and plays its own entrance.
        An AnimatePresence cross-fade was tried here and could strand the outgoing
        step on screen, leaving the flow visually frozen mid-navigation.
      */}
      <div key={currentStep}>
        <BasicInfoStep />
        {/*
        {currentStep === "role-selection" && <RoleSelectionStep />}
        {currentStep === "personal-info" && <PersonalInfoStep />}
        {currentStep === "company-details" && <CompanyDetailsStep />}
        {currentStep === "profile-setup" && <ProfileSetupStep />}
        */}
      </div>
    </div>
  );
}
