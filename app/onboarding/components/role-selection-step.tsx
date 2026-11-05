"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useOnboardingStore } from "@/app/store/onboardingStore";
import { StepShell } from "./onboarding-shell";

const formatRoleName = (role: string) =>
  role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function RoleSelectionStep() {
  const { isLoading, submitRoleSelection } = useOnboarding();
  const {
    suggestedRoles,
    selectedRole,
    setSelectedRole,
    setBasicInfo,
    goToNextStep,
    goToPreviousStep,
  } = useOnboardingStore();

  const [usesCustomRole, setUsesCustomRole] = useState(
    () => Boolean(selectedRole) && !suggestedRoles.includes(selectedRole)
  );
  const [error, setError] = useState<string>();

  const resolvedRole = selectedRole.trim();

  const handleContinue = async () => {
    if (resolvedRole.length < 3) {
      setError(
        usesCustomRole ? "Enter your role (at least 3 characters)" : "Pick the role that fits best"
      );
      return;
    }
    setError(undefined);

    try {
      await submitRoleSelection({ selected_role: resolvedRole }, true);
      // Keep step 1's payload in sync so a later edit resubmits the right role.
      setBasicInfo({ role: resolvedRole });
      goToNextStep();
    } catch {
      // submitRoleSelection already surfaced the reason.
    }
  };

  return (
    <StepShell
      eyebrow="Your role"
      title="What do you actually do day to day?"
      description={
        suggestedRoles.length > 0
          ? "Based on what you told us, these look like the closest fit. Pick one or write your own."
          : "Tell us the role you hold so we can tailor your workspace."
      }
      onBack={goToPreviousStep}
      onContinue={handleContinue}
      isBusy={isLoading}
    >
      <div className="space-y-6">
        {suggestedRoles.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestedRoles.map((role) => {
              const isSelected = !usesCustomRole && selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setUsesCustomRole(false);
                    setSelectedRole(role);
                    setError(undefined);
                  }}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-2xl border p-5 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--primary)]"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.3)]"
                  )}
                >
                  <span
                    className={cn(
                      "text-base font-medium",
                      isSelected ? "text-primary" : "text-gray-800"
                    )}
                  >
                    {formatRoleName(role)}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 text-transparent group-hover:border-gray-300"
                    )}
                  >
                    <Check className="size-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            aria-pressed={usesCustomRole}
            onClick={() => {
              setUsesCustomRole(true);
              setSelectedRole("");
              setError(undefined);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border border-dashed p-5 text-left transition-all",
              usesCustomRole
                ? "border-primary bg-primary/5"
                : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
            )}
          >
            <Sparkles
              className={cn("size-4 shrink-0", usesCustomRole ? "text-primary" : "text-gray-400")}
            />
            <span
              className={cn(
                "text-base font-medium",
                usesCustomRole ? "text-primary" : "text-gray-700"
              )}
            >
              {suggestedRoles.length > 0 ? "None of these — I'll write my own" : "Enter your role"}
            </span>
          </button>

          {usesCustomRole && (
            <Input
              autoFocus
              placeholder="e.g. Head of Operations"
              value={selectedRole}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setSelectedRole(event.target.value);
                if (error) setError(undefined);
              }}
              className={cn(
                "h-12 w-full rounded-xl border bg-white px-4 text-base placeholder:text-gray-300 focus-visible:ring-4 focus-visible:ring-primary/10",
                error
                  ? "border-red-300 focus-visible:border-red-400 focus-visible:ring-red-100"
                  : "border-gray-200 focus-visible:border-primary"
              )}
            />
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </StepShell>
  );
}
