import { Axios } from "@/app/config/axios";

export interface AbstractionEnabledSettings {
  abstraction_enabled: boolean;
}

export interface OcrConfigIdSettings {
  configured: boolean;
  ocr_config_id: string | null;
}

export interface ExtractionProtocolEntry {
  entity_id?: string | null;
  document_type?: string | null;
  ocr_config_id: string;
}

export interface ExtractionProtocolMapSettings {
  entries: ExtractionProtocolEntry[];
}

const SETTINGS_URL = "/data/drat-entities/settings";

export async function getAbstractionEnabled(): Promise<AbstractionEnabledSettings> {
  const response = await Axios.get<AbstractionEnabledSettings>(
    `${SETTINGS_URL}/abstraction-enabled`
  );
  return response.data;
}

export async function setAbstractionEnabled(
  abstraction_enabled: boolean
): Promise<AbstractionEnabledSettings> {
  const response = await Axios.put<AbstractionEnabledSettings>(
    `${SETTINGS_URL}/abstraction-enabled`,
    { abstraction_enabled }
  );
  return response.data;
}

export async function getOcrConfigId(): Promise<OcrConfigIdSettings> {
  const response = await Axios.get<OcrConfigIdSettings>(`${SETTINGS_URL}/ocr-config-id`);
  return response.data;
}

export async function setOcrConfigId(ocr_config_id: string): Promise<OcrConfigIdSettings> {
  const response = await Axios.put<OcrConfigIdSettings>(`${SETTINGS_URL}/ocr-config-id`, {
    ocr_config_id,
  });
  return response.data;
}

export async function clearOcrConfigId(): Promise<void> {
  await Axios.delete(`${SETTINGS_URL}/ocr-config-id`);
}

export async function getExtractionProtocolMap(): Promise<ExtractionProtocolMapSettings> {
  const response = await Axios.get<ExtractionProtocolMapSettings>(
    `${SETTINGS_URL}/extraction-protocol-map`
  );
  return response.data;
}

export async function setExtractionProtocolMap(
  entries: ExtractionProtocolEntry[]
): Promise<ExtractionProtocolMapSettings> {
  const response = await Axios.put<ExtractionProtocolMapSettings>(
    `${SETTINGS_URL}/extraction-protocol-map`,
    { entries }
  );
  return response.data;
}
