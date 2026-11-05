import { z } from "zod";

export const locationSchema = z.object({
  country: z.string().min(3, "Country is required"),
  city: z.string().min(3, "City is required"),
  state: z.string().min(3, "State is required"),
  zip_code: z.string().min(5, "Zip code is required"),
});

export const socialSchema = z.object({
  linkedin_profile: z
    .string()
    .min(3, "LinkedIn profile URL is required")
    .url("Please enter a valid LinkedIn URL")
    .refine((url) => url.includes("linkedin.com"), "Please enter a valid LinkedIn URL"),
});

export const educationSchema = z.object({
  university_name: z.string().min(3, "University name is required"),
  highest_level_completed: z.string().min(3, "Education level is required"),
});

export const personalInfoSchema = z.object({
  location: locationSchema,
  social: socialSchema,
  education: educationSchema,
});

export const companyInfoSchema = z
  .object({
    year_founded: z
      .string()
      .min(4, "Valid year is required")
      .refine((year) => {
        const yearNum = parseInt(year);
        const currentYear = new Date().getFullYear();
        return yearNum >= 1900 && yearNum <= currentYear;
      }, (year) => {
        const yearNum = parseInt(year);
        if (yearNum < 1900) return { message: "Company founding year must be 1900 or later" };
        return { message: `Year founded cannot be in the future (current year is ${new Date().getFullYear()})` };
      }),
    month_founded: z
      .string()
      .min(1, "Month founded is required")
      .refine((monthName) => {
        const monthNames = [
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
        ];
        return monthNames.includes(monthName);
      }, "Invalid month name"),
    state_registered: z.string().min(3, "State registered is required"),
    business_entity_type: z.string().min(3, "Business entity type is required"),
    company_bio: z.string().min(3, "Company bio is required"),
    company_overview: z.string().min(3, "Company overview is required"),
  })
  .superRefine((data, ctx) => {
    const monthNames = [
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
    ];
    const selectedMonthIndex = monthNames.indexOf(data.month_founded) + 1; // 1-based
    const selectedYear = parseInt(data.year_founded);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (selectedYear === currentYear && selectedMonthIndex > currentMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Month founded cannot be greater than current month (${new Date().toLocaleString("default", { month: "long" })} ${currentYear})`,
        path: ["month_founded"],
      });
    }
  });

export const companyTypeSchema = z.object({
  business_model: z.enum(["B2B", "B2C", "B2G", "B2B2C", "C2C", "C2B"], {
    required_error: "Please select a business model",
  }),
});

export const companyLocationSchema = z.object({
  country: z.string().min(3, "Country is required"),
  city: z.string().min(3, "City is required"),
  state: z.string().min(3, "State is required"),
  zip_code: z.string().min(5, "Zip code is required"),
});

export const teamInfoSchema = z.object({
  size: z.string().min(1, "Team size is required"),
  work_style: z.enum(["remote", "hybrid", "onsite"], {
    required_error: "Please select a work style",
  }),
});

export const founderSchema = z.object({
  name: z.string().min(3, "Founder name is required"),
  background: z.string().min(1, "Founder background is required"),
});

export const foundersSchema = z.object({
  founders: z.array(founderSchema).min(1, "At least one founder is required"),
});

export const linkAccountSchema = z.object({
  // Optional since they might not want to connect accounts right away
  connectedAccounts: z.array(z.string()).optional(),
});

export const basicInfoSchema = z.object({
  company: z.string().min(3, "Company is required"),
  role: z.string().min(3, "Role is required"),
  industry_type: z.string().min(3, "Industry type is required"),
  business_objective: z.string().min(3, "Business objectives are required"),
});

export const descriptionSchema = z.object({
  company_name: z.string().min(3, "Company name is required"),
  description: z.string().min(3, "Description is required"),
});

export const roleSelectionSchema = z.object({
  selected_role: z.string().min(3, "Please select a role"),
});

export const productIdeaSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const basicInfoResponseSchema = z.object({
  ideas: z.array(productIdeaSchema),
});

export const descriptionResponseSchema = z.object({
  suggested_roles: z.array(z.string()),
});

// API version of company info schema with correct types for API
export const apiCompanyInfoSchema = z
  .object({
    year_founded: z
      .number()
      .int()
      .min(1900, "Valid year is required")
      .max(
        new Date().getFullYear(),
        `Year founded cannot be in the future (current year is ${new Date().getFullYear()})`
      ),
    month_founded: z
      .string()
      .min(1, "Month founded is required")
      .refine((monthName) => {
        const monthNames = [
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
        ];
        return monthNames.includes(monthName);
      }, "Invalid month name"),
    state_registered: z.string().min(3, "State registered is required"),
    business_entity_type: z.string().min(3, "Business entity type is required"),
    company_bio: z.string().min(3, "Company bio is required"),
    company_overview: z.string().min(3, "Company overview is required"),
  })
  .superRefine((data, ctx) => {
    const monthNames = [
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
    ];
    const selectedMonthIndex = monthNames.indexOf(data.month_founded) + 1; // 1-based
    const selectedYear = data.year_founded;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (selectedYear === currentYear && selectedMonthIndex > currentMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Month founded cannot be greater than current month (${new Date().toLocaleString("default", { month: "long" })} ${currentYear})`,
        path: ["month_founded"],
      });
    }
  });

// API version of team info schema with correct types for API
export const apiTeamInfoSchema = z.object({
  size: z.number().int().min(1, "Team size is required"),
  work_style: z.enum(["remote", "hybrid", "onsite"], {
    required_error: "Please select a work style",
  }),
});

export const completeOnboardingSchema = z.object({
  user: z.object({
    location: z.object({
      country: z.string().min(3, "Country is required"),
      city: z.string().min(3, "City is required"),
      state: z.string().min(3, "State is required"),
      zip_code: z.string().min(5, "Zip code is required"),
    }),
    social: z.object({
      linkedin_profile: z
        .string()
        .min(1, "LinkedIn profile URL is required")
        .url("Please enter a valid LinkedIn URL")
        .refine((url) => url.includes("linkedin.com"), "Please enter a valid LinkedIn URL"),
    }),
    education: z.object({
      university_name: z.string().min(3, "University is required"),
      highest_level_completed: z.string().min(3, "Education level is required"),
    }),
  }),
  company: z.object({
    info: apiCompanyInfoSchema,
    company_type: companyTypeSchema,
    location: companyLocationSchema,
    team: apiTeamInfoSchema,
    founders: foundersSchema.shape.founders,
  }),
});

export const profileImageSchema = z.object({
  profile_image: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "File size must be less than 5MB")
    .refine(
      (file) => ["image/png", "image/jpeg", "image/jpg"].includes(file.type),
      "Only PNG, JPEG, and JPG files are allowed"
    )
    .optional(),
});

export type LocationSchema = z.infer<typeof locationSchema>;
export type SocialSchema = z.infer<typeof socialSchema>;
export type EducationSchema = z.infer<typeof educationSchema>;
export type PersonalInfoSchema = z.infer<typeof personalInfoSchema>;
export type CompanyInfoSchema = z.infer<typeof companyInfoSchema>;
export type CompanyTypeSchema = z.infer<typeof companyTypeSchema>;
export type CompanyLocationSchema = z.infer<typeof companyLocationSchema>;
export type TeamInfoSchema = z.infer<typeof teamInfoSchema>;
export type FounderSchema = z.infer<typeof founderSchema>;
export type FoundersSchema = z.infer<typeof foundersSchema>;
export type CompleteOnboardingSchema = z.infer<typeof completeOnboardingSchema>;
export type ProfileImageSchema = z.infer<typeof profileImageSchema>;

export type LinkAccountSchema = z.infer<typeof linkAccountSchema>;
export type BasicInfoSchema = z.infer<typeof basicInfoSchema>;
export type DescriptionSchema = z.infer<typeof descriptionSchema>;
export type RoleSelectionSchema = z.infer<typeof roleSelectionSchema>;
export type ProductIdea = z.infer<typeof productIdeaSchema>;
export type BasicInfoResponse = z.infer<typeof basicInfoResponseSchema>;
export type DescriptionResponse = z.infer<typeof descriptionResponseSchema>;
