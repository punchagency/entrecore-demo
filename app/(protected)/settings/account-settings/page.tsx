import { Button } from "@/components/ui/button";
import EmailForm from "@/components/email-form";
import PasswordForm from "@/components/pass-form";
import DelinkAccount from "@/components/delink-account";
import { UserMinus } from "lucide-react";

export default function AccountSettingsPage() {
  return (
    <div className="flex flex-col gap-10">
      {/* Login & Signup Section */}
      <div id="login-signup" className="flex flex-col gap-6 scroll-mt-32">
        <div>
          <h1 className="text-xl font-bold text-[#1e1b4b] mb-1">Login & Signup</h1>
          <p className="text-sm text-gray-500">Manage your authentication methods</p>
        </div>

        <div className="flex flex-col gap-6">
          <EmailForm />
          <PasswordForm />
        </div>
      </div>

      {/* Additional Settings Section */}
      <div id="additional-settings" className="flex flex-col gap-6 scroll-mt-32 mt-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e1b4b] mb-1">Additional Settings</h1>
          <p className="text-sm text-gray-500">Other account management options</p>
        </div>

        <div className="flex flex-col gap-6">
          <DelinkAccount />

          {/* Delete Account Card */}
          <div className="account-section-card border-red-100">
            <div className="account-section-header bg-gradient-to-r from-red-50 to-white border-red-100">
              <div className="account-section-icon !bg-red-100 !text-red-600">
                <UserMinus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="account-section-title text-red-900">Danger Zone</h2>
                <p className="account-section-desc text-red-600/80">Permanently remove your account</p>
              </div>
            </div>
            <div className="account-section-body">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[#1e1b4b] mb-1">Delete Account</h3>
                  <p className="text-sm text-gray-500">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="whitespace-nowrap text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors font-semibold"
                >
                  Delete My User Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
