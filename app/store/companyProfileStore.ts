import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Axios } from "../config/axios";
import { uploadToS3 } from "@/utils/s3-utils";

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("Invalid image file"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function isAspectRatioApproximately(
  width: number,
  height: number,
  expectedWidthRatio: number,
  expectedHeightRatio: number,
  tolerance: number = 0.03
): boolean {
  const actual = width / height;
  const expected = expectedWidthRatio / expectedHeightRatio;
  return Math.abs(actual - expected) <= expected * tolerance;
}

interface CompanyInfo {
  companyName: string;
  yearFounded: string;
  monthFounded: string;
  stateRegistered: string;
  businessEntityType: string;
  companyBioAndOverview: string;
}

interface CompanyType {
  businessModelType: string[];
  industryVertical: string;
}

interface Location {
  country: string;
  city: string;
  state: string;
  zip_code: string;
}

interface Team {
  team_size: string;
  work_style: string;
  founders_background: string;
}

interface ProductInformation {
  productStage: string;
  productType: string;
  subscriptionModel: string;
}

interface FundraisingStatus {
  currentCompleteFundraising: string;
  expectedRaiseNext12Months: string;
}

interface CurrentFundraising {
  fundingStage: string;
  targetInvestmentAmount: string;
}

interface RevenueStage {
  revenueStage: string;
  expectToBeGeneratingRevenue?: string;
  revenue?: string;
}

interface CompanyProfileData {
  companyId: string | null;
  info: CompanyInfo;
  company_type: CompanyType;
  location: Location;
  team: Team;
  productInformation: ProductInformation;
  fundraisingStatus: FundraisingStatus;
  currentFundraising: CurrentFundraising;
  revenueStage: RevenueStage;
  profile_image?: string;
  cover_image?: string;
}

interface CompanyProfileStore extends CompanyProfileData {
  isLoading: boolean;
  /** Why the last load failed; the profile page shows it instead of an empty form. */
  loadError: unknown;
  isSaving: boolean;
  isUploadingProfileImage: boolean;
  isUploadingCoverImage: boolean;

  setCompanyInfo: (info: Partial<CompanyInfo>) => void;
  setCompanyType: (type: Partial<CompanyType>) => void;
  setLocation: (location: Partial<Location>) => void;
  setTeam: (team: Partial<Team>) => void;
  setProductInformation: (product: Partial<ProductInformation>) => void;
  setFundraisingStatus: (status: Partial<FundraisingStatus>) => void;
  setCurrentFundraising: (fundraising: Partial<CurrentFundraising>) => void;
  setRevenueStage: (revenue: Partial<RevenueStage>) => void;
  setProfileImage: (imageUrl: string) => void;
  setCoverImage: (imageUrl: string) => void;

  uploadProfileImage: (file: File) => Promise<void>;
  uploadCoverImage: (file: File) => Promise<void>;

  resetStore: () => void;
  fetchCompanyProfile: (companyIdentifier: string) => Promise<void>;
  saveCompanyProfile: (companyId: string) => Promise<void>;

  isValid: () => boolean;
  getValidationErrors: () => string[];
}

const initialState: CompanyProfileData = {
  companyId: null,
  info: {
    companyName: "",
    yearFounded: "",
    monthFounded: "",
    stateRegistered: "",
    businessEntityType: "",
    companyBioAndOverview: "",
  },
  company_type: {
    businessModelType: [],
    industryVertical: "",
  },
  location: {
    country: "",
    city: "",
    state: "",
    zip_code: "",
  },
  team: {
    team_size: "",
    work_style: "",
    founders_background: "",
  },
  productInformation: {
    productStage: "",
    productType: "",
    subscriptionModel: "",
  },
  fundraisingStatus: {
    currentCompleteFundraising: "",
    expectedRaiseNext12Months: "",
  },
  currentFundraising: {
    fundingStage: "",
    targetInvestmentAmount: "",
  },
  revenueStage: {
    revenueStage: "",
    expectToBeGeneratingRevenue: "",
    revenue: "",
  },
  profile_image: "",
  cover_image: "",
};

export const useCompanyProfileStore = create<CompanyProfileStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      isLoading: false,
      loadError: null,
      isSaving: false,
      isUploadingProfileImage: false,
      isUploadingCoverImage: false,

      setCompanyInfo: (info) =>
        set((state) => ({
          info: { ...state.info, ...info },
        })),

      setCompanyType: (type) =>
        set((state) => ({
          company_type: { ...state.company_type, ...type },
        })),

      setLocation: (location) =>
        set((state) => ({
          location: { ...state.location, ...location },
        })),

      setTeam: (team) =>
        set((state) => ({
          team: { ...state.team, ...team },
        })),

      setProductInformation: (product) =>
        set((state) => ({
          productInformation: { ...state.productInformation, ...product },
        })),

      setFundraisingStatus: (status) =>
        set((state) => ({
          fundraisingStatus: { ...state.fundraisingStatus, ...status },
        })),

      setCurrentFundraising: (fundraising) =>
        set((state) => ({
          currentFundraising: { ...state.currentFundraising, ...fundraising },
        })),

      setRevenueStage: (revenue) =>
        set((state) => ({
          revenueStage: { ...state.revenueStage, ...revenue },
        })),

      setProfileImage: (imageUrl) =>
        set(() => ({
          profile_image: imageUrl,
        })),

      setCoverImage: (imageUrl) =>
        set(() => ({
          cover_image: imageUrl,
        })),

      uploadProfileImage: async (file: File) => {
        set({ isUploadingProfileImage: true });
        try {
          if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            set({ isUploadingProfileImage: false });
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            set({ isUploadingProfileImage: false });
            return;
          }

          const { width, height } = await loadImageDimensions(file);
          if (width < 400 || height < 400) {
            toast.error("Image must be at least 400x400 pixels");
            set({ isUploadingProfileImage: false });
            return;
          }
          if (!isAspectRatioApproximately(width, height, 1, 1)) {
            toast.error("Image must have a 1:1 aspect ratio");
            set({ isUploadingProfileImage: false });
            return;
          }

          const imageUrl = await uploadToS3(file, "company-profiles");

          const { companyId } = get();
          if (!companyId) {
            set({ profile_image: imageUrl, isUploadingProfileImage: false });
            toast.success("Profile image uploaded");
            return;
          }

          await Axios.post(`/auth/company/${companyId}/profile-image`, {
            profile_image_url: imageUrl,
          });

          set({ profile_image: imageUrl, isUploadingProfileImage: false });
          toast.success("Profile image updated successfully");
        } catch (error) {
          console.error("Error uploading profile image:", error);
          showApiErrorToast(error, "Failed to upload profile image");
          set({ isUploadingProfileImage: false });
          throw error;
        }
      },

      uploadCoverImage: async (file: File) => {
        console.log("uploadCoverImage called with file:", file.name);
        set({ isUploadingCoverImage: true });
        try {
          if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            set({ isUploadingCoverImage: false });
            return;
          }
          if (file.size > 8 * 1024 * 1024) {
            toast.error("Image size must be less than 8MB");
            set({ isUploadingCoverImage: false });
            return;
          }

          const { width, height } = await loadImageDimensions(file);
          if (width < 1120 || height < 480) {
            toast.error("Image must be at least 1120x480 pixels");
            set({ isUploadingCoverImage: false });
            return;
          }
          if (!isAspectRatioApproximately(width, height, 7, 3)) {
            toast.error("Image must have a 7:3 aspect ratio");
            set({ isUploadingCoverImage: false });
            return;
          }

          const imageUrl = await uploadToS3(file, "company-covers");

          const { companyId } = get();
          if (!companyId) {
            set({ cover_image: imageUrl, isUploadingCoverImage: false });
            toast.success("Cover image uploaded");
            return;
          }

          await Axios.post(`/auth/company/${companyId}/profile-image`, {
            cover_image_url: imageUrl,
          });

          set({ cover_image: imageUrl, isUploadingCoverImage: false });
          toast.success("Cover image updated successfully");
        } catch (error) {
          console.error("Error uploading cover image:", error);
          showApiErrorToast(error, "Failed to upload cover image");
          set({ isUploadingCoverImage: false });
          throw error;
        }
      },

      resetStore: () =>
        set({ ...initialState, isLoading: false, loadError: null, isSaving: false, isUploadingProfileImage: false, isUploadingCoverImage: false }),

      fetchCompanyProfile: async (companyIdentifier: string) => {
        set({ isLoading: true, loadError: null });
        try {
          const response = await Axios.get(`/auth/company/${companyIdentifier}`);
          const data = response.data;
          console.log("data", data);

          set({
            companyId: companyIdentifier,
            info: {
              companyName: data.info?.company_name || data.company_name || "",
              yearFounded: data.info?.year_founded?.toString() || "",
              monthFounded: data.info?.month_founded?.toString() || "",
              stateRegistered: data.info?.state_registered || "",
              businessEntityType: data.info?.business_entity_type || "",
              companyBioAndOverview: data.info?.company_bio || "",
            },
            company_type: {
              businessModelType: data.company_type?.business_model_type || (data.company_type?.business_model ? [data.company_type.business_model] : []),
              industryVertical: data.company_type?.industry_vertical || "",
            },
            location: {
              country: data.location?.country || "",
              city: data.location?.city || "",
              state: data.location?.state || "",
              zip_code: data.location?.zip_code || "",
            },
            team: {
              team_size: data.team?.size?.toString() || "",
              work_style: data.team?.work_style || "",
              founders_background: data.team?.founders_background || data.founders?.map((f: any) => f.background).filter(Boolean).join("\n") || "",
            },
            productInformation: {
              productStage: data.product_information?.productStage || "",
              productType: data.product_information?.productType || "",
              subscriptionModel: data.product_information?.subscriptionModel || "",
            },
            fundraisingStatus: {
              currentCompleteFundraising: data.fundraising_status?.currentCompleteFundraising || "",
              expectedRaiseNext12Months: data.fundraising_status?.expectedRaiseNext12Months || "",
            },
            currentFundraising: {
              fundingStage: data.current_fundraising?.fundingStage || "",
              targetInvestmentAmount: data.current_fundraising?.targetInvestmentAmount || "",
            },
            revenueStage: {
              revenueStage: data.revenue_stage?.revenueStage?.[0] || "",
              expectToBeGeneratingRevenue:
                data.revenue_stage?.pre_revenue?.expectToBeGeneratingRevenue || "",
              revenue: data.revenue_stage?.post_revenue?.revenue || "",
            },
            profile_image: data.profile_image || "",
            cover_image: data.cover_image || "",
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching company profile:", error);
          set({ isLoading: false, loadError: error });
        }
      },

      saveCompanyProfile: async (companyId: string) => {
        const state = get();
        console.log("Store saveCompanyProfile called with:", { companyId, state });
        set({ isSaving: true });

        try {
          const apiPayload = {
            companyName: state.info.companyName || "Default Company",
            yearFounded: state.info.yearFounded || "2024",
            monthFounded: state.info.monthFounded || "1",
            stateRegistered: state.info.stateRegistered || "CA",
            businessEntityType: state.info.businessEntityType || "LLC",
            companyBioAndOverview: state.info.companyBioAndOverview || "Default bio",

            businessModelType:
              state.company_type.businessModelType.length > 0
                ? state.company_type.businessModelType
                : ["B2B"],
            industryVertical: state.company_type.industryVertical || "Technology",

            country: state.location.country || "United States",
            city: state.location.city || "San Francisco",
            state: state.location.state || "CA",
            zip_code: state.location.zip_code || "94105",

            team_size: parseInt(state.team.team_size?.replace("+", "") || "1"),
            work_style: (state.team.work_style || "remote").toLowerCase(),
            founders_background: state.team.founders_background || "Default founders background",

            productInformation: {
              productStage: state.productInformation.productStage || "concept",
              productType: state.productInformation.productType || "software",
              subscriptionModel: state.productInformation.subscriptionModel || "no",
            },

            fundraisingStatus: {
              currentCompleteFundraising:
                state.fundraisingStatus.currentCompleteFundraising || "none",
              expectedRaiseNext12Months: state.fundraisingStatus.expectedRaiseNext12Months || "no",
            },

            currentFundraising: {
              fundingStage: state.currentFundraising.fundingStage || "pre-seed",
              targetInvestmentAmount: state.currentFundraising.targetInvestmentAmount || "50000",
            },

            revenueStage: {
              revenueStage: [state.revenueStage.revenueStage || "pre-revenue"],
              pre_revenue:
                state.revenueStage.revenueStage === "pre-revenue"
                  ? {
                    expectToBeGeneratingRevenue:
                      state.revenueStage.expectToBeGeneratingRevenue || "12-24",
                  }
                  : undefined,
              post_revenue:
                state.revenueStage.revenueStage === "post-revenue"
                  ? {
                    revenue: state.revenueStage.revenue || "0-10000",
                  }
                  : undefined,
            },

            profile_image: state.profile_image || "",
            cover_image: state.cover_image || "",
          };

          await Axios.put(`/auth/onboarding/company?company_id=${companyId}`, apiPayload);

          toast.success("Company profile updated successfully");
          set({ isSaving: false });
        } catch (error: unknown) {
          console.error("Error saving company profile:", error);

          showApiErrorToast(error, "Failed to update company profile");
          set({ isSaving: false });
          throw error;
        }
      },

      isValid: () => {
        return true;
      },

      getValidationErrors: () => {
        return [];
      },
    }),
    {
      name: "company-profile-storage",
      partialize: (state) => ({
        companyId: state.companyId,
        info: state.info,
        company_type: state.company_type,
        location: state.location,
        team: state.team,
        productInformation: state.productInformation,
        fundraisingStatus: state.fundraisingStatus,
        currentFundraising: state.currentFundraising,
        revenueStage: state.revenueStage,
        profile_image: state.profile_image,
        cover_image: state.cover_image,
      }),
    }
  )
);
