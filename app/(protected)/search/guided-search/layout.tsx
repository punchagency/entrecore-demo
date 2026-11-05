
import SearchLinks from "@/components/search/search-links";
import { Suspense } from "react";

const SearchLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <Suspense>{children}</Suspense>
      <SearchLinks />
    </div>
  );
};

export default SearchLayout;
