"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StepShellProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;

  onBack?: () => void;
  onSkip?: () => void;
  onContinue: () => void;

  backLabel?: string;
  skipLabel?: string;
  continueLabel?: string;

  continueDisabled?: boolean;
  isBusy?: boolean;
  busyLabel?: string;
  /** Note rendered under the actions (e.g. autosave hint, outstanding-items count). */
  footerNote?: React.ReactNode;
}

/**
 * Frame shared by every onboarding step: heading block, body, and the step actions.
 *
 * The actions sit directly after the content rather than pinned to the bottom of
 * the viewport — a fixed bar left a gap under short steps that grew with screen
 * height. The column centres itself when it fits and grows when it doesn't.
 *
 * The body is a real <form>, so Enter submits from any single-line input and
 * Continue is the form's submit — no key handlers scattered across steps.
 */
export function StepShell({
  eyebrow,
  title,
  description,
  children,
  onBack,
  onSkip,
  onContinue,
  backLabel = "Back",
  skipLabel = "Skip for now",
  continueLabel = "Continue",
  continueDisabled = false,
  isBusy = false,
  busyLabel = "Saving…",
  footerNote,
}: StepShellProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!isBusy) onContinue();
      }}
      className="flex min-h-dvh items-center px-6 py-28 sm:px-8"
    >
      <div className="mx-auto w-full max-w-2xl">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-2"
        >
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-xl text-base leading-relaxed text-gray-500">{description}</p>
          )}
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10"
        >
          {children}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="mt-12 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  disabled={isBusy}
                  className="-ml-3 h-11 gap-2 px-3 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  <ArrowLeft className="size-4" />
                  {backLabel}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {onSkip && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onSkip}
                  disabled={isBusy}
                  className="h-11 px-3 text-gray-500 underline-offset-4 hover:bg-transparent hover:text-gray-900 hover:underline sm:px-4"
                >
                  {skipLabel}
                </Button>
              )}
              <Button
                type="submit"
                disabled={isBusy || continueDisabled}
                className={cn(
                  "h-11 min-w-[9.5rem] gap-2 rounded-full px-6 text-sm font-semibold",
                  "shadow-[0_8px_24px_-8px_rgba(48,100,246,0.6)] transition-transform active:scale-[0.98]"
                )}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {busyLabel}
                  </>
                ) : (
                  <>
                    {continueLabel}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {footerNote && <p className="text-xs text-gray-400">{footerNote}</p>}
        </motion.div>
      </div>
    </form>
  );
}

/** Groups related fields under a small caption so long steps stay scannable. */
export function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-0.5">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
              {title}
            </h2>
          )}
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
