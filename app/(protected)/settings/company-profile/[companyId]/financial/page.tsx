"use client";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { useCompanyProfileStore } from "@/app/store/companyProfileStore";

const FinancialPage = () => {
  const { revenueStage, setRevenueStage: setRevenueStageStore } = useCompanyProfileStore();

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-3xl mb-24">
        <div className="space-y-8 p-6 w-full">
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-base lg:text-xl font-bold text-primary">Revenue Stage</h2>
              <div className="space-y-2">
                <label className="text-sm lg:text-base font-medium">Revenue Stage</label>
                <Select
                  value={revenueStage.revenueStage}
                  onValueChange={(value) => setRevenueStageStore({ revenueStage: value })}
                >
                  <SelectTrigger className="w-full" size="lg">
                    <SelectValue placeholder="Select One" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-revenue">Pre-Revenue</SelectItem>
                    <SelectItem value="post-revenue">Post-Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div
              className={`space-y-4 ${revenueStage.revenueStage === "pre-revenue" ? "opacity-100" : "opacity-50"}`}
            >
              <h2 className="text-base lg:text-xl font-bold text-primary">For Pre-Revenue</h2>
              <div className="space-y-2">
                <label className="text-sm lg:text-base font-medium">
                  When do you expect to be generating revenue?
                </label>
                <Select
                  disabled={revenueStage.revenueStage !== "pre-revenue"}
                  value={revenueStage.expectToBeGeneratingRevenue}
                  onValueChange={(value) =>
                    setRevenueStageStore({ expectToBeGeneratingRevenue: value })
                  }
                >
                  <SelectTrigger className="w-full" size="lg">
                    <SelectValue placeholder="Select One" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-3">1-3</SelectItem>
                    <SelectItem value="3-6">3-6</SelectItem>
                    <SelectItem value="6-12">6-12</SelectItem>
                    <SelectItem value="12-24">12-24</SelectItem>
                    <SelectItem value="24-36">24-36</SelectItem>
                    <SelectItem value="36-48">36-48</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div
              className={`space-y-4 ${revenueStage.revenueStage === "post-revenue" ? "opacity-100" : "opacity-50"}`}
            >
              <h2 className="text-base lg:text-xl font-bold text-primary">For Post-Revenue</h2>
              <div className="space-y-2">
                <label className="text-sm lg:text-base font-medium">Revenue</label>
                <Select
                  disabled={revenueStage.revenueStage !== "post-revenue"}
                  value={revenueStage.revenue}
                  onValueChange={(value) => setRevenueStageStore({ revenue: value })}
                >
                  <SelectTrigger className="w-full" size="lg">
                    <SelectValue placeholder="Select One" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialPage;
