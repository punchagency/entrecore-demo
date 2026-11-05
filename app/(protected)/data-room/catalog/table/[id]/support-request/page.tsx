"use client";

import { useColumnDataStore } from "@/app/store/columnDataStore";
import { MessageCircle, HelpCircle } from "lucide-react";

const SupportRequestPage = () => {
    const { selectedColumnData, isLoading, hasColumns } = useColumnDataStore();

    if (isLoading || (!selectedColumnData && hasColumns !== false)) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto"></div>
                <div className="bg-white rounded-lg p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-24 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded w-32"></div>
                    </div>
                </div>
            </div>
        );
    }

    // If no columns exist in the table, show appropriate message
    if (hasColumns === false) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center max-w-md mx-auto">
                    <div className="bg-gray-50 rounded-lg p-8">
                        <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-3">No Columns Found</h3>
                        <p className="text-gray-600 leading-relaxed">
                            This table doesn't have any columns to request support for.
                        </p>
                        <div className="mt-4 text-sm text-gray-500">
                            Please select a different table that contains column data.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedColumnData) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="text-center max-w-md mx-auto">
                    <div className="bg-gray-50 rounded-lg p-8">
                        <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-3">No Column Selected</h3>
                        <p className="text-gray-600 leading-relaxed">
                            Select a column from the sidebar to request support or assistance for data-related questions.
                        </p>
                        <div className="mt-4 text-sm text-gray-500">
                            Get help with data interpretation, quality issues, or technical questions.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <MessageCircle className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold">Support Request for {selectedColumnData.column_name}</h1>
                </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 max-w-2xl mx-auto">
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Need help with this column? Submit a support request below and our data team will assist you.
                    </p>
                    
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h3 className="font-semibold mb-2">Column Information:</h3>
                        <div className="text-sm space-y-1">
                            <p><span className="font-medium">Name:</span> {selectedColumnData.column_name}</p>
                            <p><span className="font-medium">Type:</span> {selectedColumnData.data_type || 'N/A'}</p>
                            <p><span className="font-medium">Description:</span> {selectedColumnData.technical_description || 'No description available'}</p>
                        </div>
                    </div>
                    
                    <div className="text-center text-gray-500 py-8">
                        <p>Support request form would be implemented here</p>
                        <p className="text-sm mt-2">This feature is coming soon...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SupportRequestPage;