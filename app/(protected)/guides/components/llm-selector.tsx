"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCompaniesStore } from "@/app/store/companiesStore";
import { Sparkles, Settings2 } from "lucide-react";

const LLM_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "azure", label: "Azure OpenAI " },
  { value: "aws", label: "AWS Bedrock" },
  { value: "groq", label: "Groq" },
  { value: "deepseek", label: "Deepseek" },
  { value: "perplexity", label: "Perplexity" },
  { value: "mistral", label: "Mistral AI" },
];

interface LLMSelectorProps {
  onConfigureClick: () => void;
}

export function LLMSelector({ onConfigureClick }: LLMSelectorProps) {
  const { company, fetchCompany, getActiveCompanyLLM } = useCompaniesStore();
  const [selectedLLM, setSelectedLLM] = useState<string>("azure"); // Default to Azure

  useEffect(() => {
    console.log(company, "company");
    if (!company) {
      fetchCompany();
    }

    const currentLLM = getActiveCompanyLLM();
    setSelectedLLM(currentLLM || "azure");
  }, [company]);

  if (!company) {
    return null;
  }

  const configuredProvider = LLM_PROVIDERS.find((p) => p.value === selectedLLM);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4" />
        <span className="font-medium">Current LLM Provider:</span>
      </div>
      <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
        <span className="font-semibold text-white text-sm">
          {configuredProvider?.label || "Azure OpenAI"}
        </span>
      </div>
      <Button
        onClick={onConfigureClick}
        variant="outline"
        size="sm"
        className="h-9 bg-white/10 hover:bg-white/20 border-white/30 text-white hover:text-white"
      >
        <Settings2 className="h-4 w-4 mr-2" />
        Configure
      </Button>
    </div>
  );
}
