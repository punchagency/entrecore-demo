import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Axios } from '../config/axios';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  username: string;
  company_id: string;
  company_role?: string | null;
  created_at: string;
  disabled: boolean;
  education: Education;
  email_verified: boolean;
  google_id: string | null;
  hashed_password: string | null;
  last_login: string;
  location: Location;
  onboarding_completed: boolean;
  password_reset_expires: string | null;
  password_reset_token: string | null;
  phone_number: string | null;
  profile_image: string | null;
  roles: string[];
  social: Social;
  verification_token: string | null;
  version: number;
  active_company: string;
  is_superadmin_company: boolean;
  platform_role?: string | null;
  support_session?: boolean;
  support_scope?: string | null;
  support_expires_at?: string | null;
}

interface Education {
  university_name: string;
  highest_level_completed: string;
}

interface Location {
  city: string;
  state: string;
  country: string;
  zip_code: string;
}

interface Social {
  linkedin_profile: string;
}

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      
      fetchUser: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await Axios.get('/auth/me');
          set({ user: response.data, isLoading: false });
          return response.data;
        } catch (error) {
          
          console.error('Error fetching user:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch user', 
            isLoading: false 
          });
        }
      },
      
      setUser: (user) => set({ user }),
      
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'user-storage', 
      partialize: (state) => ({ user: state.user }),
    }
  )
);