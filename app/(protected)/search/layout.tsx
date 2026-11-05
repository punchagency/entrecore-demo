import SearchHeader from "@/components/search-header";
import { Suspense } from "react";

const SearchLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex flex-col min-h-screen">
            <SearchHeader />
            <main className="flex-1">
                {children}
            </main>
        </div>
    )
}

export default SearchLayout;
