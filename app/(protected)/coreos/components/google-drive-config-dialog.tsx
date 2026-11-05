"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronLeft, CircleHelp, FileText, KeyRound, Globe, X, Loader2 } from "lucide-react";

import { useMe } from "@/hooks/use-me";
import { Axios } from "@/app/config/axios";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Company } from "@/app/store/companiesStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlatformConnectorId } from "../hooks/usePlatformConnectorId";

type AuthMethod = "service_account" | "oauth";

const GDRIVE_ERP_TYPE = "google_drive";

interface GoogleDriveConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onServiceSelect: (service: { id: number; name: string; logo: string; config: unknown }) => void;
  selectedCompany?: Company | null;
}

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

const EMPTY_CREDENTIALS: ServiceAccountCredentials = {
  type: "service_account",
  project_id: "",
  private_key_id: "",
  private_key: "",
  client_email: "",
  client_id: "",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "",
  universe_domain: "googleapis.com",
};

function cleanPrivateKey(rawKey: string): string {
  if (!rawKey) return "";
  return rawKey
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, '"')
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

export function GoogleDriveConfigDialog({
  isOpen,
  onClose,
  onBack,
  onServiceSelect,
  selectedCompany,
}: GoogleDriveConfigDialogProps) {
  const { connectorId, isResolving, resolveError } = usePlatformConnectorId(
    "google_drive",
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CONNECTOR_ID
  );
  const { isLoading: isUserLoading, error: userError } = useMe();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [authMethod, setAuthMethod] = React.useState<AuthMethod>("service_account");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [credentials, setCredentials] = React.useState<ServiceAccountCredentials>(EMPTY_CREDENTIALS);

  const setCredentialField = (key: keyof ServiceAccountCredentials, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
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

        // Accept both a raw service account file and our wrapped config export
        const serviceAccountData = jsonContent.config?.credentials || jsonContent.credentials || jsonContent;

        if (serviceAccountData.type !== "service_account") {
          toast.error("Please upload a valid service account JSON file");
          return;
        }

        setCredentials({
          ...EMPTY_CREDENTIALS,
          type: "service_account",
          project_id: serviceAccountData.project_id || "",
          private_key_id: serviceAccountData.private_key_id || "",
          private_key: cleanPrivateKey(serviceAccountData.private_key || ""),
          client_email: serviceAccountData.client_email || "",
          client_id: serviceAccountData.client_id || "",
          auth_uri: serviceAccountData.auth_uri || EMPTY_CREDENTIALS.auth_uri,
          token_uri: serviceAccountData.token_uri || EMPTY_CREDENTIALS.token_uri,
          auth_provider_x509_cert_url:
            serviceAccountData.auth_provider_x509_cert_url ||
            EMPTY_CREDENTIALS.auth_provider_x509_cert_url,
          client_x509_cert_url: serviceAccountData.client_x509_cert_url || "",
          universe_domain: serviceAccountData.universe_domain || EMPTY_CREDENTIALS.universe_domain,
        });

        toast.success("Service account credentials loaded successfully!");
      } catch {
        toast.error("Invalid JSON file. Please check your file and try again.");
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read file. Please try again.");
    };

    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const ensureReady = (): boolean => {
    if (isUserLoading) {
      toast.error("Please wait while we load your account information");
      return false;
    }
    if (userError) {
      toast.error("Failed to load your account information. Please refresh the page.");
      return false;
    }
    if (!selectedCompany?.id) {
      toast.error("No company selected. Please select a company from the dropdown.");
      return false;
    }
    return true;
  };

  const handleServiceAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureReady() || isSubmitting || isResolving || !connectorId) {
      if (!connectorId && !isResolving) {
        toast.error(resolveError || "Google Drive is not available on this platform yet.");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const config = {
        auth_type: "service_account",
        credentials,
      };

      await Axios.post(`/data/connectors/${connectorId}/configs`, {
        connector_id: connectorId,
        company_id: selectedCompany!.id,
        connector_role: ["source"],
        config,
      });

      onServiceSelect({
        id: 29,
        name: "Google Drive",
        logo: "/svgs/brands/google-drive.svg",
        config,
      });

      onClose();
    } catch (error) {
      console.error("Error configuring Google Drive connector:", error);
      toast.error("Failed to configure Google Drive connector. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthConnect = async () => {
    if (!ensureReady() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await Axios.post(
        `/data/connectors/by-type/${GDRIVE_ERP_TYPE}/oauth/start`,
        {
          company_id: selectedCompany!.id,
          redirect_uri: `${window.location.origin}/coreos`,
        }
      );

      const authorizationUrl = response.data?.authorization_url;
      if (!authorizationUrl) {
        toast.error("Failed to start Google OAuth flow. Please try again.");
        return;
      }

      // Marker lets us verify and finalize the connection after the redirect returns
      try {
        localStorage.setItem(
          `gdrive_oauth_pending_${selectedCompany!.id}`,
          JSON.stringify({ startedAt: Date.now(), companyId: selectedCompany!.id })
        );
      } catch (error) {
        console.warn("Failed to save Google Drive OAuth marker:", error);
      }

      window.location.assign(authorizationUrl);
    } catch (error) {
      console.error("Error starting Google Drive OAuth:", error);
      toast.error("Failed to start Google OAuth flow. Please try again.");
      setIsSubmitting(false);
    }
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
                <DialogTitle className="text-2xl font-black tracking-tight text-gray-900">
                  Configure <span className="text-blue-600">Google Drive</span>
                </DialogTitle>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
                  Terminal Link Authorization
                </p>
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

        <form onSubmit={handleServiceAccountSubmit}>
          <div className="flex flex-col h-[500px]">
            {/* Auth Method Selector */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/50 border border-white/60 rounded-2xl shadow-sm">
                {(
                  [
                    { method: "service_account", label: "Service Account", icon: KeyRound },
                    { method: "oauth", label: "OAuth 2.0", icon: Globe },
                  ] as const
                ).map(({ method, label, icon: Icon }) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setAuthMethod(method)}
                    className={cn(
                      "flex items-center justify-center gap-2 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      authMethod === method
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                        : "text-gray-400 hover:text-blue-600 hover:bg-blue-50/50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {authMethod === "service_account" ? (
                <div className="p-6 pt-2 space-y-6">
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
                        Upload Service Account JSON
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-[220px] mx-auto leading-relaxed">
                        Auto-populate all fields via Google service account key file
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

                  <div className="bg-white/40 border border-white/60 rounded-[1.8rem] p-6 space-y-6 shadow-sm">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 px-1">
                      Security Credentials
                    </h3>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Project ID
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CircleHelp className="h-3.5 w-3.5 text-gray-300 hover:text-blue-500 cursor-help transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 border-gray-800 text-white rounded-xl p-3 shadow-2xl">
                            <p className="max-w-[220px] text-[11px] font-medium leading-relaxed">
                              The Google Cloud project that owns the service account with Drive API access.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        value={credentials.project_id}
                        onChange={(e) => setCredentialField("project_id", e.target.value)}
                        placeholder="e.g. enterprise-core-42"
                        required
                        className="h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                        Service Client Email
                      </Label>
                      <Input
                        type="email"
                        value={credentials.client_email}
                        onChange={(e) => setCredentialField("client_email", e.target.value)}
                        placeholder="drive-reader@project.iam.gserviceaccount.com"
                        required
                        className="h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                        Private Key ID
                      </Label>
                      <Input
                        value={credentials.private_key_id}
                        onChange={(e) => setCredentialField("private_key_id", e.target.value)}
                        placeholder="Key Hash Identifier..."
                        required
                        className="h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                        RSA Private Key
                      </Label>
                      <Textarea
                        value={credentials.private_key}
                        onChange={(e) => setCredentialField("private_key", e.target.value)}
                        placeholder="Paste entire key block..."
                        required
                        className="font-mono text-[11px] h-32 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 resize-none overflow-y-auto w-full custom-scrollbar p-4"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                        System Client ID
                      </Label>
                      <Input
                        value={credentials.client_id}
                        onChange={(e) => setCredentialField("client_id", e.target.value)}
                        placeholder="Numerical ID..."
                        required
                        className="h-12 bg-white/50 border-white/60 rounded-2xl focus-visible:ring-blue-600 focus-visible:ring-offset-0 font-bold text-gray-800"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed px-2">
                    Share the target Drive folders with the service client email above, then authorize.
                    Credentials are stored per company and never exposed to other tenants.
                  </p>
                </div>
              ) : (
                <div className="p-6 pt-2 space-y-6">
                  <div className="bg-white/40 border border-white/60 rounded-[1.8rem] p-8 text-center shadow-sm">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                      <Globe className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-2">
                      Connect With Google
                    </h3>
                    <p className="text-[11px] font-medium text-gray-500 leading-relaxed max-w-[320px] mx-auto">
                      You will be redirected to Google to grant read access to Drive files for{" "}
                      <span className="font-bold text-gray-700">
                        {selectedCompany?.company_name || "the selected company"}
                      </span>
                      . After approving, you will be returned here automatically.
                    </p>
                  </div>

                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-[1.8rem] p-6">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3">
                      What happens next
                    </h4>
                    <ol className="space-y-2 text-[11px] font-medium text-gray-500 leading-relaxed list-decimal list-inside">
                      <li>Sign in with the Google account that owns or can view the Drive files.</li>
                      <li>Approve the requested Drive permissions on the Google consent screen.</li>
                      <li>Tokens are stored server-side, scoped to this company only.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-white/30 border-t border-white/60 mt-auto">
              {resolveError && !isResolving && authMethod === "service_account" && (
                <p className="mb-4 text-[11px] font-medium text-amber-700 text-center px-2">
                  {resolveError}
                </p>
              )}
              {authMethod === "service_account" ? (
                <Button
                  type="submit"
                  disabled={isSubmitting || isResolving || !connectorId}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] shadow-xl shadow-blue-500/25 text-[11px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98]"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Authorize Connector
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleOAuthConnect}
                  disabled={isSubmitting}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] shadow-xl shadow-blue-500/25 text-[11px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98]"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Connect With Google
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
