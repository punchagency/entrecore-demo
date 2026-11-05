"use client";

/**
 * NavigationProgress
 *
 * A modular NProgress bar that automatically starts/stops on every
 * Next.js App Router navigation. Mount this once — inside Providers
 * or the root layout — and it will work globally.
 *
 * Configuration lives in `lib/nprogress-config.ts` so tweaks stay
 * in one place and never touch this component.
 */

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

import { configureNProgress } from "@/lib/nprogress-config";

// Apply config the first time this module is loaded (client-side only).
configureNProgress();

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Stop the progress bar whenever the route or search params change (navigation finishes)
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  // Start the progress bar when clicking a link that navigates to a different page
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      // Find the closest anchor tag that was clicked
      const target = (event.target as HTMLElement).closest("a");

      if (!target) return;

      const href = target.getAttribute("href");

      // Ignore empty links, anchor links on the same page, or links opening in a new tab
      if (
        !href ||
        href.startsWith("#") ||
        target.getAttribute("target") === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      try {
        const url = new URL(target.href);
        const currentUrl = new URL(window.location.href);

        // Only trigger progress if we are navigating to a different path or search params
        // on the same origin (Next.js Link handles these)
        if (
          url.origin === currentUrl.origin &&
          (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search)
        ) {
          NProgress.start();
        }
      } catch (err) {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleAnchorClick);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  return null;
}

/**
 * Call this before a programmatic navigation to show the bar immediately.
 *
 * Example:
 *   import { startNavigationProgress } from "@/components/navigation-progress";
 *   startNavigationProgress();
 *   router.push("/some-route");
 */
export function startNavigationProgress() {
  NProgress.start();
}

export function stopNavigationProgress() {
  NProgress.done();
}
