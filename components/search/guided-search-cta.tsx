import Link from "next/link";
import { Button } from "@/components/ui/button";

const GuidedSearchCTA = () => {
  return (
    <div className="fixed bottom-8 left-0 right-0 w-full flex justify-center items-center z-10">
      <div className="bg-white rounded-full border border-[#D9DBDD] pr-1 pl-3 py-1 flex items-center justify-between max-w-sm mx-auto shadow-sm">
        <div className="text-xs shrink-0 lg:text-md font-bold mr-2">Need Help Finding Something?</div>
        <Link href="/search/guided-search">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full py-0 px-3 sm:px-6 text-xs lg:text-md">
            Guided Search
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default GuidedSearchCTA;