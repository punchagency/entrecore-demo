import { useState, useEffect, useRef, useCallback } from "react";
import { Axios } from "@/app/config/axios";
import { Company } from "@/app/store/companiesStore";
import { ConnectorConfig, App } from "../types";
import { saveNetSuiteState } from "../utils";
import { PLATFORM_ERP_TYPES } from "../services/platform-connector-api";

const NETSUITE_APP_ID = 27;

interface UseNetSuiteConnectorProps {
  selectedCompany?: Company | null;
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
  setDynamicApps: React.Dispatch<React.SetStateAction<Record<number, App>>>;
}

export const useNetSuiteConnector = ({
  selectedCompany,
  favorites,
}: UseNetSuiteConnectorProps) => {
  const [isCheckingConnector, setIsCheckingConnector] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [connectorError, setConnectorError] = useState<string | null>(null);

  const isCheckingRef = useRef(false);
  const lastCheckTime = useRef<number>(0);
  const checkCooldownMs = 10000;

  const checkNetSuiteConnector = useCallback(async () => {
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
      const netSuiteConfig = configs.find(
        (config) =>
          config.is_active &&
          (config.erp_type === PLATFORM_ERP_TYPES.netsuite ||
            config.connector_name?.toLowerCase().includes("netsuite"))
      );

      if (netSuiteConfig) {
        saveNetSuiteState(true, selectedCompany.id);
      } else if (favorites.has(NETSUITE_APP_ID)) {
        saveNetSuiteState(false, selectedCompany.id);
      }
    } catch (error: unknown) {
      console.error("[NetSuite Check] Error checking NetSuite connector:", error);
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
    if (selectedCompany?.id && favorites.has(NETSUITE_APP_ID)) {
      const timeoutId = setTimeout(() => {
        checkNetSuiteConnector();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCompany?.id, favorites.has(NETSUITE_APP_ID), checkNetSuiteConnector]);

  return {
    isCheckingConnector,
    showLoadingIndicator,
    connectorError,
    checkNetSuiteConnector,
  };
};
