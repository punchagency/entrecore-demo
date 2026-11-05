"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Axios } from "@/app/config/axios";
import { getProtectedRedirectRoute } from "@/lib/utils";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useOnboardingStore } from "@/app/store/onboardingStore";
import { useUserStore } from "@/app/store/userStore";
import { StepShell, FieldGroup } from "./onboarding-shell";
import { TextField, TextAreaField, ChoiceGrid } from "./onboarding-fields";
import { withoutError } from "../lib/onboarding-validation";

const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Energy",
] as const;

const OTHER_INDUSTRY = "Other";

const errorText = (error: unknown) => {
  const data = (error as { response?: { data?: { detail?: unknown; message?: unknown } } })
    ?.response?.data;
  const text = [data?.detail, data?.message].find((value) => typeof value === "string");
  return typeof text === "string" ? text.toLowerCase() : "";
};

/**
 * "You already have a company ('x'). Use PUT /company/{id} to update it."
 * Deliberately narrow: a taken *name* reports "already exists", and treating that
 * as this case would rename the user's existing company instead of flagging it.
 */
const isExistingCompanyError = (error: unknown) => {
  const text = errorText(error);
  return text.includes("already have a company") || text.includes("use put");
};

/** A different company already claims this name. */
const isNameTakenError = (error: unknown) => errorText(error).includes("already exists");

interface ExistingCompany {
  id: string;
  name?: string;
}

/**
 * Authoritative "does this user already have a company?".
 *
 * `/auth/me` exposes both `company_id` and `active_company`, and neither is
 * reliably populated — a user can own a company while both read empty, which is
 * what made this page keep attempting a create and hitting
 * "You already have a company". The companies list is the source of truth.
 */
const fetchExistingCompany = async (): Promise<ExistingCompany | undefined> => {
  try {
    const { data } = await Axios.get("/auth/company/companies");
    const companies: Array<{ id?: string; company_name?: string; is_active?: boolean; is_default?: boolean }> =
      Array.isArray(data) ? data : [];
    if (companies.length === 0) return undefined;

    const chosen =
      companies.find((item) => item.is_active) ??
      companies.find((item) => item.is_default) ??
      companies[0];

    return chosen?.id ? { id: String(chosen.id), name: chosen.company_name } : undefined;
  } catch {
    return undefined;
  }
};

export default function BasicInfoStep() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUserStore();
  const { isLoading, submitBasicInfo, submitDescription, updateCompanyInfo } = useOnboarding();
  const {
    company,
    role,
    industry_type,
    business_objective,
    setBasicInfo,
    setProductIdeas,
    setSuggestedRoles,
    setCustomDescription,
    setHasCompleted,
  } = useOnboardingStore();

  /** Guards a second run from a double click — `isLoading` only flips on re-render. */
  const isSubmittingRef = useRef(false);

  const [usesCustomIndustry, setUsesCustomIndustry] = useState(
    () => Boolean(industry_type) && !INDUSTRY_OPTIONS.includes(industry_type as never)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [existingCompany, setExistingCompany] = useState<ExistingCompany | null>(null);
  const isUpdatingExistingCompany = Boolean(existingCompany);
  const hasCheckedRef = useRef(false);

  // Decide up front whether this is a create or an update, and prefill the name
  // so a returning user sees an edit rather than a blank "create another one".
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    let cancelled = false;
    (async () => {
      const found = await fetchExistingCompany();
      if (cancelled || !found) return;
      setExistingCompany(found);
      if (found.name && !useOnboardingStore.getState().company) {
        setBasicInfo({ company: found.name });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setBasicInfo]);

  const clearError = (field: string) =>
    setErrors((previous) => withoutError(previous, field));

  const validate = () => {
    const next: Record<string, string> = {};
    if (company.trim().length < 3) next.company = "Enter at least 3 characters";
    if (industry_type.trim().length < 3) next.industry_type = "Pick an industry to continue";
    if (business_objective.trim().length < 3)
      next.business_objective = "Tell us what you're aiming for";
    return next;
  };

  const enterApp = () => {
    setHasCompleted(true);
    // `/auth/me` now reports a company_id — drop the stale cache before the redirect reads it.
    queryClient.invalidateQueries({ queryKey: ["user"] });
    // Respect the production route gate rather than hard-navigating to /coreos.
    router.replace(getProtectedRedirectRoute("/coreos", user?.is_superadmin_company));
  };

  const handleFinish = async () => {
    if (isSubmittingRef.current) return;

    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const payload = {
      company: company.trim(),
      // Role is refined later in the profile prompt; the endpoint still expects a value.
      role: role || "Founder",
      industry_type: industry_type.trim(),
      business_objective: business_objective.trim(),
    };
    const payloadKey = JSON.stringify(payload);

    const { lastSubmittedBasicInfo, setLastSubmittedBasicInfo, suggestedRoles } =
      useOnboardingStore.getState();

    // Nothing changed since the last successful submit — don't re-run the AI calls.
    if (payloadKey === lastSubmittedBasicInfo && suggestedRoles.length > 0) {
      enterApp();
      return;
    }

    isSubmittingRef.current = true;

    const fail = (message?: string, fieldError?: Record<string, string>) => {
      if (fieldError) setErrors(fieldError);
      else toast.error(message || "Couldn't save that. Please try again.");
      isSubmittingRef.current = false;
    };

    // The API allows one company per user: create the first, update thereafter.
    // Re-resolve here rather than trusting the mount-time check, which may not
    // have landed yet on a fast submit.
    const target = existingCompany ?? (await fetchExistingCompany());
    try {
      if (target) {
        await updateCompanyInfo(target.id, { company_name: payload.company }, true);
      } else {
        const ideas = await submitBasicInfo(payload, true);
        setProductIdeas(ideas);
      }
    } catch (error) {
      // A company can appear between the check and the create (another tab, a
      // retry after a timeout). Recover by updating it instead of dead-ending.
      if (!target && isExistingCompanyError(error)) {
        const recovered = await fetchExistingCompany();
        if (!recovered) {
          fail("You already have a company, but we couldn't load it. Please refresh and try again.");
          return;
        }
        try {
          await updateCompanyInfo(recovered.id, { company_name: payload.company }, true);
          setExistingCompany(recovered);
        } catch {
          fail("Couldn't update your company. Please try again.");
          return;
        }
      } else if (isNameTakenError(error)) {
        fail(undefined, { company: "That company name is already taken — try another." });
        return;
      } else {
        const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data
          ?.detail;
        fail(typeof detail === "string" ? detail : undefined);
        return;
      }
    }

    // The company is saved at this point. Generating role suggestions is a bonus,
    // so a failure here must not strand the user on the form.
    try {
      const description = `Company in the ${payload.industry_type} industry. Business objectives: ${payload.business_objective}`;
      const roles = await submitDescription({ company_name: payload.company, description }, true);
      setSuggestedRoles(roles);
      setCustomDescription(description);
    } catch (error) {
      console.error("Role suggestions unavailable:", error);
    }

    setLastSubmittedBasicInfo(payloadKey);
    enterApp();
  };

  return (
    <StepShell
      eyebrow={isUpdatingExistingCompany ? "Your company" : "Welcome to EntreCore"}
      title={isUpdatingExistingCompany ? "Update your company" : "Let's start with your company"}
      description={
        isUpdatingExistingCompany
          ? "You already have a company set up — change anything here and we'll save it."
          : "Three quick answers and you're in. You can fill in the rest of your profile from inside the app whenever you like."
      }
      onContinue={handleFinish}
      continueLabel="Finish setup"
      isBusy={isLoading}
      busyLabel="Setting things up…"
      footerNote="Your answers save automatically as you go."
    >
      <div className="space-y-8">
        <TextField
          label="Company name"
          placeholder="Northwind Labs"
          value={company}
          error={errors.company}
          autoFocus
          autoComplete="organization"
          onValueChange={(value) => {
            setBasicInfo({ company: value });
            clearError("company");
          }}
        />

        <FieldGroup>
          <ChoiceGrid
            label="Industry"
            value={usesCustomIndustry ? OTHER_INDUSTRY : industry_type}
            options={[...INDUSTRY_OPTIONS, OTHER_INDUSTRY]}
            error={usesCustomIndustry ? undefined : errors.industry_type}
            onSelect={(value) => {
              clearError("industry_type");
              if (value === OTHER_INDUSTRY) {
                setUsesCustomIndustry(true);
                setBasicInfo({ industry_type: "" });
                return;
              }
              setUsesCustomIndustry(false);
              setBasicInfo({ industry_type: value });
            }}
          />

          {usesCustomIndustry && (
            <TextField
              label="Which industry?"
              placeholder="e.g. Climate tech"
              value={industry_type}
              error={errors.industry_type}
              autoFocus
              onValueChange={(value) => {
                setBasicInfo({ industry_type: value });
                clearError("industry_type");
              }}
            />
          )}
        </FieldGroup>

        <TextAreaField
          label="What are you trying to achieve?"
          hint="A sentence or two is plenty — this shapes the roles and ideas we suggest next."
          placeholder="Reach 100 paying customers and hire our first two engineers."
          value={business_objective}
          error={errors.business_objective}
          onValueChange={(value) => {
            setBasicInfo({ business_objective: value });
            clearError("business_objective");
          }}
        />
      </div>
    </StepShell>
  );
}
