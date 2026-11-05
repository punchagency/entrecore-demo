"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompaniesStore, LLMConfiguration } from "@/app/store/companiesStore";
import { useUserStore } from "@/app/store/userStore";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, Key, Info, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

const LLM_PROVIDERS = [
  {
    value: "openai",
    label: "ChatGPT",
    endpoint: "https://api.openai.com/v1",
    models: [
      { value: "gpt-4o", label: "GPT-4o (Latest)", tier: "premium" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "standard" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", tier: "premium" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", tier: "basic" },
    ],
  },
  {
    value: "anthropic",
    label: "Anthropic Claude",
    endpoint: "https://api.anthropic.com",
    models: [
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Latest)", tier: "premium" },
      { value: "claude-3-opus-20240307", label: "Claude 3 Opus", tier: "premium" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku", tier: "standard" },
    ],
  },
  {
    value: "gemini",
    label: "Google Gemini",
    endpoint: "https://generativelanguage.googleapis.com",
    models: [
      { value: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro (Latest)", tier: "premium" },
      { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash (Latest)", tier: "standard" },
      { value: "gemini-pro", label: "Gemini Pro", tier: "basic" },
    ],
  },
  {
    value: "azure",
    label: "Azure OpenAI",
    endpoint: "https://<your-endpoint>.openai.azure.com",
    models: [
      { value: "gpt-4o", label: "GPT-4o (Latest)", tier: "premium" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "standard" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", tier: "premium" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", tier: "basic" },
    ],
  },
];

interface LLMConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LLMConfigurationDialog({ open, onOpenChange }: LLMConfigurationDialogProps) {
  const { company, fetchCompany, getActiveCompanyLLM, updateLLMConfig } = useCompaniesStore();
  const { user } = useUserStore();
  const [configs, setConfigs] = useState<Record<string, LLMConfiguration>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (open && !company) {
      fetchCompany();
    }
  }, [open]);

  // Get the active company's LLM configuration
  const configuredLLM = getActiveCompanyLLM();

  const handleKeyChange = (provider: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [provider]: {
        llm_provider: provider,
        llm_api_key: value,
        llm_endpoint: prev[provider]?.llm_endpoint || "",
      },
    }));
  };

  const handleEndpointChange = (provider: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        provider,
        llm_api_key: prev[provider]?.llm_api_key || "",
        llm_endpoint: value,
      },
    }));
  };

  const toggleShowKey = (provider: string) => {
    setShowKey((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const handleProviderClick = (provider: string) => {
    setSelectedProvider(provider);
  };

  const handleCheckboxChange = (provider: string, checked: boolean) => {
    // Check if there's already a configured provider
    const otherProviderHasConfig = Object.entries(configs).some(
      ([key, config]) => key !== provider && config.llm_api_key && config.llm_api_key.trim() !== ""
    );

    if (checked && otherProviderHasConfig) {
      setShowWarning(true);
      toast.error("Remove the configured provider before selecting a different one");
      setTimeout(() => setShowWarning(false), 4000);
      return;
    }

    setShowWarning(false);

    // If unchecking, clear the config
    if (!checked) {
      setConfigs((prev) => {
        const newConfigs = { ...prev };
        delete newConfigs[provider];
        return newConfigs;
      });
      // If was selected, clear selection
      if (selectedProvider === provider) {
        setSelectedProvider(null);
      }
    } else {
      // If checking, select it and expand
      setSelectedProvider(provider);
    }
  };

  const handleCardClick = (provider: string) => {
    const isConfigured = isProviderConfigured(provider);
    const isSelected = isProviderSelected(provider);

    if (isSelected) {
      // If already selected, collapse it
      setSelectedProvider(null);
    } else {
      // If not selected, expand it
      setSelectedProvider(provider);
    }
  };

  const handleModelChange = (provider: string, model: string) => {
    setConfigs((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        llm_provider: provider,
        llm_api_key: prev[provider]?.llm_api_key || "",
        llm_endpoint: prev[provider]?.llm_endpoint || "",
        llm_model: model,
      },
    }));
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "premium":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "standard":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "basic":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const isProviderSelected = (provider: string) => {
    return selectedProvider === provider;
  };

  const isProviderConfigured = (provider: string) => {
    return configs[provider]?.llm_api_key && configs[provider].llm_api_key.trim() !== "";
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const companyId =
        company?.id || user?.active_company || localStorage.getItem("selectedCompanyId");

      if (!companyId) {
        toast.error("No active company found");
        setIsSaving(false);
        return;
      }

      // Get the selected provider's config
      if (!selectedProvider || !configs[selectedProvider]) {
        toast.error("Please select and configure a provider");
        setIsSaving(false);
        return;
      }

      const selectedConfig = configs[selectedProvider];

      // Save the selected provider's configuration
      await updateLLMConfig(companyId, selectedConfig);

      onOpenChange(false);

      // Refresh companies to get updated data
      await fetchCompany();
    } catch (error) {
      console.error("Failed to save LLM configurations:", error);
      toast.error("Failed to save LLM configurations");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configure LLM Providers
          </DialogTitle>
          <DialogDescription>
            Configure your own API keys for different LLM providers and select from multiple model
            tiers (Premium, Standard, Basic). If no custom keys are configured, your guides will use
            the default Azure service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Status */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Current LLM Provider</p>
                <p className="text-sm text-blue-700 mt-1">
                  Your guides are currently using:{" "}
                  <span className="font-semibold">
                    {LLM_PROVIDERS.find((p) => p.value === configuredLLM)?.label || "Azure"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-900 font-medium">How it works</p>
                <p className="text-sm text-blue-700 mt-1">
                  Configure your preferred LLM provider by entering your API key and selecting a
                  model tier (Premium, Standard, or Basic). Each provider offers different model
                  options with varying capabilities and pricing. The first configured provider will
                  be used by default. Leave all keys empty to use the default Azure service.
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          {showWarning && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">
                    Provider Already Configured
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You can only configure one LLM provider at a time. Please remove the configured
                    provider first or continue with the current one.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LLM Provider Configurations */}
          <div className="space-y-3 ">
            {LLM_PROVIDERS.map((provider) => {
              const show = showKey[provider.value] || false;
              const config = configs[provider.value];
              const isConfigured = isProviderConfigured(provider.value);
              const isSelected = isProviderSelected(provider.value);

              return (
                <div
                  key={provider.value}
                  className={`transition-all border-2 rounded-lg ${
                    isSelected || isConfigured
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className="flex items-start space-x-3 cursor-pointer p-4"
                    onClick={() => handleCardClick(provider.value)}
                  >
                    {/* Visual selection indicator */}
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                        isSelected || isConfigured
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300"
                      }`}
                    >
                      {(isSelected || isConfigured) && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Label className="text-base font-semibold cursor-pointer">
                            {provider.label}
                          </Label>
                          {(isSelected || isConfigured) && (
                            <span className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-medium">
                              Selected
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProviderClick(provider.value);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isSelected ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{provider.endpoint}</p>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isSelected && (
                    <div className="px-4 pb-4 border-t rounded-b-lg bg-white">
                      <div className="space-y-4 pt-4">
                        <p className="text-sm text-gray-600 mb-3">
                          Configure your {provider.label} API credentials
                        </p>

                        <div className="space-y-2">
                          <Label
                            htmlFor={`${provider.value}-endpoint`}
                            className="text-sm font-medium"
                          >
                            Endpoint URL (optional)
                          </Label>
                          <Input
                            id={`${provider.value}-endpoint`}
                            type="text"
                            placeholder={provider.endpoint}
                            value={config?.llm_endpoint || ""}
                            onChange={(e) => handleEndpointChange(provider.value, e.target.value)}
                            className="text-sm"
                          />
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Model Selection</Label>
                          <Select
                            value={config?.llm_model || ""}
                            onValueChange={(value) => handleModelChange(provider.value, value)}
                          >
                            <SelectTrigger className="text-sm w-full">
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent className="flex items-center justify-between w-full">
                              {provider.models.map((model) => (
                                <SelectItem key={model.value} value={model.value} className="">
                                  <span>{model.label}</span>
                                  <span
                                    className={`ml-2 px-2 py-1 text-xs rounded-full border ${getTierColor(
                                      model.tier
                                    )}`}
                                  >
                                    {model.tier.charAt(0).toUpperCase() + model.tier.slice(1)}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {config?.llm_model && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>Selected:</span>
                              <span className="font-medium">
                                {provider.models.find((m) => m.value === config.llm_model)?.label ||
                                  "Unknown Model"}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full border ${getTierColor(
                                  provider.models.find((m) => m.value === config.llm_model)?.tier ||
                                    "basic"
                                )}`}
                              >
                                {provider.models
                                  .find((m) => m.value === config.llm_model)
                                  ?.tier.charAt(0)
                                  .toUpperCase() +
                                  (provider.models
                                    .find((m) => m.value === config.llm_model)
                                    ?.tier.slice(1) || "Basic")}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${provider.value}-key`} className="text-sm font-medium">
                            API Key
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id={`${provider.value}-key`}
                              type={show ? "text" : "password"}
                              placeholder={`Enter your ${provider.label} API key`}
                              value={config?.llm_api_key || ""}
                              onChange={(e) => handleKeyChange(provider.value, e.target.value)}
                              className="text-sm font-mono"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleShowKey(provider.value);
                              }}
                              className="flex-shrink-0"
                            >
                              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {provider.value === "azure" && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-800">
                              This is the default provider and will be used if no other API keys are
                              configured.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Configurations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
