import { useQuery } from "@tanstack/react-query";

import { Axios } from "@/app/config/axios";

interface UserLocation {
  city: string;
  state: string;
  country: string;
  zip_code: string;
}

interface UserSocial {
  linkedin_profile: string;
}

interface UserEducation {
  university_name: string;
  highest_level_completed: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  disabled: boolean;
  roles: string[];
  created_at: string;
  last_login: string;
  email_verified: boolean;
  verification_token: string | null;
  google_id: string | null;
  password_reset_token: string | null;
  password_reset_expires: string | null;
  location: UserLocation;
  social: UserSocial;
  education: UserEducation;
  profile_image: string;
  onboarding_completed: boolean;
  company_id: string;
}

const fetchUserDetails = async (): Promise<User> => {
  const response = await Axios.get("/auth/me");
  return response.data;
};

export const useMe = () => {
  return useQuery({
    queryKey: ["user"],
    queryFn: fetchUserDetails,
  });
};
