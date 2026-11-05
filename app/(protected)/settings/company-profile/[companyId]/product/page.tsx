"use client";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { useCompanyProfileStore } from "@/app/store/companyProfileStore";

const ProductPage = () => {
  const { productInformation, setProductInformation } = useCompanyProfileStore();
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-3xl mb-24">
        <div className="space-y-8 p-6 w-full">
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-base lg:text-xl font-bold text-primary">Product Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">Product Stage</label>
                  <Select
                    value={productInformation.productStage}
                    onValueChange={(value) => setProductInformation({ productStage: value })}
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select One" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concept">Concept</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="launch">Launch</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm lg:text-base font-medium">Product Type</label>
                  <Select
                    value={productInformation.productType}
                    onValueChange={(value) => setProductInformation({ productType: value })}
                  >
                    <SelectTrigger className="w-full" size="lg">
                      <SelectValue placeholder="Select One" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="hardware">Hardware</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="platform">Platform</SelectItem>
                      <SelectItem value="mobile-app">Mobile App</SelectItem>
                      <SelectItem value="web-app">Web App</SelectItem>
                      <SelectItem value="marketplace">Marketplace</SelectItem>
                      <SelectItem value="ai-solution">AI Solution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm lg:text-base font-medium">
                Do you have a subscription model?
              </label>
              <Select
                value={productInformation.subscriptionModel}
                onValueChange={(value) => setProductInformation({ subscriptionModel: value })}
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
  );
};

export default ProductPage;
