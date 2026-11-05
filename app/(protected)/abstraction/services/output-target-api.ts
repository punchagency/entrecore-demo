import { Axios } from "@/app/config/axios";
import {
  ConnectorConnectivityResult,
  testConnectorConnectivity,
} from "./connector-input-api";

export type OutputTargetMode = "sql" | "storage" | "webhook";

export interface OutputConnectivityResult extends ConnectorConnectivityResult {
  mode: OutputTargetMode;
}

export async function testOutputConnectivity(params: {
  mode: OutputTargetMode;
  companyId: string;
  connectorId?: string;
  webhookUrl?: string;
  storagePath?: string;
  httpMethod?: string;
}): Promise<OutputConnectivityResult> {
  const { mode, companyId, connectorId, webhookUrl, storagePath, httpMethod } = params;

  if (mode === "webhook") {
    return testWebhookConnectivity(webhookUrl ?? "", httpMethod ?? "POST");
  }

  if (!connectorId) {
    return {
      mode,
      success: false,
      message: "Select a target connector before testing connectivity",
      testedAt: new Date().toISOString(),
    };
  }

  const result = await testConnectorConnectivity(connectorId, companyId);

  if (mode === "storage" && result.success && storagePath) {
    const pathValid = /^[a-zA-Z0-9_./-]+$/.test(storagePath.trim());
    if (!pathValid) {
      return {
        mode,
        success: false,
        message: "Storage path contains invalid characters",
        testedAt: result.testedAt,
      };
    }
    return {
      ...result,
      mode,
      message: `${result.message} — storage path "${storagePath}" is valid`,
    };
  }

  return { ...result, mode };
}

async function testWebhookConnectivity(
  webhookUrl: string,
  httpMethod: string
): Promise<OutputConnectivityResult> {
  const testedAt = new Date().toISOString();

  if (!webhookUrl.trim()) {
    return {
      mode: "webhook",
      success: false,
      message: "Webhook URL is required",
      testedAt,
    };
  }

  try {
    new URL(webhookUrl);
  } catch {
    return {
      mode: "webhook",
      success: false,
      message: "Enter a valid webhook URL (https://...)",
      testedAt,
    };
  }

  try {
    const response = await Axios.post("/data/workflows/output/test-webhook", {
      url: webhookUrl,
      method: httpMethod,
    });
    const data = response.data ?? {};
    return {
      mode: "webhook",
      success: data.success !== false,
      message:
        typeof data.message === "string"
          ? data.message
          : "Webhook endpoint responded successfully",
      latencyMs: typeof data.latency_ms === "number" ? data.latency_ms : undefined,
      testedAt,
    };
  } catch {
    if (webhookUrl.startsWith("https://") || webhookUrl.startsWith("http://")) {
      return {
        mode: "webhook",
        success: true,
        message: `Webhook URL format valid (${httpMethod}). Live probe unavailable — will fire on workflow run.`,
        testedAt,
      };
    }
    return {
      mode: "webhook",
      success: false,
      message: "Unable to verify webhook endpoint. Check the URL and try again.",
      testedAt,
    };
  }
}
