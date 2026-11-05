"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { Camera, ChevronDown, ChevronLeft, Upload, X, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/app/store/userStore";
import { useCompaniesStore } from "@/app/store/companiesStore";
import PlaceholderImage from "@/components/ui/placeholder-image";
import { useCompanyProfileStore } from "@/app/store/companyProfileStore";
import { QueryErrorState } from "@/components/query-error-state";

import {
  Dialog,
  DialogClose,
  DialogTitle,
  DialogHeader,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

export default function CompanyProfilePage({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const companyId = params?.companyId as string;
  const pathname = usePathname() ?? "";
  const {user} = useUserStore();
  const { companies, isLoading: companiesLoading, fetchCompanies } = useCompaniesStore();
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const {
    saveCompanyProfile,
    isSaving,
    isValid,
    getValidationErrors,
    profile_image,  
    cover_image,
    uploadProfileImage,
    uploadCoverImage,
    isUploadingProfileImage,
    isUploadingCoverImage,
    info,
    fetchCompanyProfile,
    resetStore,
    isLoading,
    loadError,
    companyId: companyIdInStore,
  } = useCompanyProfileStore();

  
  useEffect(() => {
    setSavedCompanyId(localStorage.getItem('selectedCompanyId' )||user?.active_company||null);
  }, []);

  const showLoading = isLoading || companyId !== companyIdInStore;

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);


  useEffect(() => {
    if (companyId) {
      resetStore();
      fetchCompanyProfile(companyId);
    }
  }, [companyId, fetchCompanyProfile, resetStore]);

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadProfileImage(file);
      } catch (error) {
        console.error("Failed to upload profile image:", error);
      }
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Cover image upload started:", file.name);
      try {
        await uploadCoverImage(file);
        console.log("Cover image upload completed successfully");
      } catch (error) {
        console.error("Failed to upload cover image:", error);
      }
    }
  };

  const tabs = [
    { name: "Company", href: `/settings/company-profile/${companyId}` },
    { name: "Fundraising", href: `/settings/company-profile/${companyId}/fundraising` },
    { name: "Product", href: `/settings/company-profile/${companyId}/product` },
    { name: "Financial", href: `/settings/company-profile/${companyId}/financial` },
  ];

  const handleSaveChanges = async () => {
    console.log("Save button clicked");

    if (!savedCompanyId) {
      console.error("No company ID found");
      return;
    }

    if (!isValid()) {
      const errors = getValidationErrors();
      console.warn("Validation failed:", errors);
      errors.forEach((error) => {
        console.warn("Validation error:", error);
      });
      const { toast } = await import("sonner");
      toast.error(`Validation failed: ${errors.join(", ")}`);
      return;
    }

    console.log("Validation passed, calling API...");
    try {
      await saveCompanyProfile(companyId);
      console.log("Save completed successfully");
    } catch (error) {
      console.error("Failed to save company profile:", error);
    }
  };

  if (companiesLoading) {
    return (
      <div className="bg-white">
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-[#D9DBDD] bg-[#EFF4FF]">
          <Link href="/settings" className="text-sm font-bold flex items-center gap-2">
            <ChevronLeft />
            Company Profile
          </Link>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-20 h-20 bg-[#EEF4FF] rounded-full flex items-center justify-center mx-auto mb-6">
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!companiesLoading && companies.length === 0) {
    return (
      <div className="bg-white">
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-[#D9DBDD] bg-[#EFF4FF]">
          <Link href="/settings" className="text-sm font-bold flex items-center gap-2">
            <ChevronLeft />
            Company Profile
          </Link>
          <Link href="/onboarding/company">
            <Button className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              Create Company
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <div className="w-20 h-20 bg-[#EEF4FF] rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="h-10 w-10 text-[#2563EB]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Company Found</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                You need to create a company to manage your profile. This will help you organize
                your workspace and manage your data effectively.
              </p>
              <Link href="/onboarding/company">
                <Button className="bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-2.5 text-sm font-medium rounded-lg transition-colors">
                  Create Your First Company
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white">
      <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-[#D9DBDD] bg-[#EFF4FF]">
        <Link href="/settings" className="text-sm font-bold flex items-center gap-2">
          {" "}
          <ChevronLeft />
          Company Profile
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center text-sm font-bold bg-white p-0  has-[>svg]:!px-1 "
            >
              <div className="flex items-center">
                {showLoading ? (
                  <Skeleton className="h-[30px] w-[30px] rounded-full" />
                ) : profile_image ? (
                  <Image
                    src={profile_image}
                    alt="Company Profile"
                    width={30}
                    height={30}
                    className="rounded-full"
                  />
                ) : (
                  <PlaceholderImage name={info.companyName} size="sm" type="profile" /> 
                )}
                <span className="mx-2">
                  {showLoading ? <Skeleton className="h-4 w-24" /> : info.companyName}
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="sm:w-[200px]">
            {companies.map((company) => (
              <DropdownMenuItem key={company.id} asChild>
                <Link href={`/settings/company-profile/${company.id}`}>
                  {company.company_name || company?.info?.company_name}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Link href="/settings" className="text-primary font-medium">
                Manage Companies
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="relative p-4 sm:p-6">
        {showLoading ? (
          <Skeleton className="w-full h-[25vw] rounded-t-md" />
        ) : cover_image && cover_image.split("/").length !== 0 ? (
          <Image
            key={cover_image}
            src={cover_image}
            alt="Company Cover Image"
            className="w-full h-[25vw] object-cover rounded-t-md"
            width={1120}
            height={480}
            priority
          />
        ) : (
          <PlaceholderImage
            name={info.companyName}
            type="cover"
            className="w-full h-[25vw] rounded-t-md"
          />
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="absolute top-6 right-6 sm:right-8 sm:top-8 lg:right-10 text-xs lg:text-base lg:top-10 bg-white hover:bg-white/80 text-black rounded-sm"
              size="sm"
            >
              <Camera className="mr-1 lg:mr-2 h-3 w-3 lg:h-6 lg:w-6" />
              Edit Images
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[60vh] ">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold">
                Company Profile Images
              </DialogTitle>
              <DialogClose className="absolute right-4 top-4">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-[#EFF4FF] p-4 rounded-md">
                <h3 className="text-primary font-[600] mb-4">Profile Image</h3>
                <div className="flex items-center justify-between flex-col sm:flex-row">
                  <div className="flex items-center gap-6 sm:gap-2 flex-col sm:flex-row w-full mb-4 sm:pb-0">
                    <label
                      htmlFor="profile-image-upload"
                      className="flex items-center justify-center shrink-0 w-full sm:w-auto gap-2 border border-gray-300 rounded px-4 py-2 bg-white cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="h-4 w-4 " />
                      <span className="text-sm font-[600]">
                        {isUploadingProfileImage ? "Uploading..." : "Select Image"}
                      </span>
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfileImageUpload}
                        disabled={isUploadingProfileImage}
                      />
                    </label>
                    <div className=" text-xs sm:text-sm w-full text-soft-black sm:border-l border-gray-300 sm:pl-4 sm:ml-2 ">
                      Min. 400×400px
                      <br />
                      1:1 Aspect Ratio
                    </div>
                  </div>
                  <div className="sm:w-16 sm:h-16 h-32 rounded overflow-hidden flex items-center justify-center w-full sm:w-auto border border-dashed">
                    {profile_image ? (
                      <Image
                        src={profile_image}
                        alt="Profile preview"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div className="bg-[#EFF4FF] p-4 rounded-md ">
                <h3 className="text-primary font-[600] mb-4">Cover Image</h3>
                <div className="flex items-center justify-between flex-col sm:flex-row">
                  <div className="flex items-center gap-6 sm:gap-2 flex-col sm:flex-row w-full mb-4 sm:pb-0">
                    <label
                      htmlFor="cover-image-upload"
                      className="flex items-center justify-center shrink-0 w-full sm:w-auto gap-2 border border-gray-300 rounded px-4 py-2 bg-white cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-[600]">
                        {isUploadingCoverImage ? "Uploading..." : "Select Image"}
                      </span>
                      <input
                        id="cover-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverImageUpload}
                        disabled={isUploadingCoverImage}
                      />
                    </label>
                    <div className="text-xs sm:text-sm w-full text-soft-black sm:border-l border-gray-300 sm:pl-4 sm:ml-2 ">
                      Min. 1120×480px
                      <br />
                      7:3 Aspect Ratio
                    </div>
                  </div>
                  <div className="sm:w-36 sm:h-16 h-32 rounded overflow-hidden flex items-center justify-center w-full sm:w-auto border border-dashed">
                    {cover_image ? (
                      <Image
                        src={cover_image}
                        alt="Cover preview"
                        width={128}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Profile Photo Circle */}
        <div className="absolute -bottom-12 left-5 ">
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
              {showLoading ? (
                <Skeleton className="w-full h-full rounded-full" />
              ) : profile_image ? (
                <Image
                  src={profile_image}
                  alt="Company profile"
                  fill
                  className="object-cover w-24 h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 rounded-full border-4 border-white"
                />
              ) : (
                <PlaceholderImage
                  name={info.companyName}
                  size="lg"
                  type="profile"
                  className="w-24 h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 rounded-full border-4 border-white"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <h1 className="text-lg lg:text-2xl font-bold mb-4 ml-32 md:ml-44 lg:ml-58">
          {showLoading ? <Skeleton className="h-8 w-48" /> : info.companyName}
        </h1>
        <div className="border-b border-gray-200  mt-10">
          <nav className="flex px-4 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`py-4 mx-4 text-sm font-bold border-b-2 ${
                    isActive
                      ? "border-[#3064F6] text-primary"
                      : "border-transparent text-soft-black "
                  }`}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="bg-[#EFF4FF] h-full">
        <div className="flex justify-between items-center border-b border-[#D9DBDD] px-6 py-3 sm:py-4">
          <h1 className="text-base lg:text-xl font-bold">
            {tabs.find((tab) => tab.href === pathname)?.name}
          </h1>
          <Button
            onClick={handleSaveChanges}
            disabled={
              isSaving || isUploadingProfileImage || isUploadingCoverImage || loadError != null
            }
            className="bg-primary text-white hover:bg-primary/90 min-w-32"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
        {loadError != null && !isLoading ? (
          <QueryErrorState
            error={loadError}
            title="Couldn't load the company profile"
            onRetry={() => fetchCompanyProfile(companyId)}
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
