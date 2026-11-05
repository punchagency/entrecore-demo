"use client";
import { Link2 } from "lucide-react";

import { Button } from "./ui/button";

const DelinkAccount = () => {
  const integrations = [
    {
      id: "quickbooks",
      name: "QuickBooks",
      domain: "quickbooks.intuit.com",
      color: "#2ca01c"
    },
    {
      id: "xero",
      name: "Xero",
      domain: "xero.com",
      color: "#13b5ea"
    },
  ];

  return (
    <div className="account-section-card">
      <div className="account-section-header">
        <div className="account-section-icon">
          <Link2 className="w-4 h-4" />
        </div>
        <div>
          <h2 className="account-section-title">Delink Integrations</h2>
          <p className="account-section-desc">Manage your connected third-party accounts</p>
        </div>
      </div>

      <div className="account-section-body">
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between p-5 border border-gray-100 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-inner"
                  style={{ backgroundColor: integration.color }}
                >
                  {integration.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="font-bold text-[0.9375rem] text-[#1e1b4b]">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.domain}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => { }}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors font-semibold"
              >
                Delink
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DelinkAccount;
