"use client";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { useCompanyProfileStore } from "@/app/store/companyProfileStore";

const FundraisingPage = () => {
  const { fundraisingStatus, currentFundraising, setFundraisingStatus, setCurrentFundraising } =
    useCompanyProfileStore();
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-3xl mb-24">
        <div className="space-y-8 p-6 w-full">
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-base lg:text-xl font-bold text-primary">Fundraising Status</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">
                    Current Complete Fundraising
                  </label>
                  <Select
                    value={fundraisingStatus.currentCompleteFundraising}
                    onValueChange={(value) =>
                      setFundraisingStatus({ currentCompleteFundraising: value })
                    }
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select One" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="0-10">0-10</SelectItem>
                      <SelectItem value="11-50">11-50</SelectItem>
                      <SelectItem value="51-200">51-200</SelectItem>
                      <SelectItem value="201-500">201-500</SelectItem>
                      <SelectItem value="501+">501+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">
                    Do you expect to raise in the next 12 months?
                  </label>
                  <Select
                    value={fundraisingStatus.expectedRaiseNext12Months}
                    onValueChange={(value) =>
                      setFundraisingStatus({ expectedRaiseNext12Months: value })
                    }
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select One" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="maybe">Maybe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-base lg:text-xl font-bold text-primary">Current Fundraising</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">
                    What funding stage are you pursuing?
                  </label>
                  <Select
                    value={currentFundraising.fundingStage}
                    onValueChange={(value) => setCurrentFundraising({ fundingStage: value })}
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select One" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="series-b">Series B</SelectItem>
                      <SelectItem value="series-c">Series C</SelectItem>
                      <SelectItem value="series-d">Series D</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">
                    What is the target investment amount?
                  </label>
                  <Select
                    value={currentFundraising.targetInvestmentAmount}
                    onValueChange={(value) =>
                      setCurrentFundraising({ targetInvestmentAmount: value })
                    }
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select One" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50000">$50,000 - $100,000</SelectItem>
                      <SelectItem value="100000">$100,000 - $250,000</SelectItem>
                      <SelectItem value="250000">$250,000 - $500,000</SelectItem>
                      <SelectItem value="500000">$500,000 - $1M</SelectItem>
                      <SelectItem value="1000000">$1M - $5M</SelectItem>
                      <SelectItem value="5000000">$5M+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundraisingPage;
