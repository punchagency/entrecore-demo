import Logo from "@/public/svgs/logo";
import { Button } from "@/components/ui/button";

interface AuthHeaderProps {
  buttonText?: string;
  showOnboardingButtons?: boolean;
  onButtonClick?: () => void;
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
}

const AuthHeader = ({
  buttonText = "Login",
  showOnboardingButtons = false,
  onButtonClick,
  currentTab,
  setCurrentTab,
}: AuthHeaderProps) => {
  return (
    <div className="flex h-[70.003px] justify-between items-center" suppressHydrationWarning>
      <Logo />

      <div className="flex items-center gap-4 h-full" suppressHydrationWarning>
        {showOnboardingButtons && (
            <div className="flex items-center gap-4 bg-[#EFF4FF] rounded-[60px]">
              <Button
                onClick={() => setCurrentTab?.("You")}
                className={`text-gray-600 bg-transparent font-medium  px-10 sm:px-12 cursor-pointer hover:bg-transparent transition-all duration-300 ${currentTab === "You" ? "bg-primary text-white rounded-[60px] py-[0.313vw]" : ""}`}
              >
                You
              </Button>
              <Button
                onClick={() => setCurrentTab?.("Company")}
                className={`text-gray-600 bg-transparent font-medium  px-10 sm:px-12 cursor-pointer hover:bg-transparent transition-all duration-300 ${currentTab === "Company" ? "bg-primary text-white rounded-[60px] py-[0.313vw]" : ""}`}
              >
                Company
              </Button>
              <Button
                onClick={() => setCurrentTab?.("Link Account")}
                className={`text-gray-600 bg-transparent font-medium px-10 sm:px-12 cursor-pointer hover:bg-transparent transition-all duration-300 ${currentTab === "Link Account" ? "bg-primary text-white rounded-[60px] py-[0.313vw]" : ""}`}
              >
                Link Account
              </Button>
            </div>
          )}

          <button
            onClick={onButtonClick}
            className="bg-primary text-white px-6 rounded-md font-medium py-3 cursor-pointer text-sm"
          >
            {buttonText}
          </button>
      </div>
    </div>
  );
};

export default AuthHeader;
