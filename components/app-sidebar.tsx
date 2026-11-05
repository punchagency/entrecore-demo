"use client";

import Link from "next/link";
import * as React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LifeBuoy, Bell } from "lucide-react";
import { AbilityBuilder, createMongoAbility, MongoAbility } from "@casl/ability";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarMenu,
  SidebarGroup,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { LogoutConfirmationDialog } from "@/components/logout-confirmation-dialog";
import { useCompaniesStore, Company } from "@/app/store/companiesStore";
import { useUserStore } from "@/app/store/userStore";

type Subjects =
  | "all"
  | "Search"
  | "Logout"
  | "CoreOs"
  | "Market"
  | "Guides"
  | "Metrics"
  | "Settings"
  | "DataRoom"
  | "Diligence"
  | "Portfolio"
  | "InvestorAccess"
  | "Training"
  | "Abstraction"
  | "Workflows"
  | "Drat"
  | "Connectors"
  | "Notifications";

type Actions = "view" | "manage" | "all";

type AppAbility = MongoAbility<[Actions, Subjects]>;

type UserRole = "BUSINESS_EXECUTIVE" | "DATA_ENGINEER";

const ROLE_PERMISSIONS: Record<UserRole, { action: Actions; subjects: Subjects[] }[]> = {
  BUSINESS_EXECUTIVE: [
    {
      action: "all",
      subjects: [
        "CoreOs",
        "Search",
        "Metrics",
        "DataRoom",
        "Abstraction",
        // "Diligence",
        "Guides",
        "Training",
        "Settings",
        "Workflows",
        "Drat",
        "Connectors",
        "Notifications",
        "Logout",
      ],
    },
  ],
  DATA_ENGINEER: [
    {
      action: "all",
      subjects: ["CoreOs", "Search", "DataRoom", "Abstraction", "Guides", "Training", "Settings", "Workflows", "Drat", "Connectors", "Notifications", "Logout"],
    },
  ],
};

const defineAbilityFor = (role: UserRole): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  ROLE_PERMISSIONS[role]?.forEach(({ action, subjects }) => {
    can(action, subjects);
  });

  return build();
};

interface AppSidebarProps {
  role?: UserRole;
}

type SidebarNavItem = {
  title: string;
  url: string;
  subject: Subjects;
  icon: React.ReactNode;
  developmentBadge?: string;
};

export function AppSidebar({ role = "BUSINESS_EXECUTIVE" }: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const { state } = useSidebar();
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
  const { companies, fetchCompanies, isLoading } = useCompaniesStore();
  const { user } = useUserStore();
  const [company, setCompany] = React.useState<Company | null>(null);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies])

  React.useEffect(() => {
    if (isLoading) return;
    const resolveCompany = () => {
      const companyId = localStorage.getItem("selectedCompanyId") || user?.active_company;
      if (companyId && companies.length > 0) {
        const matched = companies.find((c) => c.id === companyId);
        if (matched) {
          setCompany(matched);
        }
      }
    };

    resolveCompany();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId") {
        resolveCompany();
      }
    };

    const handleCustomEvent = () => resolveCompany();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomEvent);
    };
  }, [companies, user?.active_company]);

  const ability = React.useMemo(() => defineAbilityFor(role), [role]);

  const allSidebarTopItems: SidebarNavItem[] = [
    {
      title: "CoreOS",
      url: "/coreos",
      subject: "CoreOs" as Subjects,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 2C0 0.895431 0.89543 0 2 0H6C7.10457 0 8 0.895431 8 2V6C8 7.10457 7.10457 8 6 8H2C0.895431 8 0 7.10457 0 6V2ZM6 2H2V6H6V2ZM10 2C10 0.895431 10.8954 0 12 0H16C17.1046 0 18 0.895431 18 2V6C18 7.10457 17.1046 8 16 8H12C10.8954 8 10 7.10457 10 6V2ZM16 2H12V6H16V2ZM0 12C0 10.8954 0.895431 10 2 10H6C7.10457 10 8 10.8954 8 12V16C8 17.1046 7.10457 18 6 18H2C0.895431 18 0 17.1046 0 16V12ZM6 12H2V16H6V12ZM10 12C10 10.8954 10.8954 10 12 10H16C17.1046 10 18 10.8954 18 12V16C18 17.1046 17.1046 18 16 18H12C10.8954 18 10 17.1046 10 16V12ZM16 12H12V16H16V12Z"
            fill="currentColor"
          />
        </svg>
      ),
    },

    // {
    //   title: "Search",
    //   url: "/search",
    //   subject: "Search" as Subjects,
    //   icon: (
    //     <svg
    //       width="20"
    //       height="20"
    //       viewBox="0 0 20 20"
    //       fill="none"
    //       xmlns="http://www.w3.org/2000/svg"
    //     >
    //       <path
    //         fillRule="evenodd"
    //         clipRule="evenodd"
    //         d="M7.5 0.5C3.63401 0.5 0.5 3.63401 0.5 7.5C0.5 11.366 3.63401 14.5 7.5 14.5C9.07234 14.5 10.5236 13.9816 11.6922 13.1064L15.7929 17.2071C16.1834 17.5976 16.8166 17.5976 17.2071 17.2071C17.5976 16.8166 17.5976 16.1834 17.2071 15.7929L13.1064 11.6922C13.9816 10.5236 14.5 9.07234 14.5 7.5C14.5 3.63401 11.366 0.5 7.5 0.5ZM2.5 7.5C2.5 4.73858 4.73858 2.5 7.5 2.5C10.2614 2.5 12.5 4.73858 12.5 7.5C12.5 10.2614 10.2614 12.5 7.5 12.5C4.73858 12.5 2.5 10.2614 2.5 7.5Z"
    //         fill="black"
    //       />
    //     </svg>
    //   ),
    // },

    // {
    //   title: "Metrics",
    //   url: "/metrics",
    //   subject: "Metrics" as Subjects,
    //   icon: (
    //     <svg
    //       width="20"
    //       height="20"
    //       viewBox="0 0 20 20"
    //       fill="none"
    //       xmlns="http://www.w3.org/2000/svg"
    //     >
    //       <path
    //         d="M11 5C11 4.44772 10.5523 4 10 4C9.44771 4 9 4.44772 9 5V15C9 15.5523 9.44771 16 10 16C10.5523 16 11 15.5523 11 15V5Z"
    //         fill="#3064F6"
    //       />
    //       <path
    //         d="M15 8C15 7.44772 14.5523 7 14 7C13.4477 7 13 7.44772 13 8V15C13 15.5523 13.4477 16 14 16C14.5523 16 15 15.5523 15 15V8Z"
    //         fill="#3064F6"
    //       />
    //       <path
    //         d="M7 11C7 10.4477 6.55228 10 6 10C5.44772 10 5 10.4477 5 11L5 15C5 15.5523 5.44772 16 6 16C6.55229 16 7 15.5523 7 15L7 11Z"
    //         fill="#3064F6"
    //       />
    //       <path
    //         fillRule="evenodd"
    //         clipRule="evenodd"
    //         d="M0 3C0 1.34315 1.34315 0 3 0H17C18.6569 0 20 1.34315 20 3V17C20 18.6569 18.6569 20 17 20H3C1.34315 20 0 18.6569 0 17V3ZM3 2C2.44772 2 2 2.44772 2 3V17C2 17.5523 2.44772 18 3 18H17C17.5523 18 18 17.5523 18 17V3C18 2.44772 17.5523 2 17 2H3Z"
    //         fill="#3064F6"
    //       />
    //     </svg>
    //   ),
    // },

    {
      title: "Data Intelligence Hub",
      url: "/data-room",
      subject: "DataRoom" as Subjects,
      icon: (
        <svg
          width="18"
          height="19"
          viewBox="0 0 18 19"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.5 3C4.08333 3 3.72917 3.14583 3.4375 3.4375C3.14583 3.72917 3 4.08333 3 4.5C3 4.91667 3.14583 5.27083 3.4375 5.5625C3.72917 5.85417 4.08333 6 4.5 6C4.91667 6 5.27083 5.85417 5.5625 5.5625C5.85417 5.27083 6 4.91667 6 4.5C6 4.08333 5.85417 3.72917 5.5625 3.4375C5.27083 3.14583 4.91667 3 4.5 3ZM4.5 13C4.08333 13 3.72917 13.1458 3.4375 13.4375C3.14583 13.7292 3 14.0833 3 14.5C3 14.9167 3.14583 15.2708 3.4375 15.5625C3.72917 15.8542 4.08333 16 4.5 16C4.91667 16 5.27083 15.8542 5.5625 15.5625C5.85417 15.2708 6 14.9167 6 14.5C6 14.0833 5.85417 13.7292 5.5625 13.4375C5.27083 13.1458 4.91667 13 4.5 13ZM1 0H17C17.2833 0 17.5208 0.0958333 17.7125 0.2875C17.9042 0.479167 18 0.716667 18 1V8C18 8.28333 17.9042 8.52083 17.7125 8.7125C17.5208 8.90417 17.2833 9 17 9H1C0.716667 9 0.479167 8.90417 0.2875 8.7125C0.0958333 8.52083 0 8.28333 0 8V1C0 0.716667 0.0958333 0.479167 0.2875 0.2875C0.479167 0.0958333 0.716667 0 1 0ZM2 2V7H16V2H2ZM1 10H17C17.2833 10 17.5208 10.0958 17.7125 10.2875C17.9042 10.4792 18 10.7167 18 11V18C18 18.2833 17.9042 18.5208 17.7125 18.7125C17.5208 18.9042 17.2833 19 17 19H1C0.716667 19 0.479167 18.9042 0.2875 18.7125C0.0958333 18.5208 0 18.2833 0 18V11C0 10.7167 0.0958333 10.4792 0.2875 10.2875C0.479167 10.0958 0.716667 10 1 10ZM2 12V17H16V12H2Z"
            fill="currentColor"
          />
        </svg>
      ),
    },

    {
      title: "Abstraction",
      url: "/abstraction",
      subject: "Abstraction" as Subjects,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 2V8H20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 15L11 17L15 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },

    {
      title: "Investor Access",
      url: "/investor-access",
      subject: "InvestorAccess" as Subjects,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9 0C9.55229 1.19209e-07 10 0.447715 10 1L10 10C10 10.5523 9.55228 11 9 11C8.44771 11 8 10.5523 8 10L8 1C8 0.447715 8.44772 -1.19209e-07 9 0ZM3 7.15256e-07C3.55229 7.7486e-07 4 0.447716 4 1L4 4H5C5.55229 4 6 4.44772 6 5C6 5.55229 5.55229 6 5 6L1 6C0.447715 6 0 5.55229 0 5C0 4.44772 0.447715 4 1 4H2L2 1C2 0.447716 2.44772 6.55651e-07 3 7.15256e-07ZM15 7.15256e-07C15.5523 7.7486e-07 16 0.447716 16 1L16 7H17C17.5523 7 18 7.44772 18 8C18 8.55229 17.5523 9 17 9L13 9C12.4477 9 12 8.55229 12 8C12 7.44772 12.4477 7 13 7H14L14 1C14 0.447716 14.4477 5.96046e-07 15 7.15256e-07ZM3 7C3.55228 7 4 7.44772 4 8L4 17C4 17.5523 3.55228 18 3 18C2.44771 18 2 17.5523 2 17L2 8C2 7.44772 2.44772 7 3 7ZM15 10C15.5523 10 16 10.4477 16 11L16 17C16 17.5523 15.5523 18 15 18C14.4477 18 14 17.5523 14 17L14 11C14 10.4477 14.4477 10 15 10ZM6 13C6 12.4477 6.44771 12 7 12H11C11.5523 12 12 12.4477 12 13C12 13.5523 11.5523 14 11 14H10L10 17C10 17.5523 9.55228 18 9 18C8.44771 18 8 17.5523 8 17L8 14H7C6.44771 14 6 13.5523 6 13Z"
            fill="currentColor"
          />
        </svg>
      ),
    },

    {
      title: "Market",
      url: "/market",
      subject: "Market" as Subjects,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M15.364 15.364C14.3174 16.4105 13.0289 17.1828 11.6126 17.6125C10.1962 18.0421 8.69581 18.1158 7.24419 17.8271C5.79257 17.5383 4.43456 16.896 3.29046 15.9571C2.14636 15.0182 1.25148 13.8115 0.685086 12.4442C0.118692 11.0768 -0.101731 9.59078 0.0433397 8.11785C0.188411 6.64491 0.694499 5.23049 1.51678 3.99987C2.33905 2.76924 3.45214 1.7604 4.75743 1.06271C6.06273 0.365014 7.51994 0 9 0C10.78 0 12.5201 0.527841 14.0001 1.51677C15.4802 2.50571 16.6337 3.91131 17.3149 5.55585C17.9961 7.20038 18.1743 9.00998 17.8271 10.7558C17.4798 12.5016 16.6226 14.1053 15.364 15.364ZM5.70023 2.82655C6.41942 2.44213 7.19791 2.18757 8 2.0718V4.92078C7.66025 5.00407 7.33097 5.12979 7.02014 5.29593C6.411 5.62152 5.89156 6.09231 5.50783 6.6666C5.1241 7.2409 4.88793 7.90096 4.82023 8.58833C4.75253 9.2757 4.85539 9.96915 5.11971 10.6073C5.38403 11.2454 5.80164 11.8085 6.33555 12.2466C6.86946 12.6848 7.5032 12.9846 8.18062 13.1193C8.85805 13.254 9.55824 13.2196 10.2192 13.0191C10.5565 12.9168 10.8782 12.7729 11.1773 12.5915L13.1919 14.6061C12.5428 15.0914 11.8124 15.4619 11.032 15.6986C9.93041 16.0327 8.76341 16.0901 7.63437 15.8655C6.50533 15.6409 5.44911 15.1414 4.55925 14.4111C3.66939 13.6808 2.97337 12.7423 2.53285 11.6788C2.09232 10.6153 1.92088 9.45949 2.03371 8.31388C2.14654 7.16827 2.54017 6.06816 3.17972 5.11101C3.81926 4.15386 4.685 3.3692 5.70023 2.82655ZM14.6061 13.1919C15.2289 12.3589 15.6609 11.394 15.8655 10.3656C16.1356 9.00777 15.997 7.6003 15.4672 6.32122C14.9373 5.04213 14.0401 3.94888 12.889 3.17971C12.0172 2.5972 11.0294 2.22038 10 2.07179V4.92078C10.4728 5.03669 10.9244 5.23453 11.3334 5.50783C12.0241 5.96933 12.5624 6.62528 12.8803 7.39273C13.1982 8.16018 13.2814 9.00466 13.1193 9.81938C13.0233 10.3019 12.8439 10.7611 12.5915 11.1773L14.6061 13.1919ZM10.5556 10.5556C10.8633 10.248 11.0728 9.85596 11.1577 9.4292C11.2426 9.00244 11.199 8.56009 11.0325 8.1581C10.866 7.7561 10.584 7.41251 10.2223 7.17077C9.86047 6.92903 9.43512 6.8 9 6.8C8.63821 6.8 8.282 6.88923 7.96293 7.05977C7.64386 7.23032 7.37177 7.47693 7.17077 7.77775C6.96977 8.07856 6.84606 8.42431 6.8106 8.78436C6.77513 9.14441 6.82902 9.50765 6.96747 9.8419C7.10592 10.1762 7.32467 10.4711 7.60434 10.7006C7.88401 10.9301 8.21596 11.0871 8.5708 11.1577C8.92564 11.2283 9.29241 11.2103 9.63863 11.1053C9.98484 11.0002 10.2998 10.8115 10.5556 10.5556Z"
            fill="currentColor"
          />
        </svg>
      ),
    },

    {
      title: "Guides",
      url: "/guides",
      subject: "Guides" as Subjects,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L2 7L12 12L22 7L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 17L12 22L22 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 12L12 17L22 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: "Training",
      url: "/training",
      subject: "Training" as Subjects,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 21V14M12 21V9M19 21V3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 14H7M10 9H14M17 3H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: "Workflows",
      url: "/workflows",
      subject: "Workflows" as Subjects,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8V16C21 18.7614 18.7614 21 16 21H8C5.23858 21 3 18.7614 3 16V8C3 5.23858 5.23858 3 8 3H16C18.7614 3 21 5.23858 21 8Z"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 12H17M12 7V17"
          />
        </svg>
      ),
    },
    {
      title: "DRAT",
      url: "/drat/review",
      subject: "Drat" as Subjects,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.07 4.93A10 10 0 0 0 6.99 3.34M4 6h.01M2.29 9.62A10 10 0 1 0 21.31 8.35M16.24 7.76A6 6 0 1 0 8.23 16.67M12 18h.01M17.99 11.66A6 6 0 0 1 15.77 16.67M13.41 10.59l5.66-5.66"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: "Connectors",
      url: "/connectors",
      subject: "Connectors" as Subjects,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 7H7a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2m6-7h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M8 12h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: "Portfolio",
      url: "/portfolio",
      subject: "Portfolio" as Subjects,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8 4C6.89543 4 6 4.89543 6 6V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V9.625H14.5C13.3954 9.625 12.5 8.72957 12.5 7.625V4H8ZM14.5 5.4531L16.6236 7.625H14.5V5.4531ZM4 6C4 3.79086 5.79086 2 8 2H13.5C13.7691 2 14.0269 2.10847 14.215 2.30088L19.715 7.92588C19.8977 8.11273 20 8.36367 20 8.625V18C20 20.2091 18.2091 22 16 22H8C5.79086 22 4 20.2091 4 18V6Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M14.7929 12.7929C15.1834 12.4024 15.8166 12.4024 16.2071 12.7929C16.5976 13.1834 16.5976 13.8166 16.2071 14.2071L13.7071 16.7071C13.3166 17.0976 12.6834 17.0976 12.2929 16.7071L11.5 15.9142L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071C7.90237 17.3166 7.90237 16.6834 8.29289 16.2929L10.7929 13.7929C11.1834 13.4024 11.8166 13.4024 12.2071 13.7929L13 14.5858L14.7929 12.7929Z"
            fill="currentColor"
          />
        </svg>
      ),
    },

    {
      title: "Diligence",
      url: "/diligence",
      subject: "Diligence" as Subjects,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11.553 3.10557C11.8345 2.96481 12.1659 2.96481 12.4474 3.10557L20.4474 7.10557C20.7862 7.27496 21.0002 7.62123 21.0002 8C21.0002 8.37877 20.7862 8.72504 20.4474 8.89443L12.4474 12.8944C12.1659 13.0352 11.8345 13.0352 11.553 12.8944L3.553 8.89443C3.21422 8.72504 3.00021 8.37877 3.00021 8C3.00021 7.62123 3.21422 7.27496 3.553 7.10557L11.553 3.10557ZM6.23628 8L12.0002 10.882L17.7641 8L12.0002 5.11803L6.23628 8ZM3.10579 11.553C3.35278 11.059 3.95345 10.8588 4.44743 11.1058L12.0002 14.8822L19.553 11.1058C20.047 10.8588 20.6477 11.059 20.8946 11.553C21.1416 12.047 20.9414 12.6477 20.4474 12.8946L12.4474 16.8946C12.1659 17.0354 11.8345 17.0354 11.553 16.8946L3.55301 12.8946C3.05903 12.6477 2.8588 12.047 3.10579 11.553ZM4.44743 15.1058C3.95345 14.8588 3.35278 15.059 3.10579 15.553C2.8588 16.047 3.05903 16.6477 3.55301 16.8946L11.553 20.8946C11.8345 21.0354 12.1659 21.0354 12.4474 20.8946L20.4474 16.8946C20.9414 16.6477 21.1416 16.047 20.8946 15.553C20.6477 15.059 20.047 14.8588 19.553 15.1058L12.0002 18.8822L4.44743 15.1058Z"
            fill="currentColor"
          />
        </svg>
      ),
    },
  ];

  const allSidebarBottomItems = [
    {
      title: "Notifications",
      url: "/notifications",
      subject: "Notifications" as Subjects,
      icon: (
        <Bell className="h-5 w-5" />
      ),
    },
    {
      title: "Settings",
      url: "/settings",
      subject: "Settings" as Subjects,
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 6C7.79086 6 6 7.79086 6 10C6 12.2091 7.79086 14 10 14C12.2091 14 14 12.2091 14 10C14 7.79086 12.2091 6 10 6ZM8 10C8 8.89543 8.89543 8 10 8C11.1046 8 12 8.89543 12 10C12 11.1046 11.1046 12 10 12C8.89543 12 8 11.1046 8 10Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7.00002 2C7.00002 0.895432 7.89545 0 9.00002 0H11C12.1046 0 13 0.895431 13 2V2.5818C13.0416 2.59861 13.0829 2.61576 13.1241 2.63325C13.1728 2.58454 13.2211 2.5352 13.2693 2.48582C13.3788 2.37383 13.4885 2.26167 13.604 2.15643C14.3889 1.4414 15.6054 1.46319 16.364 2.2218L17.7782 3.63602C18.5592 4.41706 18.5592 5.68339 17.7782 6.46444L17.3668 6.87588C17.3842 6.91707 17.4014 6.95845 17.4182 7H18C19.1046 7 20 7.89543 20 9V11C20 12.1046 19.1046 13 18 13H17.4182C17.4014 13.0416 17.3842 13.0829 17.3668 13.1241L17.7782 13.5356C18.5592 14.3166 18.5592 15.5829 17.7782 16.364L16.364 17.7782C15.5829 18.5592 14.3166 18.5592 13.5355 17.7782L13.1241 17.3668C13.0829 17.3842 13.0416 17.4014 13 17.4182V18C13 19.1046 12.1046 20 11 20H9.00002C7.89545 20 7.00002 19.1046 7.00002 18V17.4182C6.95847 17.4014 6.91709 17.3842 6.87589 17.3667L6.46447 17.7782C5.68342 18.5592 4.41709 18.5592 3.63604 17.7782L2.22183 16.3639C1.44078 15.5829 1.44078 14.3166 2.22183 13.5355L2.63326 13.1241C2.61578 13.0829 2.59863 13.0415 2.58182 13H2C0.895432 13 0 12.1046 0 11V9C0 7.89543 0.895431 7 2 7H2.58182C2.59863 6.95846 2.61578 6.9171 2.63326 6.87592L2.22183 6.46449C1.44079 5.68344 1.44078 4.41711 2.22183 3.63606L3.63605 2.22185C4.4171 1.4408 5.68343 1.4408 6.46448 2.22185L6.8759 2.63327C6.91709 2.61578 6.95847 2.59862 7.00002 2.5818V2ZM9.00002 2L11 2V3.28988C11 3.7323 11.2907 4.12213 11.7148 4.24833C12.1132 4.36691 12.4944 4.52587 12.8538 4.72058C13.2429 4.93144 13.7243 4.86143 14.0373 4.54847L14.9498 3.63602L16.364 5.05023L15.4515 5.96268C15.1386 6.27564 15.0686 6.75709 15.2794 7.14622C15.4741 7.50556 15.6331 7.8868 15.7517 8.28525C15.8779 8.70929 16.2677 9 16.7101 9H18V11H16.7101C16.2677 11 15.8779 11.2907 15.7517 11.7148C15.6331 12.1132 15.4741 12.4944 15.2794 12.8538C15.0686 13.2429 15.1386 13.7244 15.4515 14.0373L16.364 14.9498L14.9498 16.364L14.0373 15.4515C13.7243 15.1386 13.2429 15.0686 12.8538 15.2794C12.4944 15.4741 12.1132 15.6331 11.7148 15.7517C11.2907 15.8779 11 16.2677 11 16.7101V18H9.00002V16.7101C9.00002 16.2677 8.7093 15.8779 8.28527 15.7517C7.88681 15.6331 7.50557 15.4741 7.14623 15.2794C6.7571 15.0685 6.27565 15.1385 5.96269 15.4515L5.05026 16.3639L3.63604 14.9497L4.54849 14.0373C4.86144 13.7243 4.93146 13.2429 4.7206 12.8537C4.52589 12.4944 4.36693 12.1132 4.24835 11.7148C4.12215 11.2907 3.73231 11 3.28989 11H2V9H3.28989C3.73231 9 4.12215 8.70929 4.24835 8.28525C4.36693 7.88681 4.52589 7.50558 4.7206 7.14625C4.93146 6.75712 4.86145 6.27567 4.54849 5.96272L3.63605 5.05027L5.05026 3.63606L5.9627 4.5485C6.27565 4.86145 6.75711 4.93146 7.14623 4.7206C7.50557 4.52588 7.88681 4.36692 8.28527 4.24833C8.7093 4.12213 9.00002 3.7323 9.00002 3.28988V2Z"
            fill="currentColor"
          />
        </svg>
      ),
    },

    {
      title: "Logout",
      url: "#",
      subject: "Logout" as Subjects,
      icon: (
        <svg
          width="20"
          height="18"
          viewBox="0 0 20 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M19.7071 8.29289C20.0976 8.68342 20.0976 9.31658 19.7071 9.70711L16.7071 12.7071C16.3166 13.0976 15.6834 13.0976 15.2929 12.7071C14.9024 12.3166 14.9024 11.6834 15.2929 11.2929L16.5858 10L5 10C4.44771 10 4 9.55229 4 9C4 8.44772 4.44771 8 5 8L16.5858 8L15.2929 6.70711C14.9024 6.31658 14.9024 5.68342 15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289L19.7071 8.29289ZM10 3C10 2.44772 9.55228 2 9 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H9C9.55228 16 10 15.5523 10 15L10 13C10 12.4477 10.4477 12 11 12C11.5523 12 12 12.4477 12 13V15C12 16.6569 10.6569 18 9 18H3C1.34315 18 0 16.6569 0 15V3C0 1.34315 1.34315 0 3 0L9 0C10.6569 0 12 1.34315 12 3V5C12 5.55228 11.5523 6 11 6C10.4477 6 10 5.55228 10 5V3Z"
            fill="currentColor"
          />
        </svg>
      ),
    },
  ];

  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";
  const isSuperadminCompany = user?.is_superadmin_company ?? false;


  const allowedExternalSubjects = ["Abstraction", "Drat", "Connectors", "Settings", "Notifications", "Logout"];

  const sidebarTopItems = allSidebarTopItems.filter((item) => {
    if (!ability.can("all", item.subject)) return false;
    if (isProduction && !isSuperadminCompany && !allowedExternalSubjects.includes(item.subject)) {
      return false;
    }
    return true;
  });

  const sidebarBottomItems = allSidebarBottomItems.filter((item) => {
    if (!ability.can("all", item.subject)) return false;
    if (isProduction && !isSuperadminCompany && !allowedExternalSubjects.includes(item.subject)) {
      return false;
    }
    return true;
  });

  const getActiveUrl = () => {
    const availableUrls = [
      ...sidebarTopItems.map((i) => i.url),
      ...sidebarBottomItems.map((i) => i.url),
    ].filter((u) => u !== "#");

    if (availableUrls.includes(pathname)) return pathname;

    const sortedUrls = [...availableUrls].sort((a, b) => b.length - a.length);
    for (const u of sortedUrls) {
      if (pathname.startsWith(`${u}/`)) return u;
    }

    const firstSegment = pathname.split("/")[1];
    if (firstSegment) {
      for (const u of sortedUrls) {
        if (u.split("/")[1] === firstSegment) return u;
      }
    }
    return null;
  };

  const activeUrl = getActiveUrl();

  const isActive = (url: string) => {
    if (url === "#") return false;
    return url === activeUrl;
  };

  const handleLogoutClick = (item: { title: string; url: string }) => {
    if (item.title === "Logout") {
      setLogoutDialogOpen(true);
      return;
    }
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-between h-16 transition-all duration-300">
            <div className={cn("flex justify-center transition-all duration-300", state === "expanded" ? "w-[120px]" : "w-full")}>
              {state === "expanded" ? (
                <Image src="/svgs/logo.svg" alt="Logo" width={120.84} height={20} priority className="transition-opacity duration-300" />
              ) : (
                <div className="flex items-center justify-center -ml-2">
                  <Image
                    src="/svgs/logo-small.svg"
                    alt="Logo"
                    width={28}
                    height={28}
                    priority
                    className="rounded transition-opacity duration-300"
                  />
                </div>
              )}
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex flex-col h-full">
          <SidebarGroup className="flex-1">
            <SidebarMenu className="px-3 space-y-1 group-data-[state=collapsed]:px-2 transition-all duration-300">
              {sidebarTopItems.map((item) => (
                <SidebarMenuItem key={item.url} className="h-12 flex justify-center">
                  <Link href={item.url} className={cn("cursor-pointer block", state === "expanded" ? "w-full" : "w-auto")}>
                    <SidebarMenuButton
                      tooltip={
                        item.developmentBadge
                          ? `${item.title} — ${item.developmentBadge}`
                          : item.title
                      }
                      className={cn(
                        "transition-all duration-300 px-4",
                        state === "expanded" ? "w-full rounded-xl" : "size-11 rounded-full",
                        isActive(item.url)
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:text-white"
                          : "text-gray-600 font-medium hover:bg-blue-50 hover:text-blue-700 hover:translate-x-1 hover:shadow-md hover:shadow-blue-500/10 border border-transparent hover:border-blue-100/50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("relative flex-shrink-0 transition-transform duration-300", state === "collapsed" && "scale-110")}>
                          {item.icon}
                          {state === "collapsed" && item.developmentBadge && (
                            <span
                              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
                              aria-hidden
                            />
                          )}
                        </div>
                        {state === "expanded" && (
                          <span className="tracking-tight flex items-center gap-2 min-w-0">
                            <span className="truncate">{item.title}</span>
                            {item.developmentBadge && (
                              <span
                                className={cn(
                                  "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0",
                                  isActive(item.url)
                                    ? "bg-white/20 text-white border border-white/30"
                                    : "bg-amber-100 text-amber-700 border border-amber-200"
                                )}
                              >
                                {item.developmentBadge}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup className="mt-auto">
            <SidebarMenu className="px-3 pb-3 space-y-1 group-data-[state=collapsed]:px-2 transition-all duration-300">
              {user?.platform_role === "superadmin" && (
                <SidebarMenuItem className="h-12 flex justify-center">
                  <Link href="/support" className={cn("block", state === "expanded" ? "w-full" : "w-auto")}>
                    <SidebarMenuButton
                      tooltip="Support"
                      className={cn(
                        "transition-all duration-300 px-4",
                        state === "expanded" ? "w-full rounded-xl" : "size-11 rounded-full",
                        isActive("/support")
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30"
                          : "text-gray-600 font-medium hover:bg-blue-50 hover:text-blue-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <LifeBuoy className="h-5 w-5" />
                        {state === "expanded" && <span className="tracking-tight">Support</span>}
                      </div>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              )}
              {sidebarBottomItems.map((item) => (
                <SidebarMenuItem key={item.url} className="h-12 flex justify-center">
                  {item.title === "Logout" ? (
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "transition-all duration-300 px-4",
                        state === "expanded" ? "w-full rounded-xl" : "size-11 rounded-full",
                        isActive(item.url)
                          ? "bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow-lg shadow-red-500/30"
                          : "text-gray-600 font-medium hover:bg-red-50 hover:text-red-700 hover:translate-x-1 hover:shadow-md hover:shadow-red-500/10 border border-transparent hover:border-red-100/50"
                      )}
                      onClick={() => handleLogoutClick(item)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("flex-shrink-0 transition-transform duration-300", state === "collapsed" && "scale-110")}>
                          {item.icon}
                        </div>
                        {state === "expanded" && <span className="tracking-tight">{item.title}</span>}
                      </div>
                    </SidebarMenuButton>
                  ) : (
                    <Link href={item.url} className={cn("block", state === "expanded" ? "w-full" : "w-auto")}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className={cn(
                          "transition-all duration-300 px-4",
                          state === "expanded" ? "w-full rounded-xl" : "size-11 rounded-full",
                          isActive(item.url)
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30"
                            : "text-gray-600 font-medium hover:bg-blue-50 hover:text-blue-700 hover:translate-x-1 hover:shadow-md hover:shadow-blue-500/10 border border-transparent hover:border-blue-100/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("flex-shrink-0 transition-transform duration-300", state === "collapsed" && "scale-110")}>
                            {item.icon}
                          </div>
                          {state === "expanded" && <span className="tracking-tight">{item.title}</span>}
                        </div>
                      </SidebarMenuButton>
                    </Link>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <LogoutConfirmationDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen} />
    </>
  );
}
