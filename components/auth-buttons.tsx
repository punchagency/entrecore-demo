import Image from "next/image";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import GoogleIconImage from "@/public/svgs/google-icon-image.svg";

interface GoogleButtonProps {
  text: string;
  onClick: () => void;
}

interface SubmitButtonProps {
  text: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function GoogleButton({ text, onClick }: GoogleButtonProps) {
  return (
    <Button
      variant="outline"
      className="w-full mb-6 py-6 text-primary font-bold cursor-pointer"
      onClick={onClick}
    >
      <Image src={GoogleIconImage} alt="Google Icon" className="w-4 h-4 sm:w-6 sm:h-6" />
      {text}
    </Button>
  );
}

export function SubmitButton({ text, disabled, isLoading }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      className="w-full px-6 py-6 mt-4 font-bold cursor-pointer"
      disabled={disabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {text}
        </>
      ) : (
        <>
          {text}
          <ArrowRight size={32} strokeWidth={2.75} />
        </>
      )}
    </Button>
  );
}
