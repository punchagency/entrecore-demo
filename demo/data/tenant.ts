import { ago } from "./time";

/**
 * The demo company on its first day on Entrecore: the account was just created
 * and onboarding completed, nothing else. Its profile holds only what onboarding
 * asks for (app/onboarding). Larkspur Holdings and Jordan Avery are invented.
 *
 * Defaults follow the backend for a new company (auth_service models/users.py
 * Company): no LLM provider configured, not a superadmin company.
 */

export const COMPANY_ID = "0b6f2a1e-4c1d-4b8e-9a51-7d2c9f3e1a01";
export const USER_ID = "5c8e3d72-1f4a-4e2b-8c6d-3a9b7e0f2d11";

/** When the account and company were created: this morning. */
const SIGNED_UP = { hours: 1 };

export const company = {
  id: COMPANY_ID,
  company_name: "Larkspur Holdings",
  company_bio: "Diversified holding company with operating businesses in logistics, specialty manufacturing and services.",
  company_overview: null as string | null,
  year_founded: 2011,
  month_founded: 4,
  state_registered: "Delaware",
  business_entity_type: "LLC",
  business_model_type: ["B2B"],
  team_size: 1200,
  // The vertical chosen at sign-up; the company's knowledge graph is provisioned from it.
  vertical_key: "finance",
  is_active: true,
  is_default: true,
  is_superadmin_company: false,
  profile_image: null as string | null,
  cover_image: null as string | null,
  info: null as Record<string, unknown> | null,
  team: null as Record<string, unknown> | null,
  product_information: null as Record<string, unknown> | null,
  llm_provider: null as string | null,
  llm_model: null as string | null,
  llm_configurations: [] as Array<{ llm_provider: string; llm_model?: string }>,
  created_at: ago(SIGNED_UP),
  updated_at: ago(SIGNED_UP),
};

export const user = {
  id: USER_ID,
  email: "jordan.avery@larkspur.example",
  first_name: "Jordan",
  last_name: "Avery",
  full_name: "Jordan Avery",
  username: "jordan.avery",
  company_id: COMPANY_ID,
  company_role: "admin",
  created_at: ago(SIGNED_UP),
  disabled: false,
  education: { university_name: "", highest_level_completed: "" },
  email_verified: true,
  google_id: null,
  hashed_password: null,
  last_login: ago({ minutes: 1 }),
  location: { city: "Chicago", state: "IL", country: "United States", zip_code: "60606" },
  onboarding_completed: true,
  password_reset_expires: null,
  password_reset_token: null,
  phone_number: null,
  profile_image: null,
  roles: ["admin"],
  social: { linkedin_profile: "" },
  verification_token: null,
  version: 1,
  active_company: COMPANY_ID,
  is_superadmin_company: false,
  platform_role: null,
  support_session: false,
  support_scope: null,
  support_expires_at: null,
};
