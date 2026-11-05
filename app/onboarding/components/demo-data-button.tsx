"use client";

import { toast } from "sonner";
import { Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/app/store/onboardingStore";

/**
 * Dev-only helper for testing the flow end to end.
 *
 * It pre-fills every step but deliberately does not jump ahead: each step's API
 * call still runs in order, which is what the old "Skip All" button broke by
 * dropping testers on the final step with an empty payload.
 */
export function DemoDataButton() {
  const setBasicInfo = useOnboardingStore((state) => state.setBasicInfo);
  const setPersonalInfo = useOnboardingStore((state) => state.setPersonalInfo);
  const setCompanyDetails = useOnboardingStore((state) => state.setCompanyDetails);
  const setFounders = useOnboardingStore((state) => state.setFounders);

  if (process.env.NODE_ENV === "production") return null;

  const fill = () => {
    const suffix = Math.floor(Math.random() * 10_000);

    setBasicInfo({
      company: `Northwind Labs ${suffix}`,
      role: "Founder",
      industry_type: "Technology",
      business_objective:
        "Ship an AI copilot for small operations teams and reach 100 paying customers.",
    });

    setPersonalInfo({
      user_country: "United States",
      user_city: "Austin",
      user_state: "Texas",
      user_zip_code: "78701",
      linkedin_profile: "https://www.linkedin.com/in/demo-founder",
      university_name: "University of Texas",
      highest_level_completed: "Bachelor's Degree",
    });

    setCompanyDetails({
      year_founded: "2023",
      month_founded: "March",
      state_registered: "Delaware",
      business_entity_type: "LLC",
      business_model: "B2B",
      company_country: "United States",
      company_city: "Austin",
      company_state: "Texas",
      company_zip_code: "78701",
      team_size: "6-10",
      work_style: "hybrid",
      company_bio: "Operations intelligence for small teams.",
      company_overview: "Northwind Labs builds an AI copilot for small operations teams.",
    });

    setFounders([
      {
        name: "Demo Founder",
        background: "Ten years building operations tooling at logistics and fintech startups.",
      },
    ]);

    toast.success("Demo data filled — continue through each step");
  };

  return (
    <div className="fixed right-4 top-20 z-40">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={fill}
        className="gap-1.5 rounded-full border-dashed border-gray-300 bg-white/70 text-[11px] font-semibold uppercase tracking-wide text-gray-400 backdrop-blur hover:text-gray-900"
      >
        <Wand2 className="size-3" />
        Fill demo data
      </Button>
    </div>
  );
}
