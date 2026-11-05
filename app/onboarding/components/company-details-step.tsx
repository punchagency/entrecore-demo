"use client";

import { useEffect, useState } from "react";

import { useOnboardingStore } from "@/app/store/onboardingStore";
import { StepShell, FieldGroup } from "./onboarding-shell";
import { TextField, TextAreaField, SelectField, ChoiceGrid } from "./onboarding-fields";
import {
  MONTHS,
  TEAM_SIZES,
  WORK_STYLES,
  BUSINESS_MODELS,
  BUSINESS_ENTITY_TYPES,
  validateCompanyDetails,
  withoutError,
} from "../lib/onboarding-validation";

const WORK_STYLE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export default function CompanyDetailsStep() {
  const {
    company,
    companyDetails,
    setCompanyDetails,
    founders,
    setFounders,
    customDescription,
    goToNextStep,
    goToPreviousStep,
    markStepSkipped,
    clearStepSkipped,
  } = useOnboardingStore();

  const founder = founders[0] ?? { name: "", background: "" };
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Seed the bio and overview from step 1's description so nobody starts from a blank page.
  useEffect(() => {
    if (!customDescription) return;
    const { companyDetails: current } = useOnboardingStore.getState();
    if (current.company_bio && current.company_overview) return;

    setCompanyDetails({
      company_bio: current.company_bio || customDescription,
      company_overview: current.company_overview || customDescription,
    });
  }, [customDescription, setCompanyDetails]);

  const clearError = (field: string) =>
    setErrors((previous) => withoutError(previous, field));

  const update = (field: keyof typeof companyDetails, value: string) => {
    setCompanyDetails({ [field]: value });
    clearError(field);
  };

  const updateFounderField = (field: "name" | "background", value: string) => {
    setFounders([{ ...founder, [field]: value }]);
    clearError(`founder_${field}`);
  };

  const handleContinue = () => {
    const fieldErrors = validateCompanyDetails(companyDetails, founder);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    clearStepSkipped("company-details");
    goToNextStep();
  };

  const handleSkip = () => {
    markStepSkipped("company-details");
    goToNextStep();
  };

  return (
    <StepShell
      eyebrow="Company details"
      title={company ? `A bit more about ${company}` : "A bit more about your company"}
      description="The last stretch of setup. Anything you leave out can be finished from the next step."
      onBack={goToPreviousStep}
      onSkip={handleSkip}
      onContinue={handleContinue}
    >
      <div className="space-y-10">
        <FieldGroup title="Founding">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Year founded"
              placeholder="2023"
              inputMode="numeric"
              maxLength={4}
              value={companyDetails.year_founded}
              error={errors.year_founded}
              onValueChange={(value) =>
                update("year_founded", value.replace(/[^0-9]/g, "").slice(0, 4))
              }
            />
            <SelectField
              label="Month founded"
              placeholder="Select a month"
              options={MONTHS}
              value={companyDetails.month_founded}
              error={errors.month_founded}
              onValueChange={(value) => update("month_founded", value)}
            />
            <TextField
              label="State registered"
              placeholder="Delaware"
              value={companyDetails.state_registered}
              error={errors.state_registered}
              onValueChange={(value) => update("state_registered", value)}
            />
            <SelectField
              label="Entity type"
              placeholder="Select a type"
              options={BUSINESS_ENTITY_TYPES}
              value={companyDetails.business_entity_type}
              error={errors.business_entity_type}
              onValueChange={(value) => update("business_entity_type", value)}
            />
          </div>
        </FieldGroup>

        <FieldGroup title="What you do">
          <ChoiceGrid
            label="Business model"
            value={companyDetails.business_model}
            options={BUSINESS_MODELS}
            error={errors.business_model}
            onSelect={(value) => update("business_model", value)}
          />
          <TextAreaField
            label="Company bio"
            hint="One or two lines — this shows up across your workspace."
            placeholder="Operations intelligence for small teams."
            value={companyDetails.company_bio}
            error={errors.company_bio}
            onValueChange={(value) => update("company_bio", value)}
            className="min-h-[5rem]"
          />
          <TextAreaField
            label="Company overview"
            hint="The longer version: what you build, who it's for, and why."
            placeholder="We help small operations teams replace spreadsheets with a single AI copilot…"
            value={companyDetails.company_overview}
            error={errors.company_overview}
            onValueChange={(value) => update("company_overview", value)}
          />
        </FieldGroup>

        <FieldGroup title="Headquarters">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Country"
              placeholder="United States"
              value={companyDetails.company_country}
              error={errors.company_country}
              onValueChange={(value) => update("company_country", value)}
            />
            <TextField
              label="City"
              placeholder="Austin"
              value={companyDetails.company_city}
              error={errors.company_city}
              onValueChange={(value) => update("company_city", value)}
            />
            <TextField
              label="State or region"
              placeholder="Texas"
              value={companyDetails.company_state}
              error={errors.company_state}
              onValueChange={(value) => update("company_state", value)}
            />
            <TextField
              label="Zip or postal code"
              placeholder="78701"
              inputMode="numeric"
              maxLength={10}
              value={companyDetails.company_zip_code}
              error={errors.company_zip_code}
              onValueChange={(value) =>
                update("company_zip_code", value.replace(/[^0-9\s-]/g, "").slice(0, 10))
              }
            />
          </div>
        </FieldGroup>

        <FieldGroup title="Team">
          <ChoiceGrid
            label="Team size"
            value={companyDetails.team_size}
            options={TEAM_SIZES}
            error={errors.team_size}
            onSelect={(value) => update("team_size", value)}
          />
          <ChoiceGrid
            label="How the team works"
            value={companyDetails.work_style}
            options={WORK_STYLES}
            error={errors.work_style}
            formatOption={(option) => WORK_STYLE_LABELS[option] ?? option}
            onSelect={(value) => update("work_style", value)}
          />
        </FieldGroup>

        <FieldGroup title="Founder">
          <TextField
            label="Founder's name"
            placeholder="Ada Lovelace"
            value={founder.name}
            error={errors.founder_name}
            onValueChange={(value) => updateFounderField("name", value)}
          />
          <TextAreaField
            label="Founder's background"
            hint="Experience, prior companies, why this problem."
            placeholder="Ten years building operations tooling at logistics and fintech startups."
            value={founder.background}
            error={errors.founder_background}
            onValueChange={(value) => updateFounderField("background", value)}
          />
        </FieldGroup>
      </div>
    </StepShell>
  );
}
