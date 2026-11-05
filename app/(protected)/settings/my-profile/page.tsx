"use client";

import * as z from "zod";
import usMap from "@/public/us-map.json";
import Image from "next/image";
import { toast } from "sonner";
import { getApiError, showApiErrorToast } from "@/utils/api-error";
import { Camera, User, MapPin, Linkedin, GraduationCap, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";

import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Axios } from "@/app/config/axios";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { uploadToS3 } from "@/utils/s3-utils";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/app/store/userStore";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  location: z.object({
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State/Province is required"),
    country: z.string().min(1, "Country is required"),
    zip_code: z.string().min(1, "Zip/Postal code is required"),
  }),
  social: z.object({
    linkedin_profile: z
      .string()
      .url("Please enter a valid LinkedIn URL")
      .optional()
      .or(z.literal("")),
  }),
  education: z.object({
    university_name: z.string().min(1, "University name is required"),
    highest_level_completed: z.string().min(1, "Education level is required"),
  }),
  profile_image: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const canadianProvinces = [
  { id: "AB", name: "Alberta" },
  { id: "BC", name: "British Columbia" },
  { id: "MB", name: "Manitoba" },
  { id: "NB", name: "New Brunswick" },
  { id: "NL", name: "Newfoundland and Labrador" },
  { id: "NS", name: "Nova Scotia" },
  { id: "NT", name: "Northwest Territories" },
  { id: "NU", name: "Nunavut" },
  { id: "ON", name: "Ontario" },
  { id: "PE", name: "Prince Edward Island" },
  { id: "QC", name: "Quebec" },
  { id: "SK", name: "Saskatchewan" },
  { id: "YT", name: "Yukon" },
];

// --- Sub-components ---

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SectionCard = ({ icon, title, description, children }: SectionCardProps) => (
  <div className="profile-section-card">
    <div className="profile-section-header">
      <div className="profile-section-icon">{icon}</div>
      <div>
        <h2 className="profile-section-title">{title}</h2>
        {description && <p className="profile-section-desc">{description}</p>}
      </div>
    </div>
    <div className="profile-section-body">{children}</div>
  </div>
);

// --- Main Component ---

const MyProfilePage = () => {
  const { user, fetchUser, isLoading } = useUserStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  const getFormDefaults = () => ({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    location: {
      city: user?.location?.city || "",
      state: user?.location?.state || "",
      country: user?.location?.country || "United States",
      zip_code: user?.location?.zip_code || "",
    },
    social: {
      linkedin_profile: user?.social?.linkedin_profile || "",
    },
    education: {
      university_name: user?.education?.university_name || "",
      highest_level_completed: user?.education?.highest_level_completed || "",
    },
    profile_image: user?.profile_image || "",
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: getFormDefaults(),
  });

  const { isDirty } = form.formState;
  const hasImageChanged = selectedFile !== null;
  const hasChanges = isDirty || hasImageChanged;

  useEffect(() => {
    if (user) {
      const newDefaults = getFormDefaults();
      form.reset(newDefaults);
      setImagePreview(user.profile_image || null);
      setSelectedFile(null);

      setTimeout(() => {
        form.setValue("location.state", user.location?.state || "");
        form.setValue(
          "education.highest_level_completed",
          user.education?.highest_level_completed || ""
        );
        form.reset(form.getValues(), { keepValues: true });
      }, 100);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData & { profile_image?: string }) => {
      return await Axios.put("/auth/me", data);
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setApiError(null);
      fetchUser();
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setApiError(null);

    if (!file.type.startsWith("image/")) {
      const error = "Please select a valid image file (JPG, PNG, GIF, etc.)";
      setApiError(error);
      toast.error(error);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const error = "Image size must be less than 5MB";
      setApiError(error);
      toast.error(error);
      return;
    }

    const img = document.createElement("img");
    img.onload = () => {
      if (img.width < 400 || img.height < 400) {
        const error = "Image must be at least 400x400 pixels";
        setApiError(error);
        toast.error(error);
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        const error = "Failed to read image file";
        setApiError(error);
        toast.error(error);
      };
      reader.readAsDataURL(file);
    };

    img.onerror = () => {
      const error = "Invalid image file";
      setApiError(error);
      toast.error(error);
    };

    img.src = URL.createObjectURL(file);
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      let profileImageUrl = data.profile_image;

      if (selectedFile) {
        try {
          setIsImageUploading(true);
          toast.loading("Uploading image...", { id: "image-upload" });

          profileImageUrl = await uploadToS3(selectedFile, "profile-images");

          toast.dismiss("image-upload");
          toast.success("Image uploaded successfully");
        } catch (uploadError: any) {
          toast.dismiss("image-upload");
          console.error("Image upload error:", uploadError);

          setApiError(getApiError(uploadError, "Failed to upload image").message);
          showApiErrorToast(uploadError, "Failed to upload image");
          return;
        } finally {
          setIsImageUploading(false);
        }
      }

      updateProfileMutation.mutate(
        {
          ...data,
          profile_image: profileImageUrl,
        },
        {
          onError: (error: any) => {
            console.error("Profile update error:", error);

            setApiError(getApiError(error, "Failed to update profile").message);
            showApiErrorToast(error, "Failed to update profile");
            setIsSubmitting(false);
          },
          onSettled: () => {
            setIsSubmitting(false);
          },
        }
      );
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setApiError(getApiError(error, "Failed to update profile").message);
      showApiErrorToast(error, "Failed to update profile");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-inner">
          <Loader2 className="profile-loading-icon" />
          <p className="profile-loading-text">Loading your profile…</p>
        </div>
      </div>
    );
  }

  const initials =
    `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U";

  return (
    <>
      <style>{`
        /* ── Page shell ── */
        .profile-page {
          min-height: 100vh;
          background: #EFF4FF;
          padding-bottom: 3rem;
        }

        /* ── Sticky header bar ── */
        .profile-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: rgba(239, 244, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(99, 102, 241, 0.12);
        }
        .profile-topbar-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e1b4b;
          letter-spacing: -0.3px;
        }
        .profile-save-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 1.25rem;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }
        .profile-save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
        }
        .profile-save-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .profile-save-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* ── Content wrapper ── */
        .profile-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2.5rem 2rem 0;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* ── Avatar hero card ── */
        .profile-avatar-card {
          background: white;
          border-radius: 20px;
          padding: 2rem 2.5rem;
          display: flex;
          align-items: center;
          gap: 2rem;
          box-shadow: 0 2px 16px rgba(99, 102, 241, 0.08), 0 1px 4px rgba(0,0,0,0.04);
          border: 1px solid rgba(99, 102, 241, 0.1);
        }
        .profile-avatar-wrap {
          position: relative;
          flex-shrink: 0;
          cursor: pointer;
        }
        .profile-avatar-img {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #e0e7ff;
          transition: filter 0.2s ease;
        }
        .profile-avatar-placeholder {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 700;
          color: #4f46e5;
          border: 3px solid #e0e7ff;
          transition: filter 0.2s ease;
          user-select: none;
        }
        .profile-avatar-overlay {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(79, 70, 229, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }
        .profile-avatar-wrap:hover .profile-avatar-overlay {
          opacity: 1;
        }
        .profile-avatar-info h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e1b4b;
          margin: 0 0 0.25rem;
        }
        .profile-avatar-info p {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0 0 1rem;
        }
        .profile-avatar-upload-label {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 1rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          background: #f0f0ff;
          color: #4f46e5;
          border: 1px solid #c7d2fe;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .profile-avatar-upload-label:hover {
          background: #e0e7ff;
          border-color: #a5b4fc;
        }
        .profile-avatar-hint {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 0.4rem;
        }

        /* ── Section cards ── */
        .profile-section-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 16px rgba(99, 102, 241, 0.07), 0 1px 4px rgba(0,0,0,0.03);
          border: 1px solid rgba(99, 102, 241, 0.09);
        }
        .profile-section-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 1.25rem 2rem;
          border-bottom: 1px solid #f3f4f6;
          background: linear-gradient(to right, #fafafe, #fff);
        }
        .profile-section-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4f46e5;
          flex-shrink: 0;
        }
        .profile-section-title {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #1e1b4b;
          margin: 0;
        }
        .profile-section-desc {
          font-size: 0.8125rem;
          color: #9ca3af;
          margin: 0.1rem 0 0;
        }
        .profile-section-body {
          padding: 1.75rem 2rem;
        }

        /* ── Form grid ── */
        .profile-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }
        .profile-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        @media (max-width: 640px) {
          .profile-grid-2,
          .profile-grid-4 {
            grid-template-columns: 1fr;
          }
          .profile-avatar-card {
            flex-direction: column;
            text-align: center;
            padding: 1.5rem;
          }
          .profile-section-body {
            padding: 1.25rem;
          }
          .profile-section-header {
            padding: 1rem 1.25rem;
          }
          .profile-content {
            padding: 1.5rem 1rem 0;
          }
        }

        /* ── Form field label ── */
        .profile-field-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.45rem;
        }

        /* ── Loading ── */
        .profile-loading {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #EFF4FF;
        }
        .profile-loading-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .profile-loading-icon {
          width: 2rem;
          height: 2rem;
          color: #6366f1;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .profile-loading-text {
          font-size: 0.9375rem;
          color: #6b7280;
          font-weight: 500;
        }

        /* ── Input/Select base overrides for a crisper look ── */
        .profile-section-body input,
        .profile-section-body [data-radix-select-trigger] {
          border-radius: 10px !important;
          border-color: #e5e7eb !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
        }
        .profile-section-body input:focus,
        .profile-section-body [data-radix-select-trigger]:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
          outline: none !important;
        }
      `}</style>

      <div className="profile-page">
        {/* Sticky top bar */}
        <div className="profile-topbar">
          <span className="profile-topbar-title">My Profile</span>
          <button
            className="profile-save-btn"
            onClick={() => onSubmit(form.getValues())}
            disabled={isSubmitting || !hasChanges || isImageUploading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : isImageUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Save Changes
              </>
            )}
          </button>
        </div>

        <div className="profile-content">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="profile-form">

              {/* ── Avatar hero card ── */}
              <div className="profile-avatar-card">
                <div>
                  <Input
                    type="file"
                    className="hidden"
                    id="file-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <label
                    htmlFor="file-upload"
                    className="profile-avatar-wrap"
                    onMouseEnter={() => setIsHoveringAvatar(true)}
                    onMouseLeave={() => setIsHoveringAvatar(false)}
                    style={{ display: "block" }}
                  >
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Profile preview"
                        width={88}
                        height={88}
                        className="profile-avatar-img"
                        style={{ filter: isHoveringAvatar ? "brightness(0.75)" : "none" }}
                        onClick={(e) => { e.preventDefault(); setIsImageDialogOpen(true); }}
                      />
                    ) : (
                      <div
                        className="profile-avatar-placeholder"
                        style={{ filter: isHoveringAvatar ? "brightness(0.88)" : "none" }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="profile-avatar-overlay">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </label>
                </div>

                <div className="profile-avatar-info">
                  <h3>{user.first_name || "Your"} {user.last_name || "Name"}</h3>
                  <p>{user.email || "No email on record"}</p>
                  <label htmlFor="file-upload" className="profile-avatar-upload-label">
                    <Camera className="w-3.5 h-3.5" />
                    Change Photo
                  </label>
                  <p className="profile-avatar-hint">Min. 400×400px · Max 5MB · 1:1 ratio</p>
                </div>
              </div>

              {/* ── Name section ── */}
              <SectionCard
                icon={<User className="w-4 h-4" />}
                title="Personal Information"
                description="Your basic identity details"
              >
                <div className="profile-grid-2">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <label className="profile-field-label">First Name</label>
                        <FormControl>
                          <Input placeholder="First Name" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <label className="profile-field-label">Last Name</label>
                        <FormControl>
                          <Input placeholder="Last Name" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              {/* ── Location section ── */}
              <SectionCard
                icon={<MapPin className="w-4 h-4" />}
                title="Location"
                description="Where are you based?"
              >
                <div className="profile-grid-4">
                  <FormField
                    control={form.control}
                    name="location.country"
                    render={({ field }) => (
                      <FormItem>
                        <label className="profile-field-label">Country</label>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue("location.state", "");
                            }}
                            value={field.value || ""}
                          >
                            <SelectTrigger className="w-full" size="lg">
                              <SelectValue placeholder="Country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="United States">United States</SelectItem>
                              <SelectItem value="Canada">Canada</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location.state"
                    render={({ field }) => (
                      <FormItem>
                        <label className="profile-field-label">
                          {form.watch("location.country") === "Canada" ? "Province" : "State"}
                        </label>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            key={`state-${user?.location?.state || "empty"}`}
                          >
                            <SelectTrigger className="w-full" size="lg">
                              <SelectValue
                                placeholder={
                                  form.watch("location.country") === "Canada"
                                    ? "Province"
                                    : "State"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent className="max-h-96 overflow-y-auto">
                              {form.watch("location.country") === "Canada" ? (
                                canadianProvinces
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((province) => (
                                    <SelectItem key={province.id} value={province.name}>
                                      {province.name}
                                    </SelectItem>
                                  ))
                              ) : (
                                usMap.objects.states.geometries
                                  .map((state: any) => ({
                                    id: state.id,
                                    name: state.properties.name,
                                  }))
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((state) => (
                                    <SelectItem key={state.id} value={state.name}>
                                      {state.name}
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location.city"
                    render={({ field }) => (
                      <FormItem>
                        <label className="profile-field-label">City</label>
                        <FormControl>
                          <Input placeholder="City" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location.zip_code"
                    render={({ field }) => (
                      <FormItem>
                        <label className="profile-field-label">
                          {form.watch("location.country") === "Canada" ? "Postal Code" : "Zip Code"}
                        </label>
                        <FormControl>
                          <Input placeholder="Zip Code" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              {/* ── Social section ── */}
              <SectionCard
                icon={<Linkedin className="w-4 h-4" />}
                title="Social"
                description="Connect your professional profiles"
              >
                <FormField
                  control={form.control}
                  name="social.linkedin_profile"
                  render={({ field }) => (
                    <FormItem>
                      <label className="profile-field-label">LinkedIn Profile URL</label>
                      <FormControl>
                        <Input
                          placeholder="https://www.linkedin.com/in/..."
                          className="w-full h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SectionCard>

              {/* ── Education section ── */}
              <SectionCard
                icon={<GraduationCap className="w-4 h-4" />}
                title="Education"
                description="Your academic background"
              >
                <div className="profile-grid-2">
                  <FormField
                    control={form.control}
                    name="education.university_name"
                    render={({ field }) => (
                      <FormItem>
                        <label className="profile-field-label">University</label>
                        <FormControl>
                          <Input placeholder="University" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="education.highest_level_completed"
                    render={({ field }) => (
                      <FormItem>
                        <label className="profile-field-label">Highest Level Completed</label>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            key={`education-${user?.education?.highest_level_completed || "empty"}`}
                          >
                            <SelectTrigger className="w-full" size="lg">
                              <SelectValue placeholder="Select One" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High School Diploma">High School Diploma</SelectItem>
                              <SelectItem value="Associate's Degree">Associate's Degree</SelectItem>
                              <SelectItem value="Bachelor's Degree">Bachelor's Degree</SelectItem>
                              <SelectItem value="Master's Degree">Master's Degree</SelectItem>
                              <SelectItem value="Ph.D.">Ph.D.</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

            </form>
          </Form>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          <div className="relative flex items-center justify-center">
            {imagePreview && (
              <Image
                src={imagePreview}
                alt="Zoomed profile preview"
                width={800}
                height={800}
                className="max-h-[90vh] max-w-full object-contain rounded-2xl"
              />
            )}
            <button
              onClick={() => setIsImageDialogOpen(false)}
              className="absolute -top-3 -right-3 bg-black/50 hover:bg-black rounded-full p-1 transition-all opacity-50 hover:opacity-100"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyProfilePage;
