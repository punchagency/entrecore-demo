"use client";
import { Check } from "lucide-react";
import usMap from "@/public/us-map.json";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyProfileStore } from "@/app/store/companyProfileStore";

// Canadian provinces data
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
  { id: "YT", name: "Yukon" }
];

const CompanyProfilePage = () => {
  const businessTypes = ["B2B", "B2C", "B2G", "B2B2C", "C2C", "C2B"];

  const {
    info,
    team,
    setTeam,
    location,
    setLocation,
    company_type,
    setCompanyType,
    setCompanyInfo,
  } = useCompanyProfileStore();

  const toggleBusinessType = (type: string) => {
    if ((company_type?.businessModelType || []).includes(type)) {
      setCompanyType({
        businessModelType: (company_type?.businessModelType || []).filter(
          (t: string) => t !== type
        ),
      });
    } else {
      setCompanyType({
        businessModelType: [...(company_type?.businessModelType || []), type],
      });
    }
  };

  return (
    <div className="w-full mb-24 flex flex-col items-center">
      <div className="space-y-8 p-6 w-full max-w-3xl">
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-base lg:text-xl font-bold text-primary">Company Info</h2>
            <div className="space-y-4">
              <div className="space-y-2 w-full">
                <label className="text-sm lg:text-base font-medium">Company Name</label>
                <Input
                  placeholder="Enter company name"
                  className="w-full"
                  size="lg"
                  value={info.companyName}
                  onChange={(e) => setCompanyInfo({ companyName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 w-full">
                  <label className="text-sm lg:text-base font-medium">Year Founded</label>
                  <Select
                    value={info.yearFounded}
                    onValueChange={(value) => setCompanyInfo({ yearFounded: value })}
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 124 }, (_, i) => (
                        <SelectItem key={2024 - i} value={(2024 - i).toString()}>
                          {2024 - i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-full">
                  <label className="text-sm lg:text-base font-medium">Month Founded</label>
                  <Select
                    value={info.monthFounded}
                    onValueChange={(value) => setCompanyInfo({ monthFounded: value })}
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="2">February</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                      <SelectItem value="5">May</SelectItem>
                      <SelectItem value="6">June</SelectItem>
                      <SelectItem value="7">July</SelectItem>
                      <SelectItem value="8">August</SelectItem>
                      <SelectItem value="9">September</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                      <SelectItem value="11">November</SelectItem>
                      <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 w-full">
                  <label className="text-sm lg:text-base font-medium">State Registered</label>
                  <Select
                    value={info.stateRegistered}
                    onValueChange={(value) => setCompanyInfo({ stateRegistered: value })}
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-96 overflow-y-auto">
                      {usMap.objects.states.geometries
                        .map((state: any) => ({
                          id: state.id,
                          name: state.properties.name,
                        }))
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((state: any) => (
                          <SelectItem key={state.id} value={state.name}>
                            {state.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-full">
                  <label className="text-sm lg:text-base font-medium">Business Entity Type</label>
                  <Select
                    value={info.businessEntityType}
                    onValueChange={(value) => setCompanyInfo({ businessEntityType: value })}
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LLC">LLC</SelectItem>
                      <SelectItem value="Corporation">Corporation</SelectItem>
                      <SelectItem value="Partnership">Partnership</SelectItem>
                      <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 w-full">
                <label className="text-sm lg:text-base font-medium">Company Bio and Overview</label>
                <Textarea
                  placeholder="Tell us about your company..."
                  className="min-h-[100px] resize-none w-full"
                  value={info.companyBioAndOverview}
                  onChange={(e) => setCompanyInfo({ companyBioAndOverview: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base lg:text-xl font-bold text-primary">Company Type</h2>
            <div className="space-y-2">
              <label className="text-sm lg:text-base font-medium">Business Model Type</label>
              <div className="grid grid-cols-3 gap-4">
                {businessTypes.map((type) => (
                  <div
                    key={type}
                    onClick={() => toggleBusinessType(type)}
                    className={`
                  flex justify-between items-center px-4 py-3 rounded border bg-white
                  ${(company_type?.businessModelType || []).includes(type)
                        ? "border-blue-500 text-blue-600"
                        : "border-gray-300 text-gray-700"
                      }
                  cursor-pointer hover:border-blue-300 transition-colors
                `}
                  >
                    <span className="font-medium">{type}</span>
                    {(company_type?.businessModelType || []).includes(type) && (
                      <Check className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                ))}
              </div>
              {/* <div className="space-y-2 mt-4">
                <label className="text-sm lg:text-base font-medium">Industry Vertical</label>
                <Select
                  value={company_type.industryVertical}
                  onValueChange={(value) => setCompanyType({ industryVertical: value })}
                >
                  <SelectTrigger className="w-full" size="lg">
                    <SelectValue placeholder="Select One" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base lg:text-xl font-bold text-primary">Company Location</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">Country</label>
                  <Select
                    value={location.country}
                    onValueChange={(value) => {
                      setLocation({ country: value, state: "" }); // Reset state when country changes
                    }}
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">City</label>
                  <Input
                    placeholder="Enter city"
                    className="w-full"
                    size="lg"
                    value={location.city}
                    onChange={(e) => setLocation({ city: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">
                    {location.country === "Canada" ? "Province" : "State"}
                  </label>
                  <Select
                    value={location.state}
                    onValueChange={(value) => setLocation({ state: value })}
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue
                        placeholder={
                          location.country === "Canada" ? "Select province" : "Select state"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-96 overflow-y-auto">
                      {location.country === "Canada" ? (
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
                            name: state.properties.name
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">Postal Code</label>
                  <Input
                    placeholder={location.country === "Canada" ? "Enter postal code" : "Enter zip code"}
                    className="w-full"
                    size="lg"
                    value={location.zip_code}
                    onChange={(e) => setLocation({ zip_code: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base lg:text-xl font-bold text-primary">Team Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm lg:text-base font-medium">Team Size</label>
                <Select
                  value={team.team_size}
                  onValueChange={(value) => setTeam({ team_size: value })}
                >
                  <SelectTrigger className="w-full" size="lg">
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="500">500+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm lg:text-base font-medium">Work Style</label>
                <Select
                  value={team.work_style}
                  onValueChange={(value) => setTeam({ work_style: value })}
                >
                  <SelectTrigger className="w-full" size="lg">
                    <SelectValue placeholder="Select work style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base lg:text-xl font-bold text-primary">Founders Information</h2>
            <div className="space-y-2">
              <label className="text-sm lg:text-base font-medium">Background of The Founders</label>
              <Textarea
                placeholder="Tell us about the founders..."
                className="min-h-[150px] resize-none w-full"
                value={team.founders_background}
                onChange={(e) => setTeam({ founders_background: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfilePage;
