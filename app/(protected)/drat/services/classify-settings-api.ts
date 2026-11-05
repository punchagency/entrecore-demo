import { Axios } from "@/app/config/axios";

export interface ClassifyPromptResponse {
  classify_prompt: string;
  is_default: boolean;
}

export interface FilenameTemplateResponse {
  filename_template_dated: string;
  filename_template_undated: string;
  is_default: boolean;
}

export interface ClassifyPromptUpdatePayload {
  classify_prompt: string;
}

export interface FilenameTemplateUpdatePayload {
  filename_template_dated: string;
  filename_template_undated: string;
}

export const fetchClassifyPrompt = async (): Promise<ClassifyPromptResponse> => {
  const response = await Axios.get("/data/drat-entities/settings/classify-prompt");
  return response.data;
};

export const updateClassifyPrompt = async (
  payload: ClassifyPromptUpdatePayload
): Promise<ClassifyPromptResponse> => {
  const response = await Axios.put("/data/drat-entities/settings/classify-prompt", payload);
  return response.data;
};

export const clearClassifyPrompt = async (): Promise<void> => {
  await Axios.delete("/data/drat-entities/settings/classify-prompt");
};

export const fetchFilenameTemplates = async (): Promise<FilenameTemplateResponse> => {
  const response = await Axios.get("/data/drat-entities/settings/filename-template");
  return response.data;
};

export const updateFilenameTemplates = async (
  payload: FilenameTemplateUpdatePayload
): Promise<FilenameTemplateResponse> => {
  const response = await Axios.put("/data/drat-entities/settings/filename-template", payload);
  return response.data;
};

export const clearFilenameTemplates = async (): Promise<void> => {
  await Axios.delete("/data/drat-entities/settings/filename-template");
};
