import { useState, useEffect, useRef, useCallback } from "react";
import { Axios } from "@/app/config/axios";
import { Company } from "@/app/store/companiesStore";
import { ConnectorConfig, App } from "../types";
import { saveBigQueryState } from "../utils";
import { PLATFORM_ERP_TYPES } from "../services/platform-connector-api";

const BIGQUERY_APP_ID = 9;

interface UseBigQueryConnectorProps {
  selectedCompany?: Company | null;
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
  setDynamicApps: React.Dispatch<React.SetStateAction<Record<number, App>>>;
}

export const useBigQueryConnector = ({
  selectedCompany,
  favorites,
}: UseBigQueryConnectorProps) => {
  const [isCheckingConnector, setIsCheckingConnector] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [connectorError, setConnectorError] = useState<string | null>(null);

  const isCheckingRef = useRef(false);
  const lastCheckTime = useRef<number>(0);
  const checkCooldownMs = 10000;

  const checkBigQueryConnector = useCallback(async () => {
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
      const bigQueryConfig = configs.find(
        (config) =>
          config.is_active &&
          (config.erp_type === PLATFORM_ERP_TYPES.bigquery ||
            config.connector_name?.toLowerCase().includes("bigquery"))
      );

      if (bigQueryConfig) {
        saveBigQueryState(true, selectedCompany.id);
      } else if (favorites.has(BIGQUERY_APP_ID)) {
        saveBigQueryState(false, selectedCompany.id);
      }
    } catch (error: unknown) {
      console.error("[BigQuery Check] Error checking BigQuery connector:", error);
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
    if (selectedCompany?.id && favorites.has(BIGQUERY_APP_ID)) {
      const timeoutId = setTimeout(() => {
        checkBigQueryConnector();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCompany?.id, favorites.has(BIGQUERY_APP_ID), checkBigQueryConnector]);

  return {
    isCheckingConnector,
    showLoadingIndicator,
    connectorError,
    checkBigQueryConnector,
  };
};
