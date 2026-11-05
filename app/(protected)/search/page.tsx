import GuidedSearchCTA from "@/components/search/guided-search-cta";
import SearchHero from "@/components/search/search-hero";
import SearchLinks from "@/components/search/search-links";

export default function SearchPage() {
  return ( 
    <>
      <SearchHero />
      <hr />
      <SearchLinks />
      <GuidedSearchCTA />
    </>
  );
}
