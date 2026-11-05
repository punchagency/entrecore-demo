import { Axios } from "@/app/config/axios";

export interface IntegrationRouteEntry {
  entity_id?: string | null;
  document_type?: string | null;
  integration_job_id?: string | null;
  integration_bundle_id?: string | null;
}

export interface IntegrationRoutingMapSettings {
  entries: IntegrationRouteEntry[];
  warnings?: string[];
}

export interface IntegrationJobSummary {
  id: string;
  name: string;
  source_type: string;
  status: string;
  is_active: boolean;
  upsert_field?: string | null;
}

export interface IntegrationBundleSummary {
  id: string;
  name: string;
  source_type: string;
  status: string;
  is_active: boolean;
  /**
   * Names of the jobs this bundle fans out to, when the API includes them. Used
   * only to make fan-out legible in the destination picker; empty/undefined when
   * the response doesn't carry members.
   */
  member_job_names?: string[];
}

const SETTINGS_URL = "/data/drat-entities/settings";

export async function getIntegrationRoutingMap(): Promise<IntegrationRoutingMapSettings> {
  const response = await Axios.get<IntegrationRoutingMapSettings>(
    `${SETTINGS_URL}/integration-routing-map`
  );
  return response.data;
}

export async function setIntegrationRoutingMap(
  entries: IntegrationRouteEntry[]
): Promise<IntegrationRoutingMapSettings> {
  const response = await Axios.put<IntegrationRoutingMapSettings>(
    `${SETTINGS_URL}/integration-routing-map`,
    { entries }
  );
  return response.data;
}

export async function clearIntegrationRoutingMap(): Promise<void> {
  await Axios.delete(`${SETTINGS_URL}/integration-routing-map`);
}

export async function listIntegrationJobs(): Promise<IntegrationJobSummary[]> {
  const response = await Axios.get<{ jobs?: IntegrationJobSummary[] }>("/data/integration/jobs", {
    params: { page: 1, page_size: 100 },
  });
  return response.data.jobs ?? [];
}

/** Pulls member job names out of whatever member field the API happens to use. */
function extractMemberJobNames(raw: Record<string, unknown>): string[] | undefined {
  const members = (raw.jobs ?? raw.child_jobs ?? raw.childJobs) as unknown;
  if (!Array.isArray(members)) return undefined;
  const names = members
    .map((job) => {
      if (typeof job === "string") return job;
      const name = (job as { name?: unknown } | null)?.name;
      return typeof name === "string" ? name : "";
    })
    .filter(Boolean);
  return names.length ? names : undefined;
}

export async function listIntegrationBundles(): Promise<IntegrationBundleSummary[]> {
  const response = await Axios.get<{ bundles?: Record<string, unknown>[] }>(
    "/data/integration/bundles",
    { params: { page: 1, page_size: 100 } }
  );
  const bundles = response.data.bundles ?? [];
  return bundles.map((raw) => ({
    ...(raw as unknown as IntegrationBundleSummary),
    member_job_names: extractMemberJobNames(raw),
  }));
}