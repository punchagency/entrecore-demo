import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Axios } from "@/app/config/axios";
import { Company } from "@/app/store/companiesStore";
import { ConnectorConfig } from "../types";
import { saveGoogleDriveState } from "../utils";

const GDRIVE_APP_ID = 29;
const GDRIVE_ERP_TYPE = "google_drive";

interface UseGoogleDriveConnectorProps {
  selectedCompany?: Company | null;
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
}

export const useGoogleDriveConnector = ({
  selectedCompany,
  favorites,
  toggleFavorite,
}: UseGoogleDriveConnectorProps) => {
  const [isCheckingConnector, setIsCheckingConnector] = useState(false);
  const [connectorError, setConnectorError] = useState<string | null>(null);

  const isCheckingRef = useRef(false);
  const lastCheckTime = useRef<number>(0);
  const checkCooldownMs = 10000;

  const fetchActiveConfig = useCallback(async (): Promise<ConnectorConfig | undefined> => {
    if (!selectedCompany?.id) return undefined;

    const configResponse = await Axios.get<{ configs?: ConnectorConfig[] }>(
      `/data/connectors/company/${selectedCompany.id}/configs`
    );
    const configs = configResponse.data?.configs ?? [];
    return configs.find(
      (config) =>
        config.is_active &&
        (config.erp_type === GDRIVE_ERP_TYPE ||
          config.connector_name?.toLowerCase().includes("google drive"))
    );
  }, [selectedCompany?.id]);

  const checkGoogleDriveConnector = useCallback(async () => {
    if (!selectedCompany?.id) return;
    if (isCheckingRef.current) return;

    const now = Date.now();
    if (now - lastCheckTime.current < checkCooldownMs) return;

    isCheckingRef.current = true;
    lastCheckTime.current = now;
    setIsCheckingConnector(true);
    setConnectorError(null);

    try {
      const activeConfig = await fetchActiveConfig();
      if (activeConfig) {
        saveGoogleDriveState(true, selectedCompany.id);
      } else if (favorites.has(GDRIVE_APP_ID)) {
        saveGoogleDriveState(false, selectedCompany.id);
      }
    } catch (error: unknown) {
      console.error("[GDrive Check] Error checking Google Drive connector:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage === "Request timeout") {
        setConnectorError("Connection timeout. Please check your network.");
      } else if (errorMessage.includes("NETWORK_ERROR")) {
        setConnectorError("Network error. Please check your connection.");
      } else {
        setConnectorError("Failed to check connector status.");
      }
    } finally {
      setIsCheckingConnector(false);
      isCheckingRef.current = false;
    }
  }, [selectedCompany?.id, favorites, fetchActiveConfig]);

  // Verify existing connection when Google Drive is favorited (same as other connectors)
  useEffect(() => {
    if (selectedCompany?.id && favorites.has(GDRIVE_APP_ID)) {
      const timeoutId = setTimeout(() => {
        checkGoogleDriveConnector();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCompany?.id, favorites.has(GDRIVE_APP_ID), checkGoogleDriveConnector]);

  // Finalize a pending OAuth connection after returning from the Google consent screen
  useEffect(() => {
    if (!selectedCompany?.id) return;
    const companyId = selectedCompany.id;

    const pendingKey = `gdrive_oauth_pending_${companyId}`;
    const pendingMarker = typeof window !== "undefined" ? localStorage.getItem(pendingKey) : null;
    if (!pendingMarker) return;

    let cancelled = false;

    const finalizeOAuth = async () => {
      try {
        const activeConfig = await fetchActiveConfig();
        if (cancelled) return;

        localStorage.removeItem(pendingKey);

        if (activeConfig) {
          saveGoogleDriveState(true, companyId);
          if (!favorites.has(GDRIVE_APP_ID)) {
            toggleFavorite(GDRIVE_APP_ID);
          }
          toast.success("Google Drive connected successfully!");
        } else {
          toast.error("Google Drive authorization was not completed. Please try again.");
        }
      } catch (error) {
        // Keep the marker so the next visit retries the verification
        console.error("[GDrive OAuth] Failed to verify pending connection:", error);
      }
    };

    const timeoutId = setTimeout(finalizeOAuth, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [selectedCompany?.id, favorites, toggleFavorite, fetchActiveConfig]);

  return {
    isCheckingConnector,
    connectorError,
    checkGoogleDriveConnector,
  };
};
