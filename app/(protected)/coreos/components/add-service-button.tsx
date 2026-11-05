"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ServiceSelectionModal } from "./service-selection-modal";

interface Service {
  id: number;
  name: string;
  logo: string;
}

interface AddServiceButtonProps {
  onServiceAdd?: (service: Service) => void;
  className?: string;
}

export function AddServiceButton({ onServiceAdd, className = "" }: AddServiceButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handleServiceSelect = (service: Service) => {
    if (onServiceAdd) {
      onServiceAdd(service);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className={`flex items-center gap-2 border-dashed border-[#2563EB] text-[#2563EB] hover:bg-[#EEF4FF] ${className}`}
        onClick={() => setShowModal(true)}
      >
        <Plus className="h-4 w-4" />
        <span>Add to CoreOS</span>
      </Button>

      <ServiceSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onServiceSelect={handleServiceSelect}
      />
    </>
  );
}
