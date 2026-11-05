import type { OnboardingStep } from "@/app/store/onboardingStore";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const BUSINESS_MODELS = ["B2B", "B2C", "B2G", "B2B2C", "C2C", "C2B"] as const;
export const WORK_STYLES = ["remote", "hybrid", "onsite"] as const;
export const BUSINESS_ENTITY_TYPES = [
  "LLC",
  "S-Corp",
  "Non-Profit",
  "Corporation",
  "Partnership",
  "Sole Proprietorship",
] as const;
export const TEAM_SIZES = ["1-5", "6-10", "11-25", "26-50", "51-100", "100+"] as const;

export const monthToNumber = (monthName: string) => MONTHS.indexOf(monthName as never) + 1;

export const teamSizeToNumber = (range: string) =>
  ({ "1": 1, "1-5": 3, "6-10": 8, "11-25": 18, "26-50": 38, "51-100": 75, "100+": 100 })[range] ?? 1;

/**
 * Accepts a bare handle, a bare domain, or a full URL and returns something the
 * `linkedin_profile` schema (valid URL containing linkedin.com) will accept.
 * Returns the input untouched when it's empty or unrecognisable, so validation —
 * not this helper — is what reports the problem.
 */
export const normalizeLinkedInUrl = (input: string): string => {
  const value = input.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;
  if (/^(www\.)?linkedin\.com\//i.test(value)) return `https://${value.replace(/^www\./i, "www.")}`;
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(value))
    return `https://www.linkedin.com/in/${value}`;

  return value;
};

/** Drops one entry from an error map, returning the same object when nothing changes. */
export const withoutError = (errors: Record<string, string>, field: string) => {
  if (!errors[field]) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
};

const isValidUrl = (value: string) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

interface PersonalInfoValues {
  user_country: string;
  user_city: string;
  user_state: string;
  user_zip_code: string;
  linkedin_profile: string;
  university_name: string;
  highest_level_completed: string;
}

export const validatePersonalInfo = (values: PersonalInfoValues): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (values.user_country.trim().length < 3) errors.user_country = "Enter your country";
  if (values.user_city.trim().length < 3) errors.user_city = "Enter your city";
  if (values.user_state.trim().length < 3) errors.user_state = "Enter your state or region";
  if (values.user_zip_code.trim().length < 5)
    errors.user_zip_code = "Enter a postal code of at least 5 characters";

  const linkedin = values.linkedin_profile.trim();
  if (!linkedin) errors.linkedin_profile = "Add your LinkedIn profile";
  else if (!isValidUrl(linkedin) || !linkedin.toLowerCase().includes("linkedin.com"))
    errors.linkedin_profile = "That doesn't look like a LinkedIn profile";

  if (values.university_name.trim().length < 3) errors.university_name = "Enter your university";
  if (values.highest_level_completed.trim().length < 3)
    errors.highest_level_completed = "Select your highest level of education";

  return errors;
};

interface CompanyDetailsValues {
  year_founded: string;
  month_founded: string;
  state_registered: string;
  business_entity_type: string;
  business_model: string;
  company_country: string;
  company_city: string;
  company_state: string;
  company_zip_code: string;
  team_size: string;
  work_style: string;
  company_bio: string;
  company_overview: string;
}

interface FounderValues {
  name: string;
  background: string;
}

export const validateCompanyDetails = (
  values: CompanyDetailsValues,
  founder: FounderValues
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const year = Number.parseInt(values.year_founded, 10);
  if (!values.year_founded.trim()) errors.year_founded = "Enter the founding year";
  else if (Number.isNaN(year) || year < 1900) errors.year_founded = "Use a year from 1900 onwards";
  else if (year > currentYear) errors.year_founded = `That's in the future — ${currentYear} at most`;

  if (!values.month_founded.trim()) errors.month_founded = "Select the founding month";
  else if (!MONTHS.includes(values.month_founded as never))
    errors.month_founded = "Select a valid month";
  else if (year === currentYear && monthToNumber(values.month_founded) > currentMonth)
    errors.month_founded = "That month hasn't happened yet";

  if (values.state_registered.trim().length < 3)
    errors.state_registered = "Enter the state of registration";
  if (values.business_entity_type.trim().length < 3)
    errors.business_entity_type = "Select an entity type";
  if (!BUSINESS_MODELS.includes(values.business_model as never))
    errors.business_model = "Select a business model";

  if (values.company_country.trim().length < 3) errors.company_country = "Enter the HQ country";
  if (values.company_city.trim().length < 3) errors.company_city = "Enter the HQ city";
  if (values.company_state.trim().length < 3) errors.company_state = "Enter the HQ state or region";
  if (values.company_zip_code.trim().length < 5)
    errors.company_zip_code = "Enter a postal code of at least 5 characters";

  if (!values.team_size.trim()) errors.team_size = "Select your team size";
  if (!WORK_STYLES.includes(values.work_style as never))
    errors.work_style = "Select how the team works";

  if (values.company_bio.trim().length < 3) errors.company_bio = "Add a short bio";
  if (values.company_overview.trim().length < 3) errors.company_overview = "Add an overview";

  if (founder.name.trim().length < 3) errors.founder_name = "Enter the founder's name";
  if (!founder.background.trim()) errors.founder_background = "Add a little background";

  return errors;
};

export interface MissingSection {
  step: OnboardingStep;
  label: string;
  fields: string[];
}

/**
 * Single source of truth for "can we submit yet?".
 *
 * The final step uses this to show exactly what's missing and where to fix it,
 * instead of letting the server reject the payload with an opaque error.
 */
export const collectMissingSections = (state: {
  company: string;
  selectedRole: string;
  personalInfo: PersonalInfoValues;
  companyDetails: CompanyDetailsValues;
  founders: FounderValues[];
}): MissingSection[] => {
  const sections: MissingSection[] = [];

  const basicFields: string[] = [];
  if (state.company.trim().length < 3) basicFields.push("Company name");
  if (basicFields.length > 0)
    sections.push({ step: "basic-info", label: "Your company", fields: basicFields });

  if (state.selectedRole.trim().length < 3)
    sections.push({ step: "role-selection", label: "Your role", fields: ["Role"] });

  const personalErrors = validatePersonalInfo({
    ...state.personalInfo,
    linkedin_profile: normalizeLinkedInUrl(state.personalInfo.linkedin_profile),
  });
  if (Object.keys(personalErrors).length > 0)
    sections.push({
      step: "personal-info",
      label: "About you",
      fields: Object.keys(personalErrors).map(personalFieldLabel),
    });

  const founder = state.founders[0] ?? { name: "", background: "" };
  const companyErrors = validateCompanyDetails(state.companyDetails, founder);
  if (Object.keys(companyErrors).length > 0)
    sections.push({
      step: "company-details",
      label: "Company details",
      fields: Object.keys(companyErrors).map(companyFieldLabel),
    });

  return sections;
};

const PERSONAL_FIELD_LABELS: Record<string, string> = {
  user_country: "Country",
  user_city: "City",
  user_state: "State",
  user_zip_code: "Postal code",
  linkedin_profile: "LinkedIn",
  university_name: "University",
  highest_level_completed: "Education level",
};

const COMPANY_FIELD_LABELS: Record<string, string> = {
  year_founded: "Year founded",
  month_founded: "Month founded",
  state_registered: "State registered",
  business_entity_type: "Entity type",
  business_model: "Business model",
  company_country: "HQ country",
  company_city: "HQ city",
  company_state: "HQ state",
  company_zip_code: "HQ postal code",
  team_size: "Team size",
  work_style: "Work style",
  company_bio: "Company bio",
  company_overview: "Company overview",
  founder_name: "Founder name",
  founder_background: "Founder background",
};

const personalFieldLabel = (field: string) => PERSONAL_FIELD_LABELS[field] ?? field;
const companyFieldLabel = (field: string) => COMPANY_FIELD_LABELS[field] ?? field;
