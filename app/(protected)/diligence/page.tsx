"use client";

import Image from "next/image";
import { toast } from "sonner";
import { useState } from "react";
import { MoreVertical, Mail, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/page-header";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Company {
  id: string;
  name: string;
  logo: string;
  daysRemaining: number;
  contact: {
    name: string;
    email: string;
  };
  category: string;
  round: string;
}

const companiesInReview: Company[] = [
  {
    id: "1",
    name: "Dropstyle",
    logo: "/svgs/brands/Frame 296.png",
    daysRemaining: 4,
    contact: {
      name: "Tiffany Wu",
      email: "tiffany@example.com",
    },
    category: "Software",
    round: "Seed",
  },
  {
    id: "2",
    name: "Entrecore",
    logo: "/svgs/brands/Frame 296 2.png",
    daysRemaining: 7,
    contact: {
      name: "Michael Kelly",
      email: "michael@example.com",
    },
    category: "Software",
    round: "Seed",
  },
  {
    id: "3",
    name: "Gallium",
    logo: "/svgs/brands/Frame 296 3.png",
    daysRemaining: 13,
    contact: {
      name: "David Flores",
      email: "david@example.com",
    },
    category: "Software",
    round: "Seed",
  },
  {
    id: "4",
    name: "nVenue",
    logo: "/svgs/brands/shape.svg",
    daysRemaining: 24,
    contact: {
      name: "Kelly Pracht",
      email: "kelly@example.com",
    },
    category: "Software",
    round: "Seed",
  },
  {
    id: "5",
    name: "Prosper.ai",
    logo: "/svgs/brands/Prosper.ai.png",
    daysRemaining: 36,
    contact: {
      name: "Andrew Denton",
      email: "andrew@example.com",
    },
    category: "Software",
    round: "Seed",
  },
];

const CompanyLogo = ({ name, logoPath }: { name: string; logoPath: string }) => {
  if (logoPath.endsWith(".svg")) {
    return (
      <div className="w-10 h-10 relative flex items-center justify-center rounded overflow-hidden">
        <Image src={logoPath} alt={name} width={40} height={40} />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 relative flex items-center justify-center rounded overflow-hidden">
      <Image src={logoPath} alt={name} width={40} height={40} style={{ objectFit: "cover" }} />
    </div>
  );
};

const DiligencePage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader title="Diligence" />

      <div className="bg-transparent">
        <Tabs defaultValue="in-review" className="w-full">
          <div className="border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2">
              <TabsList className="bg-transparent h-auto border-0 shadow-none">
                <TabsTrigger
                  value="in-review"
                  className="px-3 sm:px-4 cursor-pointer py-3 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  In Review
                </TabsTrigger>
                <TabsTrigger
                  value="pending-access"
                  className="px-3 sm:px-4 cursor-pointer py-3 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Pending Access
                </TabsTrigger>
              </TabsList>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 mb-2 sm:mb-0 mt-2 sm:mt-0 w-full sm:w-auto"
                  >
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
                        d="M6.87677 0.764139C7.17602 0.678637 7.49325 0.678637 7.7925 0.764139L12.7925 2.19271C13.508 2.39714 14.0013 3.05112 14.0013 3.79525V5.25C14.0013 5.71024 13.6282 6.08333 13.168 6.08333C12.7077 6.08333 12.3346 5.71024 12.3346 5.25V3.79525L7.33464 2.36668L2.33464 3.79525V8.04485C2.33464 10.467 3.50438 12.74 5.47535 14.1479L7.819 15.8219C8.19351 16.0894 8.28025 16.6099 8.01275 16.9844C7.74524 17.3589 7.22478 17.4456 6.85027 17.1781L4.50662 15.5041C2.09765 13.7834 0.667969 11.0052 0.667969 8.04485V3.79525C0.667969 3.05112 1.16126 2.39714 1.87677 2.19271L6.87677 0.764139ZM10.668 9.83333C10.668 8.45262 11.7873 7.33333 13.168 7.33333C14.5487 7.33333 15.668 8.45262 15.668 9.83333V10.8089C16.639 11.1521 17.3346 12.0781 17.3346 13.1667V14.8333C17.3346 16.214 16.2153 17.3333 14.8346 17.3333H11.5013C10.1206 17.3333 9.0013 16.214 9.0013 14.8333V13.1667C9.0013 12.0781 9.69697 11.1521 10.668 10.8089V9.83333ZM12.3346 10.6667H14.0013V9.83333C14.0013 9.37309 13.6282 9 13.168 9C12.7077 9 12.3346 9.37309 12.3346 9.83333V10.6667ZM11.5013 12.3333C11.0411 12.3333 10.668 12.7064 10.668 13.1667V14.8333C10.668 15.2936 11.0411 15.6667 11.5013 15.6667H14.8346C15.2949 15.6667 15.668 15.2936 15.668 14.8333V13.1667C15.668 12.7064 15.2949 12.3333 14.8346 12.3333H11.5013Z"
                        fill="#181818"
                      />
                    </svg>
                    <span>Request Access</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                  <div className="p-6 pb-0">
                    <div className="flex items-center justify-between mb-6">
                      <DialogTitle className="text-[22px] font-bold">
                        Request Data Access
                      </DialogTitle>
                    </div>

                    <div className="space-y-6 pb-4">
                      <div className="space-y-2">
                        <label className="text-sm block my-1">Company Name</label>
                        <Input placeholder="Company name" className="h-14 text-base" size="lg" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm block my-1">Contact Email Address</label>
                        <Input
                          type="email"
                          placeholder="Email Address"
                          className="h-14 text-base"
                          size="lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 space-y-2">
                    <Button
                      className="w-full h-[40px] cursor-pointer"
                      onClick={() => {
                        setDialogOpen(false);
                        toast.success("Request sent successfully!");
                      }}
                    >
                      Send Request
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full h-[30px] text-[10px] text-gray-400 hover:text-primary font-bold uppercase tracking-widest"
                      onClick={() => {
                        setDialogOpen(false);
                        toast.success("Demo Mode: Access granted for 14 days!");
                      }}
                    >
                      Demo Mode: Auto-Approve
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="in-review" className="p-2 bg-transparent mt-0">
            <h2 className="text-lg font-semibold mb-3 px-1">In Review</h2>
            <div className="overflow-hidden bg-transparent border-0">
              <div className="space-y-1">
                <div className="hidden md:grid md:grid-cols-5 gap-3 pb-2 px-2 text-sm text-gray-500 font-medium">
                  <div>Company</div>
                  <div>Access Remaining</div>
                  <div>Contact</div>
                  <div>Category</div>
                  <div>Round</div>
                </div>

                {companiesInReview.map((company) => (
                  <div
                    key={company.id}
                    className="bg-white rounded-md cursor-pointer hover:bg-gray-50"
                  >
                    <div className="hidden md:grid md:grid-cols-5 gap-3 items-center px-2 py-3">
                      <div className="flex items-center gap-2">
                        <CompanyLogo name={company.name} logoPath={company.logo} />
                        <span className="font-medium">{company.name}</span>
                      </div>
                      <div>{company.daysRemaining} days</div>
                      <div className="flex items-center gap-1">
                        {company.contact.name}
                        <Mail className="h-4 w-4 ml-1 text-gray-400" />
                      </div>
                      <div>{company.category}</div>
                      <div className="flex items-center justify-between">
                        <span>{company.round}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Request extension</DropdownMenuItem>
                            <DropdownMenuItem>Contact</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="md:hidden flex items-center justify-between px-2 py-3">
                      <div className="flex items-center gap-2">
                        <CompanyLogo name={company.name} logoPath={company.logo} />
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-sm text-gray-500">
                            {company.daysRemaining} days remaining
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pending-access" className="p-2 bg-transparent mt-0">
            <h2 className="text-lg font-semibold mb-3 px-1">Pending Access</h2>
            <div className="flex flex-col items-center justify-center p-6 text-center bg-transparent">
              <p className="text-muted-foreground">No pending access requests</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DiligencePage;
