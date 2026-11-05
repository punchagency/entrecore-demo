"use client";

import { toast } from "sonner";
import * as React from "react";
import { ChevronLeft, CircleHelp, Database, Eye, EyeOff, Upload, X } from "lucide-react";

import { useMe } from "@/hooks/use-me";
import { Axios } from "@/app/config/axios";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Company } from "@/app/store/companiesStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EditConnectorConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  connectorId: string;
  selectedCompany?: Company | null;
  onSuccess?: () => void;
}

export function EditConnectorConfigDialog({
  isOpen,
  onClose,
  onBack,
  connectorId,
  selectedCompany,
  onSuccess,
}: EditConnectorConfigDialogProps) {
  const { isLoading: isUserLoading, error: userError } = useMe();
  const [isLoadingConfig, setIsLoadingConfig] = React.useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Determine connector type based on connector ID
  const isBigQuery = connectorId === process.env.NEXT_PUBLIC_BIG_QUERY_CONNECTOR_ID;
  const isNetSuite = connectorId === process.env.NEXT_PUBLIC_NET_SUITE_CONNECTOR_ID;
  const isAirtable = connectorId === process.env.NEXT_PUBLIC_AIRTABLE_CONNECTOR_ID;
  const isNotion = connectorId === process.env.NEXT_PUBLIC_NOTION_CONNECTOR_ID;

  // BigQuery form data
  const [bigQueryFormData, setBigQueryFormData] = React.useState({
    project_id: "",
    credentials: {
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
    },
  });

  // NetSuite form data
  const [netSuiteFormData, setNetSuiteFormData] = React.useState({
    account_id: "",
    consumer_key: "",
    consumer_secret: "",
    token_id: "",
    token_secret: "",
  });

  // Airtable form data
  const [airtableFormData, setAirtableFormData] = React.useState({
    api_key: "",
  });

  // Notion form data
  const [notionFormData, setNotionFormData] = React.useState({
    api_key: "",
  });
  const [showApiKey, setShowApiKey] = React.useState(false);

  const [configId, setConfigId] = React.useState<string>("");
  const [connectorRole, setConnectorRole] = React.useState<string[]>(["source"]);

  React.useEffect(() => {
    const fetchConfig = async () => {
      if (!isOpen || !selectedCompany?.id) return;

      try {
        setIsLoadingConfig(true);
        const response = await Axios.get(`/data/connectors/${connectorId}/configs`, {
          params: {
            company_id: selectedCompany.id,
          },
        });

        if (response.data) {
          // Handle both array and object responses
          let configData = null;
          if (Array.isArray(response.data) && response.data.length > 0) {
            configData = response.data[0];
          } else if (response.data.configs && Array.isArray(response.data.configs) && response.data.configs.length > 0) {
            configData = response.data.configs[0];
          } else if (response.data.id || response.data.config) {
            configData = response.data;
          }

          if (configData) {
            if (configData.id) setConfigId(configData.id);
            if (configData.connector_role) setConnectorRole(configData.connector_role);

            const backendConfig = configData.config || {};

            if (isBigQuery) {
              // Priority: Backend Config > LocalStorage Fallback > Default State
              let mergedConfig = { ...backendConfig };

              try {
                const saved = localStorage.getItem(`bigquery_config_${selectedCompany.id}`);
                if (saved) {
                  const localData = JSON.parse(saved);
                  // Deep merge: use backend fields if non-empty, otherwise use localData
                  mergedConfig = {
                    ...localData,
                    ...backendConfig,
                    credentials: {
                      ...(localData.credentials || {}),
                      ...(backendConfig.credentials || {}),
                    },
                  };

                  // If backend has empty/redacted strings for sensitive fields, restore from localData
                  if (localData.credentials) {
                    const sensFields = ["private_key", "private_key_id", "client_id", "client_email"];
                    sensFields.forEach((field) => {
                      if (
                        !mergedConfig.credentials[field] ||
                        mergedConfig.credentials[field] === "KEEP_EXISTING" ||
                        mergedConfig.credentials[field] === "REDACTED"
                      ) {
                        mergedConfig.credentials[field] = localData.credentials[field];
                      }
                    });
                  }
                }
              } catch (e) {
                console.warn("Failed to load BigQuery config from localStorage", e);
              }

              setBigQueryFormData((prev) => ({
                ...prev,
                ...mergedConfig,
                credentials: {
                  ...prev.credentials,
                  ...(mergedConfig.credentials || {}),
                },
              }));
            } else if (isNetSuite) {
              let mergedConfig = { ...backendConfig };
              try {
                const saved = localStorage.getItem(`netsuite_config_${selectedCompany.id}`);
                if (saved) {
                  const localData = JSON.parse(saved);
                  mergedConfig = { ...localData, ...backendConfig };
                  // Restore redacted fields
                  const sensFields = [
                    "consumer_key",
                    "consumer_secret",
                    "token_id",
                    "token_secret",
                  ];
                  sensFields.forEach((field) => {
                    if (
                      !mergedConfig[field] ||
                      mergedConfig[field] === "KEEP_EXISTING" ||
                      mergedConfig[field] === "REDACTED"
                    ) {
                      mergedConfig[field] = localData[field];
                    }
                  });
                }
              } catch (e) { }

              setNetSuiteFormData((prev) => ({
                ...prev,
                ...mergedConfig,
              }));
            } else if (isAirtable) {
              const apiKey = backendConfig.api_key || backendConfig.apiKey;
              if (apiKey && apiKey !== "KEEP_EXISTING" && apiKey !== "REDACTED") {
                setAirtableFormData({ api_key: apiKey });
              } else {
                try {
                  const key = `airtable_connected_${selectedCompany.id}`;
                  const saved = localStorage.getItem(key);
                  if (saved) {
                    const data = JSON.parse(saved);
                    if (data.api_key) setAirtableFormData({ api_key: data.api_key });
                  }
                } catch (error) { }
              }
            } else if (isNotion) {
              const apiKey =
                backendConfig.api_key || backendConfig.token || backendConfig.apiKey;
              if (apiKey && apiKey !== "KEEP_EXISTING" && apiKey !== "REDACTED") {
                setNotionFormData({ api_key: apiKey });
              } else {
                try {
                  const key = `notion_connected_${selectedCompany.id}`;
                  const saved = localStorage.getItem(key);
                  if (saved) {
                    const data = JSON.parse(saved);
                    if (data.api_key) setNotionFormData({ api_key: data.api_key });
                  }
                } catch (error) { }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching connector config:", error);
        toast.error("Failed to fetch connector configuration");
      } finally {
        setIsLoadingConfig(false);
      }
    };

    if (isOpen && selectedCompany?.id) {
      fetchConfig();
    }
  }, [isOpen, selectedCompany?.id, connectorId, isBigQuery, isNetSuite, isAirtable, isNotion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isUserLoading) {
      toast.error("Please wait while we load your account information");
      return;
    }

    if (userError) {
      toast.error("Failed to load your account information. Please refresh the page.");
      return;
    }

    try {
      if (!selectedCompany?.id) {
        toast.error("Company ID not found. Please ensure you're logged in with a company account.");
        return;
      }

      const formData = isBigQuery ? bigQueryFormData : isNetSuite ? netSuiteFormData : isAirtable ? airtableFormData : notionFormData;

      await Axios.patch(`/data/connectors/${connectorId}/configs/${configId}`, {
        config: formData,
        connector_role: connectorRole,
        is_active: true,
      });

      // Update BigQuery config in localStorage
      if (isBigQuery && selectedCompany?.id) {
        try {
          localStorage.setItem(`bigquery_config_${selectedCompany.id}`, JSON.stringify(bigQueryFormData));
        } catch (e) { }
      }

      // Update NetSuite config in localStorage
      if (isNetSuite && selectedCompany?.id) {
        try {
          localStorage.setItem(`netsuite_config_${selectedCompany.id}`, JSON.stringify(netSuiteFormData));
        } catch (e) { }
      }

      // Update Airtable API key in localStorage if it was changed
      if (isAirtable && airtableFormData.api_key && selectedCompany?.id) {
        try {
          const key = `airtable_connected_${selectedCompany.id}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            const data = JSON.parse(saved);
            localStorage.setItem(
              key,
              JSON.stringify({
                ...data,
                api_key: airtableFormData.api_key,
              })
            );
          } else {
            // Create new localStorage entry if it doesn't exist
            localStorage.setItem(
              key,
              JSON.stringify({
                connected: true,
                timestamp: Date.now(),
                companyId: selectedCompany.id,
                api_key: airtableFormData.api_key,
              })
            );
          }
        } catch (error) {
          console.warn("Failed to update Airtable API key in localStorage:", error);
        }
      }

      // Update Notion API key in localStorage if it was changed
      if (isNotion && notionFormData.api_key && selectedCompany?.id) {
        try {
          const key = `notion_connected_${selectedCompany.id}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            const data = JSON.parse(saved);
            localStorage.setItem(key, JSON.stringify({ ...data, api_key: notionFormData.api_key }));
          } else {
            localStorage.setItem(key, JSON.stringify({
              connected: true,
              timestamp: Date.now(),
              companyId: selectedCompany.id,
              api_key: notionFormData.api_key
            }));
          }
        } catch (error) {
          console.warn("Failed to update Notion API key in localStorage:", error);
        }
      }

      toast.success("Connector configuration updated successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating connector config:", error);
      toast.error("Failed to update connector configuration. Please try again.");
    }
  };

  const getConnectorTitle = () => {
    if (isBigQuery) return <>Edit <span className="text-blue-600">BigQuery</span></>;
    if (isNetSuite) return <>Edit <span className="text-blue-600">NetSuite</span></>;
    if (isAirtable) return <>Edit <span className="text-blue-600">Airtable</span></>;
    if (isNotion) return <>Edit <span className="text-blue-600">Notion</span></>;
    return <>Edit <span className="text-blue-600">Connector</span></>;
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

        if (isBigQuery) {
          let serviceAccountData;
          if (jsonContent.config && jsonContent.config.credentials) {
            serviceAccountData = jsonContent.config.credentials;
            setBigQueryFormData({
              project_id: jsonContent.config.project_id || serviceAccountData.project_id || "",
              credentials: {
                ...serviceAccountData,
                type: serviceAccountData.type || "service_account",
              },
            });
          } else {
            serviceAccountData = jsonContent;
            setBigQueryFormData({
              project_id: serviceAccountData.project_id || "",
              credentials: {
                ...serviceAccountData,
                type: serviceAccountData.type || "service_account",
              },
            });
          }
          toast.success("BigQuery credentials loaded from file!");
        } else if (isNetSuite) {
          let netsuiteData = jsonContent.config?.credentials || jsonContent.credentials || jsonContent;
          setNetSuiteFormData({
            account_id: netsuiteData.account_id || netsuiteData.accountId || "",
            consumer_key: netsuiteData.consumer_key || netsuiteData.consumerKey || "",
            consumer_secret: netsuiteData.consumer_secret || netsuiteData.consumerSecret || "",
            token_id: netsuiteData.token_id || netsuiteData.tokenId || "",
            token_secret: netsuiteData.token_secret || netsuiteData.tokenSecret || "",
          });
          toast.success("NetSuite credentials loaded from file!");
        } else if (isAirtable || isNotion) {
          let data = jsonContent.config?.credentials || jsonContent.config || jsonContent.credentials || jsonContent;
          const apiKey = data.api_key || data.apiKey || data.token || "";
          if (isAirtable) setAirtableFormData({ api_key: apiKey });
          else setNotionFormData({ api_key: apiKey });
          toast.success("API key loaded from file!");
        }
      } catch {
        toast.error("Invalid JSON file. Please check your file and try again.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const renderBigQueryForm = () => (
    <div className="space-y-4">
      {/* JSON Import Section for Quick Pre-population */}
      <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors mb-6">
        <div className="text-center">
          <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">Update via JSON File</h3>
          <p className="text-xs text-gray-500 mb-3">
            Quickly fill all fields by uploading your service account JSON
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2"
          >
            Choose File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Label className="text-sm text-[#181818] font-medium">Project ID</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Your Google Cloud Project ID. This is the unique identifier for your GCP project
                  where BigQuery is enabled.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            value={bigQueryFormData.project_id}
            onChange={(e) => setBigQueryFormData({ ...bigQueryFormData, project_id: e.target.value })}
            placeholder="Enter project ID"
            required
            size="lg"
          />
        </div>

        <div className="bg-white rounded-lg p-4 space-y-4">
          <h3 className="text-[15px] font-bold">Service Account Credentials</h3>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-sm text-[#181818] font-medium">Credentials Project ID</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    The project ID associated with your service account. Usually the same as your main
                    project ID.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              value={bigQueryFormData.credentials?.project_id || ""}
              onChange={(e) =>
                setBigQueryFormData({
                  ...bigQueryFormData,
                  credentials: {
                    ...(bigQueryFormData.credentials || {
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
                    }),
                    project_id: e.target.value,
                  },
                })
              }
              placeholder="Enter credentials project ID"
              required
              size="lg"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-sm text-[#181818] font-medium">Private Key ID</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    A unique identifier for the private key. Found in your service account JSON file
                    as &quot;private_key_id&quot;.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              value={bigQueryFormData.credentials?.private_key_id || ""}
              onChange={(e) =>
                setBigQueryFormData({
                  ...bigQueryFormData,
                  credentials: {
                    ...(bigQueryFormData.credentials || {
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
                    }),
                    private_key_id: e.target.value,
                  },
                })
              }
              placeholder="Enter private key ID"
              required
              size="lg"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-sm text-[#181818] font-medium">Private Key</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    The RSA private key for authentication. Copy the entire key including
                    &quot;-----BEGIN PRIVATE KEY-----&quot; and &quot;-----END PRIVATE KEY-----&quot;.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              value={bigQueryFormData.credentials?.private_key || ""}
              onChange={(e) =>
                setBigQueryFormData({
                  ...bigQueryFormData,
                  credentials: {
                    ...(bigQueryFormData.credentials || {
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
                    }),
                    private_key: e.target.value,
                  },
                })
              }
              placeholder="Enter private key (-----BEGIN PRIVATE KEY-----...)"
              className="font-mono text-sm h-24 resize-none overflow-y-auto w-full whitespace-pre-wrap break-all"
              required
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-sm text-[#181818] font-medium">Client Email</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    The email address of your service account. Usually in the format:
                    service-account-name@project-id.iam.gserviceaccount.com
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="email"
              value={bigQueryFormData.credentials?.client_email || ""}
              onChange={(e) =>
                setBigQueryFormData({
                  ...bigQueryFormData,
                  credentials: {
                    ...(bigQueryFormData.credentials || {
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
                    }),
                    client_email: e.target.value,
                  },
                })
              }
              placeholder="Enter client email"
              required
              size="lg"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-sm text-[#181818] font-medium">Client ID</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    A unique numerical identifier for your service account client. Found in your
                    service account JSON file.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              value={bigQueryFormData.credentials?.client_id || ""}
              onChange={(e) =>
                setBigQueryFormData({
                  ...bigQueryFormData,
                  credentials: {
                    ...(bigQueryFormData.credentials || {
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
                    }),
                    client_id: e.target.value,
                  },
                })
              }
              placeholder="Enter client ID"
              required
              size="lg"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-sm text-[#181818] font-medium">Client X509 Cert URL</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    The URL for your service account&apos;s X.509 certificate. Used for verifying the
                    authenticity of your service account.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              value={bigQueryFormData.credentials?.client_x509_cert_url || ""}
              onChange={(e) =>
                setBigQueryFormData({
                  ...bigQueryFormData,
                  credentials: {
                    ...(bigQueryFormData.credentials || {
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
                    }),
                    client_x509_cert_url: e.target.value,
                  },
                })
              }
              placeholder="Enter client X509 cert URL"
              required
              size="lg"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNetSuiteForm = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors mb-6">
        <div className="text-center">
          <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">Update via JSON File</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2"
          >
            Choose File
          </Button>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-sm text-[#181818] font-medium">Account ID</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Your NetSuite account ID. This is the unique identifier for your NetSuite account.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          value={netSuiteFormData.account_id}
          onChange={(e) => setNetSuiteFormData({ ...netSuiteFormData, account_id: e.target.value })}
          placeholder="Enter account ID"
          required
          size="lg"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-sm text-[#181818] font-medium">Consumer Key</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                The consumer key from your NetSuite integration. This is used for OAuth
                authentication.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          value={netSuiteFormData.consumer_key}
          onChange={(e) =>
            setNetSuiteFormData({ ...netSuiteFormData, consumer_key: e.target.value })
          }
          placeholder="Enter consumer key"
          required
          size="lg"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-sm text-[#181818] font-medium">Consumer Secret</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                The consumer secret from your NetSuite integration. This is used for OAuth
                authentication.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          type="password"
          value={netSuiteFormData.consumer_secret}
          onChange={(e) =>
            setNetSuiteFormData({ ...netSuiteFormData, consumer_secret: e.target.value })
          }
          placeholder="Enter consumer secret"
          required
          size="lg"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-sm text-[#181818] font-medium">Token ID</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                The token ID from your NetSuite integration. This is used for OAuth authentication.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          value={netSuiteFormData.token_id}
          onChange={(e) => setNetSuiteFormData({ ...netSuiteFormData, token_id: e.target.value })}
          placeholder="Enter token ID"
          required
          size="lg"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-sm text-[#181818] font-medium">Token Secret</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                The token secret from your NetSuite integration. This is used for OAuth
                authentication.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          type="password"
          value={netSuiteFormData.token_secret}
          onChange={(e) =>
            setNetSuiteFormData({ ...netSuiteFormData, token_secret: e.target.value })
          }
          placeholder="Enter token secret"
          required
          size="lg"
        />
      </div>
    </div>
  );

  const renderAirtableForm = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-sm text-[#181818] font-medium">API Key</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Your Airtable API key. You can find this in your Airtable account settings under the
                "API" section.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Input
            type={showApiKey ? "text" : "password"}
            value={airtableFormData.api_key}
            onChange={(e) => setAirtableFormData({ ...airtableFormData, api_key: e.target.value })}
            placeholder="Enter API key"
            required
            size="lg"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showApiKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotionForm = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-sm text-[#181818] font-medium">Integration Token (API Key)</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Your Notion Integration Token. You can create an integration and get the token from your Notion
                settings under &quot;Integrations&quot;.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Input
            type={showApiKey ? "text" : "password"}
            value={notionFormData.api_key}
            onChange={(e) => setNotionFormData({ ...notionFormData, api_key: e.target.value })}
            placeholder="Enter Notion Integration Token"
            required
            size="lg"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {showApiKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

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
                <DialogTitle className="text-2xl font-black tracking-tight text-gray-900">{getConnectorTitle()}</DialogTitle>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1.5">Asset Configuration Hub</p>
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

        {isLoadingConfig ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Connector Role Toggle */}
                  <div className="bg-white/40 border border-white/60 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                        <Database className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Connector Role</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Define how this connector is used</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(["source", "repository"] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setConnectorRole((prev) => {
                              if (prev.includes(role)) {
                                // Don't allow removing the last role
                                if (prev.length === 1) return prev;
                                return prev.filter((r) => r !== role);
                              }
                              return [...prev, role];
                            });
                          }}
                          className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${
                            connectorRole.includes(role)
                              ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25"
                              : "bg-white/50 text-gray-400 border-gray-200/50 hover:bg-white hover:text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {role === "source" ? "📥 Data Source" : "🏗️ Repository"}
                        </button>
                      ))}
                    </div>
                    {connectorRole.includes("repository") && (
                      <p className="text-[10px] text-blue-600/80 font-medium mt-2 px-1">
                        This connector will be available as an auto-detected staging destination for ELT pipelines.
                      </p>
                    )}
                  </div>

                  {isBigQuery && renderBigQueryForm()}
                  {isNetSuite && renderNetSuiteForm()}
                  {isAirtable && renderAirtableForm()}
                  {isNotion && renderNotionForm()}
                </div>
              </div>

              <div className="border-t px-6 py-4 mt-auto">
                <Button
                  type="submit"
                  className="w-full h-[40px] cursor-pointer text-sm font-medium"
                >
                  Update Configuration
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
