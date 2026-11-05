import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OnboardingStep =
  | "basic-info"
  | "role-selection"
  | "personal-info"
  | "company-details"
  | "profile-setup";

/** Canonical order of the flow. Everything (progress, next/back, rail) derives from this. */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  "basic-info",
  "role-selection",
  "personal-info",
  "company-details",
  "profile-setup",
];

export const STEP_META: Record<
  OnboardingStep,
  { label: string; shortLabel: string; optional: boolean }
> = {
  "basic-info": { label: "Your company", shortLabel: "Company", optional: false },
  "role-selection": { label: "Your role", shortLabel: "Role", optional: false },
  "personal-info": { label: "About you", shortLabel: "You", optional: true },
  "company-details": { label: "Company details", shortLabel: "Details", optional: true },
  "profile-setup": { label: "Finish up", shortLabel: "Finish", optional: false },
};

export const stepIndex = (step: OnboardingStep) => ONBOARDING_STEPS.indexOf(step);

interface ProductIdea {
  title: string;
  description: string;
}

interface FounderInfo {
  name: string;
  background: string;
}

interface OnboardingState {
  // Flow state
  currentStep: OnboardingStep;
  setCurrentStep: (step: OnboardingStep) => void;
  /** Steps the user has landed on — used to allow jumping back via the progress rail. */
  visitedSteps: OnboardingStep[];
  /** Steps the user explicitly skipped — surfaced in the final review panel. */
  skippedSteps: OnboardingStep[];
  markStepSkipped: (step: OnboardingStep) => void;
  clearStepSkipped: (step: OnboardingStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  /** Set once the completion request succeeds, so the flow can never submit twice. */
  hasCompleted: boolean;
  setHasCompleted: (value: boolean) => void;

  // Basic info (Step 1)
  company: string;
  role: string;
  industry_type: string;
  business_objective: string;
  setBasicInfo: (info: {
    company?: string;
    role?: string;
    industry_type?: string;
    business_objective?: string;
  }) => void;

  // AI-generated product ideas, derived from basic info
  productIdeas: ProductIdea[];
  customDescription: string;
  setProductIdeas: (ideas: ProductIdea[]) => void;
  setCustomDescription: (description: string) => void;

  // Role selection (Step 3)
  suggestedRoles: string[];
  selectedRole: string;
  setSuggestedRoles: (roles: string[]) => void;
  setSelectedRole: (role: string) => void;

  // Personal info (Step 4)
  personalInfo: {
    user_country: string;
    user_city: string;
    user_state: string;
    user_zip_code: string;
    linkedin_profile: string;
    university_name: string;
    highest_level_completed: string;
  };
  setPersonalInfo: (info: Partial<OnboardingState["personalInfo"]>) => void;

  // Company details (Step 5)
  companyDetails: {
    company_name: string;
    year_founded: string;
    month_founded: string;
    state_registered: string;
    business_entity_type: string;
    company_bio: string;
    company_overview: string;
    business_model: string;
    company_country: string;
    company_city: string;
    company_state: string;
    company_zip_code: string;
    team_size: string;
    work_style: string;
    company_linkedin: string;
    company_website: string;
    industry: string;
    founders_background: string;
  };
  setCompanyDetails: (details: Partial<OnboardingState["companyDetails"]>) => void;

  // Founders info (Step 5 continued)
  founders: FounderInfo[];
  setFounders: (founders: FounderInfo[]) => void;
  addFounder: (founder: FounderInfo) => void;
  removeFounder: (index: number) => void;
  updateFounder: (index: number, founder: FounderInfo) => void;

  // Profile setup (Step 6)
  profileImage: File | null;
  setProfileImage: (image: File | null) => void;

  // Track last successful submission
  lastSubmittedBasicInfo: string | null;
  setLastSubmittedBasicInfo: (data: string | null) => void;

  // Reset function
  resetStore: () => void;
}

const initialPersonalInfo = {
  user_country: "",
  user_city: "",
  user_state: "",
  user_zip_code: "",
  linkedin_profile: "",
  university_name: "",
  highest_level_completed: "",
};

const initialCompanyDetails = {
  company_name: "",
  year_founded: "",
  month_founded: "",
  state_registered: "",
  business_entity_type: "",
  company_bio: "",
  company_overview: "",
  business_model: "",
  company_country: "",
  company_city: "",
  company_state: "",
  company_zip_code: "",
  team_size: "",
  work_style: "",
  company_linkedin: "",
  company_website: "",
  industry: "",
  founders_background: "",
};

const initialState = {
  currentStep: "basic-info" as OnboardingStep,
  visitedSteps: ["basic-info"] as OnboardingStep[],
  skippedSteps: [] as OnboardingStep[],
  hasCompleted: false,
  company: "",
  role: "",
  industry_type: "",
  business_objective: "",
  productIdeas: [],
  customDescription: "",
  suggestedRoles: [],
  selectedRole: "",
  personalInfo: initialPersonalInfo,
  companyDetails: initialCompanyDetails,
  founders: [],
  profileImage: null,
  lastSubmittedBasicInfo: null,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step) =>
        set((state) => ({
          currentStep: step,
          visitedSteps: state.visitedSteps.includes(step)
            ? state.visitedSteps
            : [...state.visitedSteps, step],
        })),

      markStepSkipped: (step) =>
        set((state) => ({
          skippedSteps: state.skippedSteps.includes(step)
            ? state.skippedSteps
            : [...state.skippedSteps, step],
        })),

      clearStepSkipped: (step) =>
        set((state) => ({
          skippedSteps: state.skippedSteps.filter((s) => s !== step),
        })),

      goToNextStep: () => {
        const next = ONBOARDING_STEPS[stepIndex(get().currentStep) + 1];
        if (next) get().setCurrentStep(next);
      },

      goToPreviousStep: () => {
        const previous = ONBOARDING_STEPS[stepIndex(get().currentStep) - 1];
        if (previous) get().setCurrentStep(previous);
      },

      setHasCompleted: (value) => set({ hasCompleted: value }),

      setBasicInfo: (info) =>
        set((state) => {
          const companyChanged = info.company !== undefined && info.company !== state.company;
          return {
            company: info.company ?? state.company,
            role: info.role ?? state.role,
            industry_type: info.industry_type ?? state.industry_type,
            business_objective: info.business_objective ?? state.business_objective,
            // Clear downstream data if company name changes
            ...(companyChanged
              ? {
                productIdeas: [],
                suggestedRoles: [],
                lastSubmittedBasicInfo: null,
              }
              : {}),
          };
        }),

      setProductIdeas: (ideas) => set({ productIdeas: ideas }),
      setCustomDescription: (description) => set({ customDescription: description }),

      setSuggestedRoles: (roles) => set({ suggestedRoles: roles }),
      setSelectedRole: (role) => set({ selectedRole: role }),

      setPersonalInfo: (info) =>
        set((state) => ({
          personalInfo: { ...state.personalInfo, ...info },
        })),

      setCompanyDetails: (details) =>
        set((state) => ({
          companyDetails: { ...state.companyDetails, ...details },
        })),

      setFounders: (founders) => set({ founders }),
      addFounder: (founder) =>
        set((state) => ({
          founders: [...state.founders, founder],
        })),
      removeFounder: (index) =>
        set((state) => ({
          founders: state.founders.filter((_, i) => i !== index),
        })),
      updateFounder: (index, founder) =>
        set((state) => ({
          founders: state.founders.map((f, i) => (i === index ? founder : f)),
        })),

      setProfileImage: (image) => set({ profileImage: image }),

      setLastSubmittedBasicInfo: (data) => set({ lastSubmittedBasicInfo: data }),

      resetStore: () => set(initialState),
    }),
    {
      name: "entrecore-onboarding",
      storage: createJSONStorage(() => sessionStorage),
      // A File can't survive JSON, and a half-serialised one would rehydrate as a
      // truthy empty object — drop it and let the user re-pick.
      partialize: (state) => ({ ...state, profileImage: null }),
    }
  )
);

/**
 * The store rehydrates from sessionStorage on the client only, so anything that
 * renders persisted state must wait for this to avoid a hydration mismatch.
 */
export const useOnboardingHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = useOnboardingStore.persist.onFinishHydration(() => setHydrated(true));
    if (useOnboardingStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  return hydrated;
};
