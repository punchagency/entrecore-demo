import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Axios } from "@/app/config/axios";
import {
  BasicInfoSchema,
  DescriptionSchema,
  RoleSelectionSchema,
  BasicInfoResponse,
  DescriptionResponse,
  ProductIdea,
  CompleteOnboardingSchema,
} from "@/app/lib/validations/onboarding";

interface OnboardingProgress {
  step: "basic-info" | "product-ideas" | "role-selection" | "completed";
  data?: any;
}

interface CompleteOnboardingResponse {
  message: string;
  profile_image_path?: string;
  company_id: string;
}

// Helper function to extract error message from API response
const extractErrorMessage = (error: any): string => {
  if (error?.response?.data?.detail) {
    // Handle Pydantic validation errors
    const detail = error.response.data.detail;
    if (Array.isArray(detail)) {
      // Extract field-specific error messages from Pydantic validation errors
      return detail
        .map((err: any) => {
          const fieldPath = err.loc?.join(".") || "field";
          const message = err.msg || err.message;
          // Convert field path to readable format
          const readableField = fieldPath
            .replace("user.social.", "")
            .replace("user.education.", "")
            .replace("company.info.", "")
            .replace("company.team.", "")
            .replace("company.location.", "")
            .replace("_", " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
          return `${readableField}: ${message}`;
        })
        .join("; ");
    }
    if (typeof detail === "string") {
      // Try to extract field and meaningful message from Pydantic error string
      const fieldMatch =
        detail.match(/user\.social\.(\w+)/) ||
        detail.match(/user\.education\.(\w+)/) ||
        detail.match(/company\.info\.(\w+)/) ||
        detail.match(/company\.team\.(\w+)/) ||
        detail.match(/company\.location\.(\w+)/);
      const typeMatch = detail.match(/Input should be a valid (\w+), input is (\w+)/);

      if (fieldMatch && typeMatch) {
        const fieldName = fieldMatch[1]
          .replace("_", " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
        return `${fieldName}: Please provide a valid ${typeMatch[1]}`;
      }
      return detail;
    }
    return detail;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
};

export const useOnboarding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  const submitBasicInfo = useCallback(async (data: BasicInfoSchema, silent = false): Promise<ProductIdea[]> => {
    try {
      setIsLoading(true);
      const response = await Axios.post<BasicInfoResponse>("/auth/onboarding/basic-info", data);

      if (!silent) toast.success("Basic information submitted successfully!");
      return response.data.ideas || [];
    } catch (error) {
      console.error("Error submitting basic info:", error);
      if (!silent) {
        const errorMessage = extractErrorMessage(error);
        toast.error(errorMessage);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitDescription = useCallback(
    async (data: DescriptionSchema, silent = false): Promise<string[]> => {
      try {
        setIsLoading(true);
        const response = await Axios.post<DescriptionResponse>(
          "/auth/onboarding/description",
          data
        );

        if (!silent) toast.success("Description processed successfully!");
        return response.data.suggested_roles || [];
      } catch (error) {
        console.error("Error submitting description:", error);
        if (!silent) toast.error(extractErrorMessage(error));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const submitRoleSelection = useCallback(
    async (data: RoleSelectionSchema, silent = false): Promise<void> => {
      try {
        setIsLoading(true);

        // Submit role selection
        await Axios.post("/auth/onboarding/selection", data);

        if (!silent) toast.success("Role selection completed!");
      } catch (error) {
        console.error("Error completing role selection:", error);
        toast.error(extractErrorMessage(error));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const submitCompleteOnboarding = useCallback(
    async (
      data: CompleteOnboardingSchema,
      profileImage?: File
    ): Promise<CompleteOnboardingResponse> => {
      try {
        setIsLoading(true);

        // Create FormData for multipart/form-data
        const formData = new FormData();

        // Add the JSON data as a string
        formData.append("data", JSON.stringify(data));

        // Add profile image if provided
        if (profileImage) {
          formData.append("profile_image", profileImage);
        }

        const response = await Axios.post<CompleteOnboardingResponse>(
          "/auth/onboarding/complete",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        toast.success("Onboarding completed successfully!");
        return response.data;
      } catch (error) {
        console.error("Error completing onboarding:", error);
        const errorMessage = extractErrorMessage(error);
        toast.error(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Partial update of an existing company. The endpoint takes the id as a query
   * param — omitting it silently targets nothing, which is how this used to fail.
   */
  const updateCompanyInfo = useCallback(
    async (companyId: string, data: Record<string, unknown>, silent = false): Promise<void> => {
      try {
        setIsLoading(true);
        await Axios.put(`/auth/onboarding/company?company_id=${companyId}`, data);

        if (!silent) toast.success("Company information updated successfully!");
      } catch (error) {
        console.error("Error updating company info:", error);
        if (!silent) toast.error(extractErrorMessage(error));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getProgress = useCallback(async (): Promise<OnboardingProgress | null> => {
    try {
      const response = await Axios.get<OnboardingProgress>("/auth/onboarding/progress");
      setProgress(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching onboarding progress:", error);
      return null;
    }
  }, []);

  return {
    isLoading,
    progress,
    submitBasicInfo,
    submitDescription,
    submitRoleSelection,
    submitCompleteOnboarding,
    updateCompanyInfo,
    getProgress,
  };
};
