"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, ImagePlus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/use-onboarding";
import { getProtectedRedirectRoute } from "@/lib/utils";
import { useOnboardingStore } from "@/app/store/onboardingStore";
import { StepShell } from "./onboarding-shell";
import {
  collectMissingSections,
  monthToNumber,
  normalizeLinkedInUrl,
  teamSizeToNumber,
} from "../lib/onboarding-validation";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export default function ProfileSetupStep() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoading, submitCompleteOnboarding } = useOnboarding();

  const {
    company,
    selectedRole,
    personalInfo,
    companyDetails,
    founders,
    profileImage,
    setProfileImage,
    setCurrentStep,
    setHasCompleted,
    goToPreviousStep,
  } = useOnboardingStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Guards against a second request from a double click — `isLoading` only flips on re-render. */
  const isSubmittingRef = useRef(false);
  const [isDone, setIsDone] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!profileImage) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(profileImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profileImage]);

  const missingSections = useMemo(
    () =>
      collectMissingSections({
        company,
        selectedRole,
        personalInfo,
        companyDetails,
        founders,
      }),
    [company, selectedRole, personalInfo, companyDetails, founders]
  );

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so re-picking the same file still fires a change event.
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("That image is over 5MB — pick a smaller one");
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Use a PNG or JPG image");
      return;
    }
    setProfileImage(file);
  };

  const handleFinish = async () => {
    if (isSubmittingRef.current || useOnboardingStore.getState().hasCompleted) return;
    if (missingSections.length > 0) {
      setCurrentStep(missingSections[0].step);
      return;
    }

    isSubmittingRef.current = true;

    const payload = {
      user: {
        location: {
          country: personalInfo.user_country.trim(),
          city: personalInfo.user_city.trim(),
          state: personalInfo.user_state.trim(),
          zip_code: personalInfo.user_zip_code.trim(),
        },
        social: { linkedin_profile: normalizeLinkedInUrl(personalInfo.linkedin_profile) },
        education: {
          university_name: personalInfo.university_name.trim(),
          highest_level_completed: personalInfo.highest_level_completed,
        },
      },
      company: {
        info: {
          company_name: company.trim(),
          year_founded: Number.parseInt(companyDetails.year_founded, 10),
          month_founded: monthToNumber(companyDetails.month_founded).toString(),
          state_registered: companyDetails.state_registered.trim(),
          business_entity_type: companyDetails.business_entity_type,
          company_bio: companyDetails.company_bio.trim(),
          company_overview: companyDetails.company_overview.trim(),
        },
        company_type: { business_model: companyDetails.business_model },
        location: {
          country: companyDetails.company_country.trim(),
          city: companyDetails.company_city.trim(),
          state: companyDetails.company_state.trim(),
          zip_code: companyDetails.company_zip_code.trim(),
        },
        team: {
          size: teamSizeToNumber(companyDetails.team_size),
          work_style: companyDetails.work_style,
        },
        founders,
      },
    } as Parameters<typeof submitCompleteOnboarding>[0];

    try {
      await submitCompleteOnboarding(payload, profileImage || undefined);

      // Latch completion before navigating so a stray re-render can't submit again.
      setHasCompleted(true);
      setIsDone(true);
      // `/auth/me` now reports onboarding_completed — drop the stale cache.
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      // Respect the production route gate rather than hard-navigating to /coreos.
      router.replace(getProtectedRedirectRoute("/coreos"));
    } catch (error) {
      console.error("Complete onboarding error:", error);
      // Let them retry — the hook already surfaced why it failed.
      isSubmittingRef.current = false;
    }
  };

  if (isDone) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex size-16 items-center justify-center rounded-full bg-primary text-white"
        >
          <Check className="size-8" />
        </motion.div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">
          {company} is set up
        </h1>
        <p className="mt-2 text-gray-500">Taking you to your workspace…</p>
      </div>
    );
  }

  const summary = [
    { label: "Company", value: company },
    { label: "Role", value: selectedRole },
    {
      label: "Based in",
      value: [personalInfo.user_city, personalInfo.user_country].filter(Boolean).join(", "),
    },
    {
      label: "Team",
      value: companyDetails.team_size ? `${companyDetails.team_size} · ${companyDetails.work_style}` : "",
    },
  ].filter((item) => item.value);

  return (
    <StepShell
      eyebrow="Finish up"
      title="Add a photo and you're done"
      description="Your avatar is optional — everything else is already saved. Review it below and launch your workspace."
      onBack={goToPreviousStep}
      onContinue={handleFinish}
      continueLabel={missingSections.length > 0 ? "Complete missing details" : "Finish setup"}
      isBusy={isLoading}
      busyLabel="Setting things up…"
      footerNote={
        missingSections.length > 0
          ? missingSections.length === 1
            ? "1 section still needs attention before you can finish."
            : `${missingSections.length} sections still need attention before you can finish.`
          : undefined
      }
    >
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-gray-200 bg-white p-8 sm:flex-row sm:items-center sm:gap-8">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-colors",
              previewUrl
                ? "ring-1 ring-gray-200"
                : "border-2 border-dashed border-gray-200 bg-gray-50 hover:border-primary/40 hover:bg-primary/5"
            )}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Profile preview" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-7 text-gray-300 transition-colors group-hover:text-primary" />
            )}
          </button>

          <div className="flex-1 text-center sm:text-left">
            <p className="text-base font-medium text-gray-900">Profile photo</p>
            <p className="mt-0.5 text-sm text-gray-500">PNG or JPG, up to 5MB.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 rounded-full border-gray-200 px-4"
              >
                {profileImage ? "Replace" : "Choose image"}
              </Button>
              {profileImage && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setProfileImage(null)}
                  className="h-9 gap-1.5 rounded-full px-4 text-gray-500 hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {missingSections.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-base font-medium text-gray-900">
                    A few details are still needed
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    We can&apos;t create your workspace without these. Jump straight to whatever&apos;s
                    missing.
                  </p>
                </div>

                <ul className="space-y-2">
                  {missingSections.map((section) => (
                    <li key={section.step}>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(section.step)}
                        className="group flex w-full items-center justify-between gap-4 rounded-xl border border-amber-200/70 bg-white px-4 py-3 text-left transition-colors hover:border-amber-300"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-900">
                            {section.label}
                          </span>
                          <span className="block truncate text-sm text-gray-500">
                            {section.fields.join(", ")}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-900" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-primary" />
              <p className="text-sm font-medium text-gray-900">Everything checks out</p>
            </div>
            <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {summary.map((item) => (
                <div key={item.label} className="flex flex-col">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {item.label}
                  </dt>
                  <dd className="truncate text-sm text-gray-800">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </StepShell>
  );
}
