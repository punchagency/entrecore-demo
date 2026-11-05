"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const linkAccountSchema = z.object({
  connectedAccounts: z.array(z.string()).optional(),
});

export default function LinkAccountPage() {
  const router = useRouter();
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (provider: string) => {
    setIsConnecting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setConnectedAccounts((prev) => [...prev, provider]);
      toast.success(`Successfully connected to ${provider}`);
    } catch (error) {
      toast.error(`Failed to connect to ${provider}`);
      console.error(`Error connecting to ${provider}:`, error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFinish = async () => {
    try {
      linkAccountSchema.parse({ connectedAccounts });

      router.push("/metrics");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Please fix the validation errors");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  const handleBack = () => {
    router.back();
  };

  const integrations = [
    {
      name: "QuickBooks",
      domain: "quickbooks.intuit.com",
      logo: "/dummy-quickbooks-logo.png",
      id: "quickbooks",
      description: "Connect your QuickBooks account to sync your financial data",
    },
    {
      name: "Xero",
      domain: "xero.com",
      logo: "/dummy-xero-logo.png",
      id: "xero",
      description: "Link your Xero account to import your accounting information",
    },
    {
      name: "FreshBooks",
      domain: "freshbooks.com",
      logo: "/dummy-freshbooks-logo.png",
      id: "freshbooks",
      description: "Connect FreshBooks to sync your invoices and expenses",
    },
    {
      name: "Wave",
      domain: "waveapps.com",
      logo: "/dummy-wave-logo.png",
      id: "wave",
      description: "Link your Wave account to import your financial records",
    },
  ];

  return (
    <Card className="w-full max-w-3xl mb-24">
      <div className="space-y-8 p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-primary">Link Your Accounts</h2>
            <p className="text-muted-foreground">
              Connect your accounting software to sync your financial data and get started with
              EntreCore.
            </p>
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 relative bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="w-8 h-8 relative">
                        <div
                          className="w-full h-full rounded"
                          style={{
                            background: `hsl(${Math.random() * 360}, 70%, 70%)`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium">{integration.name}</h3>
                      <p className="text-sm text-muted-foreground">{integration.domain}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={connectedAccounts.includes(integration.id) ? "default" : "secondary"}
                    onClick={() => handleConnect(integration.id)}
                    disabled={isConnecting || connectedAccounts.includes(integration.id)}
                  >
                    {connectedAccounts.includes(integration.id) ? "Connected" : "Connect"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="container max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleBack} className="px-8">
              Back
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConnectedAccounts(integrations.map(i => i.id));
                toast.success("Demo Mode: All accounts connected!");
              }}
              className="px-4 text-[10px] text-gray-400 hover:text-primary font-bold uppercase tracking-widest"
            >
              Demo Mode: Link All
            </Button>
            <Button onClick={handleFinish} className="px-8" disabled={isConnecting}>
              Finish
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
