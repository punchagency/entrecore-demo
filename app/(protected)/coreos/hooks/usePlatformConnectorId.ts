import { useEffect, useState } from "react";
import { resolvePlatformConnectorId } from "../services/platform-connector-api";

interface UsePlatformConnectorIdResult {
  connectorId: string | null;
  isResolving: boolean;
  resolveError: string | null;
}

export function usePlatformConnectorId(
  erpType: string,
  envFallback?: string
): UsePlatformConnectorIdResult {
  const [connectorId, setConnectorId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!erpType.trim()) {
      setConnectorId(null);
      setIsResolving(false);
      setResolveError(null);
      return;
    }

    setIsResolving(true);
    setResolveError(null);

    resolvePlatformConnectorId(erpType, { envFallback })
      .then((id) => {
        if (cancelled) return;
        setConnectorId(id);
        setResolveError(
          id
            ? null
            : `${erpType} is not available on this platform yet. Contact your administrator.`
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error(`[${erpType}] Failed to resolve platform connector id:`, error);
        setConnectorId(envFallback?.trim() || null);
        setResolveError(
          envFallback?.trim()
            ? null
            : `Failed to load ${erpType} connector configuration.`
        );
      })
      .finally(() => {
        if (!cancelled) setIsResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [erpType, envFallback]);

  return { connectorId, isResolving, resolveError };
}
