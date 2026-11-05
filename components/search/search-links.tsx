'use client'
import { Search } from "lucide-react";
import { useSearch } from "@/contexts/search-context";

const SearchLinks = () => {
    const { performSearch } = useSearch();

    const searchLinks = [
        {
            id: 1,
            category: "Most Popular",
            links: [
                { name: "Social Media Management Tools", query: "Social Media Management Software" },
                { name: "CRM for SaaS", query: "CRM for SaaS" },
                { name: "Cap Table Management Software", query: "Cap Table Management Software" }
            ]
        },
        {
            id: 2,
            category: "Trending",
            links: [
                { name: "Best AI Tools 2024", query: "AI Tools" },
                { name: "Free Email Marketing Software", query: "Email Marketing Software" },
                { name: "AI Content Tools", query: "AI Content Tools" }
            ]
        },
        {
            id: 3,
            category: "For You",
            links: [
                { name: "Team Management Tools", query: "Team Management Software" },
                { name: "Email With Shared Inbox", query: "Email With Shared Inbox" },
                { name: "AI Business Management Tools", query: "AI Business Management Software" }
            ]
        }
    ];

    const handleSearch = (query: string) => {
        performSearch(query);
    };

    return (
        <div className="py-8 px-4 border-b border-[#D9DBDD] flex justify-center">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-16 gap-y-8 mb-16">
                {searchLinks.map((section) => (
                    <div key={section.id}>
                        <h2 className="text-base lg:text-xl font-semibold mb-4">{section.category}</h2>
                        <ul className="space-y-3">
                            {section.links.map((link, index) => (
                                <li key={index}>
                                    <button
                                        onClick={() => handleSearch(link.query)}
                                        className="flex items-center text-gray-700 hover:text-blue-600 font-medium text-sm"
                                    >
                                        <Search className="h-3 w-3 mr-2 text-[#3064F6]" />
                                        {link.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SearchLinks;