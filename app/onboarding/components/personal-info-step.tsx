"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { useOnboardingStore } from "@/app/store/onboardingStore";
import { StepShell, FieldGroup } from "./onboarding-shell";
import { TextField, SelectField } from "./onboarding-fields";
import {
  normalizeLinkedInUrl,
  validatePersonalInfo,
  withoutError,
} from "../lib/onboarding-validation";

const EDUCATION_LEVELS = [
  "High School",
  "Associate Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD",
  "Other",
] as const;

export default function PersonalInfoStep() {
  const {
    personalInfo,
    setPersonalInfo,
    goToNextStep,
    goToPreviousStep,
    markStepSkipped,
    clearStepSkipped,
  } = useOnboardingStore();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autofilled, setAutofilled] = useState(false);
  const hasAttemptedLocationLookup = useRef(false);

  // Best-effort location prefill. It fills empty fields only and never moves focus.
  useEffect(() => {
    if (hasAttemptedLocationLookup.current) return;
    hasAttemptedLocationLookup.current = true;

    const { personalInfo: current } = useOnboardingStore.getState();
    if (current.user_country) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get("https://ipwho.is/", { timeout: 5000 });
        if (cancelled || !data?.success) return;

        const latest = useOnboardingStore.getState().personalInfo;
        setPersonalInfo({
          user_country: latest.user_country || data.country || "",
          user_city: latest.user_city || data.city || "",
          user_state: latest.user_state || data.region || "",
          user_zip_code: latest.user_zip_code || data.postal || "",
        });
        setAutofilled(true);
      } catch {
        // Location detection is a convenience — failing is fine.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setPersonalInfo]);

  const update = (field: keyof typeof personalInfo, value: string) => {
    setPersonalInfo({ [field]: value });
    setErrors((previous) => withoutError(previous, field));
  };

  const handleContinue = () => {
    // Normalize before validating so "acme-founder" and the full URL both pass.
    const linkedin = normalizeLinkedInUrl(personalInfo.linkedin_profile);
    if (linkedin !== personalInfo.linkedin_profile) setPersonalInfo({ linkedin_profile: linkedin });

    const fieldErrors = validatePersonalInfo({ ...personalInfo, linkedin_profile: linkedin });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    clearStepSkipped("personal-info");
    goToNextStep();
  };

  const handleSkip = () => {
    markStepSkipped("personal-info");
    goToNextStep();
  };

  return (
    <StepShell
      eyebrow="About you"
      title="Tell us where you're based"
      description="This personalizes benchmarks and recommendations. Skip it now and finish it from the last step if you'd rather move on."
      onBack={goToPreviousStep}
      onSkip={handleSkip}
      onContinue={handleContinue}
    >
      <div className="space-y-10">
        <FieldGroup title="Location">
          {autofilled && (
            <p className="flex items-center gap-1.5 text-sm text-gray-400">
              <MapPin className="size-3.5" />
              Prefilled from your connection — correct anything that&apos;s off.
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Country"
              placeholder="United States"
              autoComplete="country-name"
              value={personalInfo.user_country}
              error={errors.user_country}
              onValueChange={(value) => update("user_country", value)}
            />
            <TextField
              label="City"
              placeholder="Austin"
              autoComplete="address-level2"
              value={personalInfo.user_city}
              error={errors.user_city}
              onValueChange={(value) => update("user_city", value)}
            />
            <TextField
              label="State or region"
              placeholder="Texas"
              autoComplete="address-level1"
              value={personalInfo.user_state}
              error={errors.user_state}
              onValueChange={(value) => update("user_state", value)}
            />
            <TextField
              label="Zip or postal code"
              placeholder="78701"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={10}
              value={personalInfo.user_zip_code}
              error={errors.user_zip_code}
              onValueChange={(value) =>
                update("user_zip_code", value.replace(/[^0-9\s-]/g, "").slice(0, 10))
              }
            />
          </div>
        </FieldGroup>

        <FieldGroup title="Profile">
          <TextField
            label="LinkedIn"
            hint="Paste the full URL or just your handle — we'll tidy it up."
            placeholder="linkedin.com/in/your-handle"
            value={personalInfo.linkedin_profile}
            error={errors.linkedin_profile}
            onValueChange={(value) => update("linkedin_profile", value)}
            onBlur={() => {
              const normalized = normalizeLinkedInUrl(personalInfo.linkedin_profile);
              if (normalized !== personalInfo.linkedin_profile)
                setPersonalInfo({ linkedin_profile: normalized });
            }}
          />
        </FieldGroup>

        <FieldGroup title="Education">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="University"
              placeholder="University of Texas"
              value={personalInfo.university_name}
              error={errors.university_name}
              onValueChange={(value) => update("university_name", value)}
            />
            <SelectField
              label="Highest level completed"
              placeholder="Select a level"
              options={EDUCATION_LEVELS}
              value={personalInfo.highest_level_completed}
              error={errors.highest_level_completed}
              onValueChange={(value) => update("highest_level_completed", value)}
            />
          </div>
        </FieldGroup>
      </div>
    </StepShell>
  );
}
