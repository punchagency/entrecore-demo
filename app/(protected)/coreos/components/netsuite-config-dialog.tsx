"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronLeft, CircleHelp, Upload, FileText, X } from "lucide-react";

import { useMe } from "@/hooks/use-me";
import { Axios } from "@/app/config/axios";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Company } from "@/app/store/companiesStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlatformConnectorId } from "../hooks/usePlatformConnectorId";
import { PLATFORM_ERP_TYPES } from "../services/platform-connector-api";

interface NetSuiteConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onServiceSelect: (service: { id: number; name: string; logo: string; config: unknown }) => void;
  selectedCompany?: Company | null;
}

export function NetSuiteConfigDialog({
  isOpen,
  onClose,
  onBack,
  onServiceSelect,
  selectedCompany,
}: NetSuiteConfigDialogProps) {
  const { connectorId, isResolving, resolveError } = usePlatformConnectorId(
    PLATFORM_ERP_TYPES.netsuite,
    process.env.NEXT_PUBLIC_NET_SUITE_CONNECTOR_ID
  );
  const { isLoading: isUserLoading, error: userError } = useMe();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = React.useState({
    account_id: "",
    consumer_key: "",
    consumer_secret: "",
    token_id: "",
    token_secret: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isUserLoading || isResolving) {
      toast.error("Please wait while we load your account information");
      return;
    }

    if (userError) {
      toast.error("Failed to load your account information. Please refresh the page.");
      return;
    }

    if (!connectorId) {
      toast.error(resolveError || "NetSuite is not available on this platform yet.");
      return;
    }

    try {
      if (!selectedCompany?.id) {
        toast.error("No company selected. Please select a company from the dropdown.");
        return;
      }

      await Axios.post(`/data/connectors/${connectorId}/configs`, {
        connector_id: connectorId,
        company_id: selectedCompany.id,
        connector_role: ["source"],
        config: formData,
      });

      // Save NetSuite connection state and config to localStorage for persistence
      try {
        const key = `netsuite_connected_${selectedCompany.id}`;
        localStorage.setItem(
          key,
          JSON.stringify({
            connected: true,
            timestamp: Date.now(),
            companyId: selectedCompany.id,
          })
        );
        // Also save the full config for editing
        localStorage.setItem(`netsuite_config_${selectedCompany.id}`, JSON.stringify(formData));
      } catch (error) {
        console.warn("Failed to save NetSuite state to localStorage:", error);
      }

      onServiceSelect({
        id: 27,
        name: "NetSuite",
        logo: "/svgs/netsuite.svg",
        config: formData,
      });

      onClose();
    } catch (error) {
      console.error("Error configuring NetSuite connector:", error);
      toast.error("Failed to configure NetSuite connector. Please try again.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      toast.error("Please upload a valid JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);

        // Handle different possible JSON structures for NetSuite credentials
        let netsuiteData;
        if (jsonContent.config && jsonContent.config.credentials) {
          netsuiteData = jsonContent.config.credentials;
        } else if (jsonContent.credentials) {
          netsuiteData = jsonContent.credentials;
        } else {
          netsuiteData = jsonContent;
        }

        setFormData({
          account_id: netsuiteData.account_id || netsuiteData.accountId || "",
          consumer_key: netsuiteData.consumer_key || netsuiteData.consumerKey || "",
          consumer_secret: netsuiteData.consumer_secret || netsuiteData.consumerSecret || "",
          token_id: netsuiteData.token_id || netsuiteData.tokenId || "",
          token_secret: netsuiteData.token_secret || netsuiteData.tokenSecret || "",
        });

        toast.success("NetSuite credentials loaded successfully!");
      } catch {
        toast.error("Invalid JSON file. Please check your file and try again.");
      }
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Ensure proper cleanup when dialog closes
          setTimeout(() => {
            onClose();
          }, 0);
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[550px] bg-white/90 backdrop-blur-3xl rounded-[2.5rem] border-white/60 shadow-[0_30px_100px_rgba(37,99,235,0.12)] border p-0 overflow-hidden [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <DialogHeader className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-blue-50 hover:bg-white border border-blue-100/50 hover:border-blue-200 text-blue-600 transition-all"
                onClick={onBack}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight text-gray-900">Configure <span className="text-blue-600">NetSuite</span></DialogTitle>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Terminal Link Authorization</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full bg-gray-50/50 hover:bg-white border border-gray-100/50 hover:border-gray-200 text-gray-400 hover:text-gray-900 transition-all shadow-sm"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* File Upload Section */}
                <div
                  onClick={handleUploadClick}
                  className="group relative bg-white/40 hover:bg-white rounded-[1.8rem] p-8 border-2 border-dashed border-blue-100 hover:border-blue-400 transition-all duration-500 cursor-pointer text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.8rem]" />
                  <div className="relative">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">
                      Upload Credentials JSON
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                      Auto-populate all fields via NetSuite credentials file
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center px-8">
                    <span className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.2em]">
                    <span className="bg-[#FFFFFF]/40 px-4 text-gray-400">Manual Entry Sequence</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="px-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Identifier</Label>
                    </div>
                    <Input
                      value={formData.account_id}
                      onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                      placeholder="e.g. TSTDRV1234567"
                      required
                      className="h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                    />
                  </div>

                  <div className="bg-white/40 border border-white/60 rounded-[1.8rem] p-6 space-y-6 shadow-sm">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 px-1">Security Token Sequence</h3>

                    <div>
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Consumer Key</Label>
                      <Input
                        value={formData.consumer_key}
                        onChange={(e) => setFormData({ ...formData, consumer_key: e.target.value })}
                        placeholder="Consumer Key Hash..."
                        required
                        className="h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Consumer Secret</Label>
                      <Input
                        type="password"
                        value={formData.consumer_secret}
                        onChange={(e) =>
                          setFormData({ ...formData, consumer_secret: e.target.value })
                        }
                        placeholder="Consumer Secret Hash..."
                        required
                        className="h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Token ID</Label>
                        <Input
                          value={formData.token_id}
                          onChange={(e) => setFormData({ ...formData, token_id: e.target.value })}
                          placeholder="Token ID..."
                          required
                          className="h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">Token Secret</Label>
                        <Input
                          type="password"
                          value={formData.token_secret}
                          onChange={(e) => setFormData({ ...formData, token_secret: e.target.value })}
                          placeholder="Token Secret..."
                          required
                          className="h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-white/30 border-t border-white/60 mt-auto">
              <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] shadow-xl shadow-blue-500/25 text-[11px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98]">
                Authorize Connector
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
