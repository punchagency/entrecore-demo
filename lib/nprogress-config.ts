import NProgress from "nprogress";

let configured = false;

/**
 * Configures NProgress with app-wide defaults.
 * Safe to call multiple times — runs only once per page load.
 */
export function configureNProgress() {
  if (configured || typeof window === "undefined") return;
  configured = true;

  NProgress.configure({
    // How long to wait before showing the bar (ms). Prevents flash on fast navigations.
    minimum: 0.08,
    // Speed at which the progress bar moves (ms).
    speed: 200,
    // Fine-tune the trickle interval (ms).
    trickleSpeed: 200,
    // Show the spinner? Set to false — we style our own indicator if needed.
    showSpinner: false,
    // Enable the trickle effect so the bar keeps moving.
    trickle: true,
    // Don't inject NProgress's default CSS — we handle it in globals.css.
    // Set to false only if you add the CSS yourself.
    // easing / speed also live here if needed:
    easing: "ease",
  });
}
