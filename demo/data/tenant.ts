import { ago } from "./time";

/**
 * The demo tenant. Larkspur Holdings is invented: a multi-entity holding
 * company with finance, operations and legal data. No real customer data is
 * used anywhere in the demo.
 */

export const COMPANY_ID = "0b6f2a1e-4c1d-4b8e-9a51-7d2c9f3e1a01";
export const USER_ID = "5c8e3d72-1f4a-4e2b-8c6d-3a9b7e0f2d11";

export const company = {
  id: COMPANY_ID,
  company_name: "Larkspur Holdings",
  company_bio: "Diversified holding company with operating businesses in logistics, specialty manufacturing and services.",
  company_overview:
    "Larkspur Holdings owns and operates six businesses across North America. Entrecore unifies their finance, operations and legal data into governed data products.",
  year_founded: 2011,
  month_founded: 4,
  state_registered: "Delaware",
  business_entity_type: "LLC",
  is_active: true,
  is_default: true,
  profile_image: null,
  cover_image: null,
  info: { industry: "Diversified Holdings", employees: "1,200", headquarters: "Chicago, IL" },
  // As-is: the current UI only knows hosted providers. The ideal version adds the
  // private model fleet as a provider (docs/demo/IA.md).
  llm_provider: "azure",
  llm_configurations: [{ llm_provider: "azure", llm_model: "gpt-4o" }],
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
  created_at: ago({ days: 210 }),
  disabled: false,
  education: { university_name: "", highest_level_completed: "" },
  email_verified: true,
  google_id: null,
  hashed_password: null,
  last_login: ago({ minutes: 2 }),
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
  // Superadmin-company users see every module (see components/route-guard.tsx).
  is_superadmin_company: true,
  platform_role: null,
  support_session: false,
  support_scope: null,
  support_expires_at: null,
};
