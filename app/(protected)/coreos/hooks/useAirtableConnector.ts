import { useState, useEffect, useRef, useCallback } from "react";
import { Axios } from "@/app/config/axios";
import { Company } from "@/app/store/companiesStore";
import { ConnectorConfig, App } from "../types";
import { saveAirtableState, loadAirtableState } from "../utils";
import { PLATFORM_ERP_TYPES } from "../services/platform-connector-api";

const AIRTABLE_APP_ID = 2;

interface UseAirtableConnectorProps {
  selectedCompany?: Company | null;
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
  setDynamicApps: React.Dispatch<React.SetStateAction<Record<number, App>>>;
}

export const useAirtableConnector = ({
  selectedCompany,
  favorites,
}: UseAirtableConnectorProps) => {
  const [isCheckingConnector, setIsCheckingConnector] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [connectorError, setConnectorError] = useState<string | null>(null);

  const isCheckingRef = useRef(false);
  const lastCheckTime = useRef<number>(0);
  const checkCooldownMs = 10000;

  const checkAirtableConnector = useCallback(async () => {
    if (!selectedCompany?.id) return;
    if (isCheckingRef.current) return;

    const now = Date.now();
    if (now - lastCheckTime.current < checkCooldownMs) return;

    isCheckingRef.current = true;
    lastCheckTime.current = now;
    setIsCheckingConnector(true);
    setConnectorError(null);

    try {
      const configResponse = await Axios.get<{ configs?: ConnectorConfig[] }>(
        `/data/connectors/company/${selectedCompany.id}/configs`
      );
      const configs = configResponse.data?.configs ?? [];
      const airtableConfig = configs.find(
        (config) =>
          config.is_active &&
          (config.erp_type === PLATFORM_ERP_TYPES.airtable ||
            config.connector_name?.toLowerCase().includes("airtable"))
      );

      if (airtableConfig) {
        saveAirtableState(true, selectedCompany.id);
      } else {
        const saved = loadAirtableState(selectedCompany.id);
        if (saved || favorites.has(AIRTABLE_APP_ID)) {
          saveAirtableState(false, selectedCompany.id);
        }
      }
    } catch (error: unknown) {
      console.error("[Airtable Check] Error checking Airtable connector:", error);
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
      setShowLoadingIndicator(false);
      isCheckingRef.current = false;
    }
  }, [selectedCompany?.id, favorites]);

  useEffect(() => {
    if (selectedCompany?.id && favorites.has(AIRTABLE_APP_ID)) {
      const timeoutId = setTimeout(() => {
        checkAirtableConnector();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCompany?.id, favorites.has(AIRTABLE_APP_ID), checkAirtableConnector]);

  return {
    isCheckingConnector,
    showLoadingIndicator,
    connectorError,
    checkAirtableConnector,
  };
};
