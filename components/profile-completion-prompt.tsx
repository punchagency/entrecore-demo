"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";

import { Axios } from "@/app/config/axios";
import { useMe } from "@/hooks/use-me";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/app/onboarding/components/onboarding-shell";
import {
  TextField,
  TextAreaField,
  SelectField,
  ChoiceGrid,
} from "@/app/onboarding/components/onboarding-fields";
import {
  MONTHS,
  TEAM_SIZES,
  WORK_STYLES,
  BUSINESS_MODELS,
  BUSINESS_ENTITY_TYPES,
  normalizeLinkedInUrl,
  validatePersonalInfo,
  withoutError,
} from "@/app/onboarding/lib/onboarding-validation";

const DISMISS_KEY = "profileCompletionDismissed";

const EDUCATION_LEVELS = [
  "High School",
  "Associate Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD",
  "Other",
] as const;

const WORK_STYLE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const emptyPersonal = {
  user_country: "",
  user_city: "",
  user_state: "",
  user_zip_code: "",
  linkedin_profile: "",
  university_name: "",
  highest_level_completed: "",
};

const emptyCompany = {
  year_founded: "",
  month_founded: "",
  state_registered: "",
  business_entity_type: "",
  business_model: "",
  company_bio: "",
  company_country: "",
  company_city: "",
  company_state: "",
  company_zip_code: "",
  team_size: "",
  work_style: "",
  founders_background: "",
};

type CompanyValues = typeof emptyCompany;

const validateCompany = (values: CompanyValues): Record<string, string> => {
  const errors: Record<string, string> = {};
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const year = Number.parseInt(values.year_founded, 10);

  if (!values.year_founded.trim()) errors.year_founded = "Enter the founding year";
  else if (Number.isNaN(year) || year < 1900) errors.year_founded = "Use a year from 1900 onwards";
  else if (year > currentYear) errors.year_founded = `That's in the future — ${currentYear} at most`;

  if (!values.month_founded.trim()) errors.month_founded = "Select the founding month";
  else if (year === currentYear && MONTHS.indexOf(values.month_founded as never) + 1 > currentMonth)
    errors.month_founded = "That month hasn't happened yet";

  if (values.state_registered.trim().length < 2)
    errors.state_registered = "Enter the state of registration";
  if (!values.business_entity_type) errors.business_entity_type = "Select an entity type";
  if (!values.business_model) errors.business_model = "Select a business model";
  if (values.company_bio.trim().length < 3) errors.company_bio = "Add a short description";

  if (values.company_country.trim().length < 2) errors.company_country = "Enter the HQ country";
  if (values.company_city.trim().length < 2) errors.company_city = "Enter the HQ city";
  if (values.company_state.trim().length < 2) errors.company_state = "Enter the HQ state or region";
  if (values.company_zip_code.trim().length < 4)
    errors.company_zip_code = "Enter a postal code";

  if (!values.team_size) errors.team_size = "Select your team size";
  if (!values.work_style) errors.work_style = "Select how the team works";
  if (values.founders_background.trim().length < 3)
    errors.founders_background = "Add a little background";

  return errors;
};

interface CompanyRecord {
  id: string;
  company_name?: string;
  info?: Record<string, unknown>;
  company_type?: { industry_vertical?: string; business_model_type?: string[] };
  location?: { country?: string; city?: string; state?: string; zip_code?: string | number };
  team?: { size?: number; work_style?: string; founders_background?: string };
}

/**
 * Signup only creates the company, so the rest of the profile is collected here.
 *
 * This deliberately does NOT call `/auth/onboarding/complete`: that endpoint
 * rejects anyone who already has a company ("You already have a company ('x').
 * Use PUT /company/{id} to update it."), which is everyone by this point. It
 * uses the same two update endpoints the settings pages use instead.
 */
export function ProfileCompletionPrompt() {
  const { data: user } = useMe();
  const queryClient = useQueryClient();

  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "true"
  );

  const [personal, setPersonal] = useState(emptyPersonal);
  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isSavingRef = useRef(false);

  const loadCompany = useCallback(async () => {
    try {
      const { data } = await Axios.get("/auth/company/companies");
      const list: CompanyRecord[] = Array.isArray(data) ? data : [];
      const chosen =
        list.find((item) => (item as { is_active?: boolean }).is_active) ??
        list.find((item) => (item as { is_default?: boolean }).is_default) ??
        list[0];
      if (chosen?.id) setCompany(chosen);
    } catch {
      // Without the company we simply don't show the prompt.
    }
  }, []);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  // Seed both forms from whatever is already on record so this reads as an edit.
  useEffect(() => {
    if (user) {
      setPersonal((previous) => ({
        ...previous,
        user_country: previous.user_country || user.location?.country || "",
        user_city: previous.user_city || user.location?.city || "",
        user_state: previous.user_state || user.location?.state || "",
        user_zip_code: previous.user_zip_code || user.location?.zip_code || "",
        linkedin_profile: previous.linkedin_profile || user.social?.linkedin_profile || "",
        university_name: previous.university_name || user.education?.university_name || "",
        highest_level_completed:
          previous.highest_level_completed || user.education?.highest_level_completed || "",
      }));
    }

    if (company) {
      const info = (company.info ?? {}) as Record<string, string | number | null>;
      setCompanyForm((previous) => ({
        ...previous,
        year_founded: previous.year_founded || (info.year_founded?.toString() ?? ""),
        month_founded:
          previous.month_founded ||
          (info.month_founded ? MONTHS[Number(info.month_founded) - 1] || "" : ""),
        state_registered: previous.state_registered || (info.state_registered?.toString() ?? ""),
        business_entity_type:
          previous.business_entity_type || (info.business_entity_type?.toString() ?? ""),
        business_model:
          previous.business_model || company.company_type?.business_model_type?.[0] || "",
        company_bio: previous.company_bio || (info.company_bio?.toString() ?? ""),
        company_country: previous.company_country || company.location?.country || "",
        company_city: previous.company_city || company.location?.city || "",
        company_state: previous.company_state || company.location?.state || "",
        company_zip_code:
          previous.company_zip_code ||
          (company.location?.zip_code ? String(company.location.zip_code) : ""),
        work_style: previous.work_style || company.team?.work_style || "",
        founders_background: previous.founders_background || company.team?.founders_background || "",
      }));
    }
  }, [user, company]);

  if (!user || !company) return null;

  // `onboarding_completed` is only ever set by /auth/onboarding/complete, which we
  // can't call — so derive "done" from the data actually being on record instead.
  const profileIsComplete =
    Boolean(user.location?.country) &&
    Boolean(user.education?.university_name) &&
    Boolean(user.social?.linkedin_profile) &&
    Boolean((company.info as { year_founded?: unknown } | undefined)?.year_founded);

  if (profileIsComplete) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  const updatePersonal = (field: keyof typeof personal, value: string) => {
    setPersonal((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => withoutError(previous, field));
  };

  const updateCompanyForm = (field: keyof CompanyValues, value: string) => {
    setCompanyForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => withoutError(previous, field));
  };

  const handleSubmit = async () => {
    if (isSavingRef.current) return;

    const linkedin = normalizeLinkedInUrl(personal.linkedin_profile);
    if (linkedin !== personal.linkedin_profile)
      setPersonal((previous) => ({ ...previous, linkedin_profile: linkedin }));

    const fieldErrors = {
      ...validatePersonalInfo({ ...personal, linkedin_profile: linkedin }),
      ...validateCompany(companyForm),
    };
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      // Same payload shape as settings/my-profile.
      await Axios.put("/auth/me", {
        location: {
          country: personal.user_country.trim(),
          city: personal.user_city.trim(),
          state: personal.user_state.trim(),
          zip_code: personal.user_zip_code.trim(),
        },
        social: { linkedin_profile: linkedin },
        education: {
          university_name: personal.university_name.trim(),
          highest_level_completed: personal.highest_level_completed,
        },
      });

      // Same payload shape as companyProfileStore.saveCompanyProfile.
      await Axios.put(`/auth/onboarding/company?company_id=${company.id}`, {
        companyName: company.company_name || "",
        yearFounded: companyForm.year_founded,
        monthFounded: String(MONTHS.indexOf(companyForm.month_founded as never) + 1),
        stateRegistered: companyForm.state_registered.trim(),
        businessEntityType: companyForm.business_entity_type,
        companyBioAndOverview: companyForm.company_bio.trim(),
        businessModelType: [companyForm.business_model],
        industryVertical: company.company_type?.industry_vertical || "Technology",
        country: companyForm.company_country.trim(),
        city: companyForm.company_city.trim(),
        state: companyForm.company_state.trim(),
        zip_code: companyForm.company_zip_code.trim(),
        team_size: Number.parseInt(companyForm.team_size.replace("+", ""), 10) || 1,
        work_style: companyForm.work_style.toLowerCase(),
        founders_background: companyForm.founders_background.trim(),
      });

      await queryClient.invalidateQueries({ queryKey: ["user"] });
      await loadCompany();
      localStorage.removeItem(DISMISS_KEY);
      toast.success("Profile saved");
      setIsOpen(false);
    } catch (error) {
      console.error("Profile completion error:", error);
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      toast.error(typeof detail === "string" ? detail : "Couldn't save your profile. Try again.");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <>
      {!dismissed && (
        <div className="mx-auto mb-4 flex w-full max-w-[1400px] items-center gap-3 rounded-xl border border-blue-200/70 bg-blue-50/60 px-4 py-3">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">Finish setting up your profile</p>
            <p className="truncate text-sm text-gray-500">
              A few details about you and {company.company_name || "your company"} unlock benchmarks
              and tailored recommendations.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsOpen(true)}
            className="h-8 shrink-0 rounded-full px-4 text-xs font-semibold"
          >
            Complete profile
          </Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete your profile</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!isSaving) handleSubmit();
            }}
            className="space-y-10 pt-2"
          >
            <FieldGroup title="About you">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Country"
                  placeholder="United States"
                  value={personal.user_country}
                  error={errors.user_country}
                  onValueChange={(value) => updatePersonal("user_country", value)}
                />
                <TextField
                  label="City"
                  placeholder="Austin"
                  value={personal.user_city}
                  error={errors.user_city}
                  onValueChange={(value) => updatePersonal("user_city", value)}
                />
                <TextField
                  label="State or region"
                  placeholder="Texas"
                  value={personal.user_state}
                  error={errors.user_state}
                  onValueChange={(value) => updatePersonal("user_state", value)}
                />
                <TextField
                  label="Zip or postal code"
                  placeholder="78701"
                  inputMode="numeric"
                  maxLength={10}
                  value={personal.user_zip_code}
                  error={errors.user_zip_code}
                  onValueChange={(value) =>
                    updatePersonal("user_zip_code", value.replace(/[^0-9\s-]/g, "").slice(0, 10))
                  }
                />
              </div>
              <TextField
                label="LinkedIn"
                hint="Paste the full URL or just your handle — we'll tidy it up."
                placeholder="linkedin.com/in/your-handle"
                value={personal.linkedin_profile}
                error={errors.linkedin_profile}
                onValueChange={(value) => updatePersonal("linkedin_profile", value)}
                onBlur={() =>
                  setPersonal((previous) => ({
                    ...previous,
                    linkedin_profile: normalizeLinkedInUrl(previous.linkedin_profile),
                  }))
                }
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="University"
                  placeholder="University of Texas"
                  value={personal.university_name}
                  error={errors.university_name}
                  onValueChange={(value) => updatePersonal("university_name", value)}
                />
                <SelectField
                  label="Highest level completed"
                  placeholder="Select a level"
                  options={EDUCATION_LEVELS}
                  value={personal.highest_level_completed}
                  error={errors.highest_level_completed}
                  onValueChange={(value) => updatePersonal("highest_level_completed", value)}
                />
              </div>
            </FieldGroup>

            <FieldGroup title="Founding">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Year founded"
                  placeholder="2023"
                  inputMode="numeric"
                  maxLength={4}
                  value={companyForm.year_founded}
                  error={errors.year_founded}
                  onValueChange={(value) =>
                    updateCompanyForm("year_founded", value.replace(/[^0-9]/g, "").slice(0, 4))
                  }
                />
                <SelectField
                  label="Month founded"
                  placeholder="Select a month"
                  options={MONTHS}
                  value={companyForm.month_founded}
                  error={errors.month_founded}
                  onValueChange={(value) => updateCompanyForm("month_founded", value)}
                />
                <TextField
                  label="State registered"
                  placeholder="Delaware"
                  value={companyForm.state_registered}
                  error={errors.state_registered}
                  onValueChange={(value) => updateCompanyForm("state_registered", value)}
                />
                <SelectField
                  label="Entity type"
                  placeholder="Select a type"
                  options={BUSINESS_ENTITY_TYPES}
                  value={companyForm.business_entity_type}
                  error={errors.business_entity_type}
                  onValueChange={(value) => updateCompanyForm("business_entity_type", value)}
                />
              </div>
            </FieldGroup>

            <FieldGroup title="What you do">
              <ChoiceGrid
                label="Business model"
                value={companyForm.business_model}
                options={BUSINESS_MODELS}
                error={errors.business_model}
                onSelect={(value) => updateCompanyForm("business_model", value)}
              />
              <TextAreaField
                label="Company bio"
                hint="What you build, who it's for, and why."
                placeholder="We help small operations teams replace spreadsheets with a single AI copilot…"
                value={companyForm.company_bio}
                error={errors.company_bio}
                onValueChange={(value) => updateCompanyForm("company_bio", value)}
              />
            </FieldGroup>

            <FieldGroup title="Headquarters">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Country"
                  placeholder="United States"
                  value={companyForm.company_country}
                  error={errors.company_country}
                  onValueChange={(value) => updateCompanyForm("company_country", value)}
                />
                <TextField
                  label="City"
                  placeholder="Austin"
                  value={companyForm.company_city}
                  error={errors.company_city}
                  onValueChange={(value) => updateCompanyForm("company_city", value)}
                />
                <TextField
                  label="State or region"
                  placeholder="Texas"
                  value={companyForm.company_state}
                  error={errors.company_state}
                  onValueChange={(value) => updateCompanyForm("company_state", value)}
                />
                <TextField
                  label="Zip or postal code"
                  placeholder="78701"
                  inputMode="numeric"
                  maxLength={10}
                  value={companyForm.company_zip_code}
                  error={errors.company_zip_code}
                  onValueChange={(value) =>
                    updateCompanyForm(
                      "company_zip_code",
                      value.replace(/[^0-9\s-]/g, "").slice(0, 10)
                    )
                  }
                />
              </div>
            </FieldGroup>

            <FieldGroup title="Team">
              <ChoiceGrid
                label="Team size"
                value={companyForm.team_size}
                options={TEAM_SIZES}
                error={errors.team_size}
                onSelect={(value) => updateCompanyForm("team_size", value)}
              />
              <ChoiceGrid
                label="How the team works"
                value={companyForm.work_style}
                options={WORK_STYLES}
                error={errors.work_style}
                formatOption={(option) => WORK_STYLE_LABELS[option] ?? option}
                onSelect={(value) => updateCompanyForm("work_style", value)}
              />
              <TextAreaField
                label="Founders' background"
                hint="Experience, prior companies, why this problem."
                placeholder="Ten years building operations tooling at logistics and fintech startups."
                value={companyForm.founders_background}
                error={errors.founders_background}
                onValueChange={(value) => updateCompanyForm("founders_background", value)}
              />
            </FieldGroup>

            <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                className="h-10 px-4 text-gray-500"
              >
                Later
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 min-w-[8rem] rounded-full px-6 text-sm font-semibold"
              >
                {isSaving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
