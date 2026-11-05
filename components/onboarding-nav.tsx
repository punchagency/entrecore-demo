"use client";

import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/app/store/onboardingStore";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function OnboardingNav() {
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);

  // Map between step values and tab values
  const stepToTab = {
    "personal-info": "personal",
    "company-details": "company",
    "profile-setup": "link-account",
  } as const;

  const tabToStep = {
    personal: "personal-info",
    company: "company-details",
    "link-account": "profile-setup",
  } as const;

  const currentTab = stepToTab[currentStep as keyof typeof stepToTab] || "personal";

  const navItems = [
    {
      label: "You",
      value: "personal",
      title: "Tell Us About Yourself",
    },
    {
      label: "Company",
      value: "company",
      title: "About Your Company",
    },
    {
      label: "Link Account",
      value: "link-account",
      title: "Link Your Account To See Analytical Data On Your Dashboard",
    },
  ];

  const handleTabChange = (value: string) => {
    const currentIndex = navItems.findIndex((item) => item.value === currentTab);
    const targetIndex = navItems.findIndex((item) => item.value === value);

    if (targetIndex > currentIndex) {
      toast.error("Please complete the current step first");
      return;
    }

    const stepValue = tabToStep[value as keyof typeof tabToStep];
    if (stepValue) {
      setCurrentStep(stepValue);
    }
  };

  const getCurrentTitle = () => {
    return navItems.find((item) => item.value === currentTab)?.title || "";
  };

  return (
    <>
      <div className="w-full border-b border-[#D9DBDD] bg-white fixed top-0 z-50">
        <div className="container flex h-16 items-center px-4 md:px-6 max-w-full">
          <div className="w-[140px]">
            <Link href="/" className="">
              <Image src="/svgs/logo.svg" alt="Logo" width={150} height={24} />
            </Link>
          </div>
          <div className="flex-1 flex justify-center">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-auto">
              <TabsList className="bg-gray-100/80 rounded-full p-1">
                {navItems.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className={cn(
                      "px-6 py-2 rounded-full transition-colors text-sm font-medium",
                      "data-[state=active]:bg-primary data-[state=active]:text-white",
                      "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900",
                      // Disable future tabs
                      navItems.findIndex((nav) => nav.value === item.value) >
                        navItems.findIndex((nav) => nav.value === currentTab) &&
                        "opacity-50 cursor-not-allowed"
                    )}
                    disabled={
                      navItems.findIndex((nav) => nav.value === item.value) >
                      navItems.findIndex((nav) => nav.value === currentTab)
                    }
                  >
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="w-[150px] flex justify-end">
            <Link href="/metrics">
              <Button variant="outline" className="rounded-lg w-20 cursor-pointer">
                Skip
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="w-full bg-primary text-white py-5 px-4 fixed top-16 z-40">
        <div className="container mx-auto max-w-full flex justify-center items-center">
          <h1 className="text-xl font-semibold">{getCurrentTitle()}</h1>
        </div>
      </div>
    </>
  );
}
