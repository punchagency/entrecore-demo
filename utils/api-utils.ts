import { Axios } from "@/app/config/axios";
import { Company } from "@/app/store/companiesStore";

/**
 * Save file metadata to the backend
 * @param data File metadata
 * @returns Promise with the response data
 */
export const saveFileMetadata = async (data: any) => {
  const documentData = {
    external_company_id: data.external_company_id || "",
    document_name: data.name,
    document_category: data.category,
    document_description: data.description,
    document_url: data.fileUrl,
    document_type: data.fileType || "",
    document_size: data.fileSize || 0,
  };

  const response = await Axios.post("/data/company-documents/", documentData);
  return response.data;
};

/**
 * Upload a document and ingest it into the guides system
 * @param file The document file to upload
 * @param tags Optional tags for the document
 * @returns Promise with the response data
 */
export const uploadCompanyDocToGuides = async (file: File, tags?: string) => {
  const formData = new FormData();
  formData.append("file", file);
  if (tags) {
    formData.append("tags", tags);
  }

  const response = await Axios.post("/data/guides/upload-company-docs", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

/**
 * Update file metadata in the backend
 * @param id Document ID
 * @param data Updated metadata
 * @param originalData Original document data
 * @returns Promise with the response data
 */
export const updateFileMetadata = async (id: string, data: any, originalData: any) => {
  const documentData = {
    external_company_id: originalData.external_company_id || "default",
    document_name: originalData.document_name,
    document_category: originalData.document_category,
    document_description: originalData.document_description,
    document_url: originalData.document_url,
    document_type: originalData.document_type || "",
    document_size: originalData.document_size || 0,
  };

  // Only update fields that have changed
  if (data.name) documentData.document_name = data.name;
  if (data.category) documentData.document_category = data.category;
  if (data.description) documentData.document_description = data.description;
  if (data.fileUrl) documentData.document_url = data.fileUrl;
  if (data.fileType) documentData.document_type = data.fileType;
  if (data.fileSize) documentData.document_size = data.fileSize;

  const response = await Axios.put(`/data/company-documents/${id}`, documentData);
  return response.data;
};

/**
 * Delete a document from the backend
 * @param id Document ID
 * @returns Promise with the response data
 */
export const deleteFileMetadata = async (id: string) => {
  const response = await Axios.delete(`/data/company-documents/${id}`);
  return response.data;
};

/**
 * Fetch all company knowledge documents that have been ingested into Guides
 * @returns Promise with the list of knowledge documents
 */
export const fetchCompanyKnowledgeDocs = async () => {
  const response = await Axios.get("/data/guides/company-knowledge-docs");
  return response.data;
};

/**
 * Delete a company knowledge document by its knowledge_id
 * @param knowledgeId Identifier of the knowledge document to delete
 * @returns Promise with the response data
 */
export const deleteCompanyKnowledgeDoc = async (knowledgeId: string) => {
  const response = await Axios.delete(
    `/data/guides/company-knowledge-docs/${knowledgeId}`
  );
  return response.data;
};

/**
 * Update a company knowledge document (tags and/or name)
 * @param knowledgeId Identifier of the knowledge document to update
 * @param payload Update payload
 * @returns Promise with the response data
 */
export const updateCompanyKnowledgeDocTags = async (
  knowledgeId: string,
  payload: {
    new_tags?: string[];
    append?: boolean;
    remove_tags?: string[];
    new_name?: string;
  }
) => {
  const body: Record<string, any> = {
    new_tags: payload.new_tags ?? [],
    append: payload.append ?? true,
    remove_tags: payload.remove_tags ?? [],
  };
  if (payload.new_name) {
    body.new_name = payload.new_name;
  }
  const response = await Axios.put(
    `/data/guides/company-knowledge-docs/${knowledgeId}`,
    body
  );
  return response.data;
};

/**
 * Sets the selected company in localStorage and dispatches a custom event
 * to notify other components of the change
 */
export const setSelectedCompany = (company: Company) => {
  if (!company.id) {
    console.warn("Cannot set selected company: company ID is undefined");
    return;
  }

  const companyData = {
    id: company.id,
    name: company.company_name || company?.info?.company_name,
    profileImage: company.profile_image,
    coverImage: company.cover_image,
  };

  const oldValue = localStorage.getItem("selectedCompanyId");
  localStorage.setItem("selectedCompanyId", company.id);
  localStorage.setItem("selectedCompanyData", JSON.stringify(companyData));

  // Dispatch custom event for same-tab listeners
  window.dispatchEvent(
    new CustomEvent("localStorageChange", {
      detail: {
        key: "selectedCompanyId",
        newValue: company.id,
        oldValue: oldValue,
      },
    })
  );
};
