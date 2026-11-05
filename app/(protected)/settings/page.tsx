"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Building, CirclePlus, SquarePen, Star, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompaniesStore } from "@/app/store/companiesStore";
import { DialogTrigger, Dialog } from "@/components/ui/dialog";
import PlaceholderImage from "@/components/ui/placeholder-image";
import AddNewCompanyDialog from "@/components/add-new-company-dialog";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";

const SettingsPage = () => {
  const [open, setOpen] = useState(false);
  const { companies, isLoading, fetchCompanies, setDefaultCompany } = useCompaniesStore();

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  if (isLoading) {
    return (
      <div className="bg-slate-50/50 min-h-screen">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-slate-200 bg-white/50">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-10 w-full sm:w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 p-6 sm:p-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="p-0">
                <Skeleton className="h-32 w-full" />
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Skeleton className="h-6 w-3/4 mt-4" />
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="bg-slate-50/50 min-h-screen pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 sm:p-8 border-b border-slate-200/60 bg-white/60 backdrop-blur-xl sticky top-0 z-10 transition-all">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl text-slate-900 tracking-tight">Companies</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your company profiles and team settings.</p>
          </div>
          <DialogTrigger className="bg-primary hover:bg-primary/95 text-white flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium shadow-sm shadow-primary/20 hover:shadow-md transition-all duration-200 active:scale-95 text-sm w-full sm:w-auto justify-center">
            <CirclePlus className="w-5 h-5" />
            New Company Profile
          </DialogTrigger>
        </div>

        <AddNewCompanyDialog open={open} setOpen={setOpen} />

        {companies.length === 0 && (
          <div className="flex justify-center items-center p-8 sm:p-16 mt-8">
            <div className="flex flex-col items-center gap-5 text-center bg-white p-12 rounded-[2rem] border border-slate-200 border-dashed shadow-sm max-w-lg w-full">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-2">
                <Building className="w-10 h-10 text-primary/80" />
              </div>
              <div>
                <p className="font-bold text-2xl text-slate-800">No companies found</p>
                <p className="text-slate-500 mt-2 leading-relaxed">
                  Get started by creating your first company profile to unlock all platform features.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8 p-6 sm:p-8">
          {companies.map((company) => (
            <Card
              key={company.id}
              className="p-0 gap-0 rounded-2xl border border-slate-200/80 w-full shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-400 bg-white overflow-hidden group flex flex-col"
            >
              <CardHeader className="p-0 relative flex-shrink-0">
                <div className="aspect-[2/1] w-full bg-slate-100 overflow-hidden relative">
                  {company.cover_image && company.cover_image !== "string" ? (
                    <Image
                      src={company?.cover_image}
                      alt={`${company.company_name || company?.info?.company_name} cover`}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <PlaceholderImage
                        name={company.company_name || company?.info?.company_name || "Company"}
                        size="md"
                        type="cover"
                      />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="absolute -bottom-6 left-5 flex items-center">
                  <div className="p-1 bg-white rounded-full shadow-md z-10 transition-transform duration-300 group-hover:scale-105">
                    {company.profile_image ? (
                      <Image
                        src={company.profile_image}
                        alt={`${company.company_name || company?.info?.company_name} logo`}
                        width={48}
                        height={48}
                        className="rounded-full w-12 h-12 object-cover border-2 border-slate-50"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border-2 border-slate-50 overflow-hidden">
                        <PlaceholderImage
                          name={company.company_name || company?.info?.company_name || "Company"}
                          size="sm"
                          type="profile"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <div className="pt-9 pb-3 px-5 flex-shrink-0">
                <CardTitle className="flex items-center justify-between text-lg sm:text-xl font-semibold overflow-hidden">
                  <span className="block truncate text-slate-800 tracking-tight">
                    {company.company_name || company?.info?.company_name}
                  </span>
                  {company.is_default && (
                    <div className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider ml-2 flex-shrink-0">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>Default</span>
                    </div>
                  )}
                </CardTitle>
              </div>
              <CardContent className="p-4 flex flex-col gap-2 bg-slate-50/50 mt-auto border-t border-slate-100/80">
                <Link
                  href={`/settings/company-profile/${company.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm text-slate-600 hover:text-primary transition-all duration-200 group/link"
                >
                  <span className="text-sm font-semibold">Edit Profile</span>
                  <SquarePen className="w-4 h-4 opacity-70 group-hover/link:opacity-100 transition-opacity" />
                </Link>

                {!company.is_default && (
                  <Button
                    variant="ghost"
                    onClick={() => setDefaultCompany(company.id || "")}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm text-slate-600 hover:text-amber-600 transition-all duration-200 h-auto font-semibold"
                  >
                    <span className="text-sm">Set as Default</span>
                    <Star className="w-4 h-4 opacity-50" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="px-6 sm:px-8 mt-4">
          <Link
            href="/settings/team"
            className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-6 sm:p-8 flex items-start gap-5 hover:shadow-md hover:border-primary/20 transition-all duration-300 group block"
          >
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight group-hover:text-primary transition-colors">
                Team Management
              </h3>
              <p className="text-slate-600 leading-relaxed max-w-3xl text-sm sm:text-base">
                Invite teammates by email, assign admin / member / viewer roles, and
                manage pending invites for your active company.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </Dialog>
  );
};

export default SettingsPage;
