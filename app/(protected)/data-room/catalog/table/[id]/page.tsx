"use client";

import { useColumnDataStore } from "@/app/store/columnDataStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart3, Database, Hash, CheckCircle, XCircle, GitBranch, LayoutGrid, Activity, ShieldCheck, Zap, Lightbulb, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { DataProductSheet } from "@/components/data-product-sheet";
import { DataProduct } from "@/components/data-product-node";
import { Axios } from "@/app/config/axios";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TableDetailsPage() {
  const params = useParams();
  const tableId = (params as { id?: string })?.id;
  const [lineageOpen, setLineageOpen] = useState(false);
  const [selectedDataProduct, setSelectedDataProduct] = useState<DataProduct | null>(null);
  const {
    selectedColumnData,
    isLoading,
    error,
    hasColumns,
    getProcessedDistribution,
    setSelectedColumnData,
  } = useColumnDataStore();

  const [isFetchingValues, setIsFetchingValues] = useState(false);
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  useEffect(() => {
    setSavedCompanyId(localStorage.getItem('selectedCompanyId'));
  }, []);

  // Generate business description using pattern matching and data analysis
  const generateBusinessDescription = async () => {
    if (!selectedColumnData || !tableId || !savedCompanyId) return;

    setIsGeneratingDescription(true);
    toast.loading("Analyzing column data to generate business context...", { id: "generate-description" });

    try {
      const distributionData = getProcessedDistribution();
      const topValues = distributionData?.slice(0, 10).map(d => d.value) || [];

      // Generate description based on column patterns
      const generatedDescription = generateSmartDescription(selectedColumnData, topValues);

      // Simulate a brief delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the column data with the generated description
      setSelectedColumnData({
        ...selectedColumnData,
        business_description: generatedDescription,
      });

      toast.success("Business context generated successfully!", { id: "generate-description" });
    } catch (error) {
      console.error("Error generating business description:", error);
      toast.error("Failed to generate business context. Please try again.", { id: "generate-description" });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Helper function to generate intelligent business descriptions
  const generateSmartDescription = (column: any, sampleValues: string[]) => {
    // Use label first, then column_name as fallback
    const displayName = column.label || column.column_name || '';
    const columnName = displayName.toLowerCase();
    const dataType = (column.data_type || '').toLowerCase();
    const uniqueCount = column.unique_values_count || 0;
    const totalRecords = column.total_records || 0;
    const nullCount = column.null_count || 0;

    console.log('Generating description for:', {
      displayName,
      columnName,
      dataType,
      uniqueCount,
      totalRecords,
      sampleValues: sampleValues.slice(0, 5)
    });

    // ID patterns
    if (columnName.includes('id') && !columnName.includes('valid')) {
      if (columnName.includes('user') || columnName.includes('person') || columnName.includes('employee')) {
        return `Unique identifier for individual users or people in the system, used to track and reference specific individuals across different records.`;
      } else if (columnName.includes('company') || columnName.includes('organization')) {
        return `Unique identifier for companies or organizations, enabling tracking and relationship management across the platform.`;
      } else if (columnName.includes('transaction') || columnName.includes('order')) {
        return `Unique identifier for transactions or orders, ensuring each business event can be tracked and referenced independently.`;
      }
      return `Unique identifier used to reference and track individual records in the system, ensuring data integrity and relationships.`;
    }

    // Name patterns
    if (columnName.includes('name')) {
      if (columnName.includes('first') || columnName.includes('given')) {
        return `First or given name of individuals, used for personal identification and communication.`;
      } else if (columnName.includes('last') || columnName.includes('family') || columnName.includes('surname')) {
        return `Last name or surname of individuals, completing personal identification information.`;
      } else if (columnName.includes('full')) {
        return `Complete name of individuals or entities, providing full identification for records.`;
      } else if (columnName.includes('company') || columnName.includes('business')) {
        return `Name of the company or business entity, used for organizational identification and branding.`;
      } else if (sampleValues.length > 0) {
        return `Name field used to identify and distinguish different entities. Common values include: ${sampleValues.slice(0, 3).join(', ')}.`;
      }
      return `Name field used to identify and distinguish different entities in the dataset.`;
    }

    // Date/Time patterns
    if (columnName.includes('date') || columnName.includes('time') || columnName.includes('timestamp')) {
      if (columnName.includes('created') || columnName.includes('create')) {
        return `Timestamp recording when each record was originally created in the system, useful for tracking data history and age.`;
      } else if (columnName.includes('updated') || columnName.includes('modified')) {
        return `Timestamp showing when each record was last updated or modified, helping track recent changes and data freshness.`;
      } else if (columnName.includes('deleted') || columnName.includes('removed')) {
        return `Timestamp indicating when records were deleted or marked for removal, supporting data lifecycle management.`;
      } else if (columnName.includes('start') || columnName.includes('begin')) {
        return `Start date or time for events, periods, or activities, marking the beginning of temporal ranges.`;
      } else if (columnName.includes('end') || columnName.includes('finish') || columnName.includes('complete')) {
        return `End date or time marking the completion or conclusion of events, periods, or activities.`;
      }
      return `Temporal information tracking when events occurred or when records were processed, essential for time-based analysis.`;
    }

    // Status/State patterns
    if (columnName.includes('status') || columnName.includes('state')) {
      const statusValues = sampleValues.slice(0, 4).join(', ');
      return `Current status or state of records, indicating their position in a workflow or process. Common values include: ${statusValues || 'various states'}.`;
    }

    // Contact information
    if (columnName.includes('email')) {
      return `Email addresses for communication and user identification, serving as a primary contact method and often as a unique identifier.`;
    }
    if (columnName.includes('phone') || columnName.includes('mobile') || columnName.includes('tel')) {
      return `Phone or mobile numbers for direct communication and contact purposes, supporting customer outreach and support.`;
    }
    if (columnName.includes('address')) {
      if (columnName.includes('street')) {
        return `Street address information providing the physical location details for properties or entities.`;
      } else if (columnName.includes('city')) {
        return `City name indicating the municipal location, used for geographic segmentation and regional analysis.`;
      } else if (columnName.includes('state') || columnName.includes('province')) {
        return `State or province information for geographic classification and regional organization.`;
      } else if (columnName.includes('zip') || columnName.includes('postal')) {
        return `Postal or ZIP code for precise geographic location and mail delivery purposes.`;
      }
      return `Address information storing location data for physical or digital locations, supporting geographic analysis and logistics.`;
    }

    // Financial patterns
    if (columnName.includes('amount') || columnName.includes('price') || columnName.includes('cost') || columnName.includes('revenue') || columnName.includes('payment')) {
      if (columnName.includes('total')) {
        return `Total monetary amount representing the sum or aggregate value for transactions or financial records.`;
      }
      return `Monetary values or financial amounts related to transactions, pricing, or costs, critical for financial analysis and reporting.`;
    }

    // Boolean patterns
    if (dataType.includes('bool') || columnName.includes('is_') || columnName.includes('has_')) {
      return `Yes/no indicator storing true/false values to represent binary states, conditions, or feature flags.`;
    }

    // Count patterns
    if (columnName.includes('count') || columnName.includes('number') || columnName.includes('qty') || columnName.includes('quantity')) {
      return `Numerical count or quantity tracking the number of items, occurrences, or units associated with each record.`;
    }

    // Description/Notes patterns
    if (columnName.includes('description') || columnName.includes('note') || columnName.includes('comment')) {
      return `Free-text field containing detailed descriptions, notes, or comments providing additional context and information.`;
    }

    // Type/Category patterns
    if (columnName.includes('type') || columnName.includes('category') || columnName.includes('class')) {
      const categoryValues = sampleValues.slice(0, 4).join(', ');
      return `Classification or categorization field grouping records into types or categories. Common values: ${categoryValues || 'various categories'}.`;
    }

    // Based on uniqueness
    if (uniqueCount === totalRecords && totalRecords > 0) {
      return `Unique value for each record serving as a distinguishing characteristic or identifier, with no duplicates across ${totalRecords.toLocaleString()} records.`;
    } else if (uniqueCount < 20 && totalRecords > 0) {
      const categoryValues = sampleValues.slice(0, 3).join(', ');
      return `Categorical field organizing records into ${uniqueCount} distinct groups or classifications, including: ${categoryValues}.`;
    }

    // Default based on data type
    if (dataType.includes('int') || dataType.includes('number') || dataType.includes('decimal') || dataType.includes('float')) {
      return `Numerical values storing quantitative data for analysis, calculations, and metrics.`;
    } else if (dataType.includes('text') || dataType.includes('string') || dataType.includes('varchar')) {
      return `Text field storing alphanumeric data and descriptions, providing flexible content storage.`;
    }

    // Generic fallback
    return `This column stores ${dataType || 'data'} values that help describe and characterize records in the dataset, supporting business operations and analysis.`;
  };

  // Auto-generate business description when column is selected (if not already present)
  useEffect(() => {
    const autoGenerateDescription = async () => {
      // Only generate if we have column data, no existing description (business_description OR column_description), and not already generating
      if (
        selectedColumnData &&
        !selectedColumnData.business_description &&
        !selectedColumnData.column_description &&
        !isGeneratingDescription &&
        savedCompanyId &&
        tableId
      ) {
        await generateBusinessDescription();
      }
    };

    autoGenerateDescription();
  }, [selectedColumnData?.id, selectedColumnData?.column_id]);

  // Fetch column values if they are missing or stale
  useEffect(() => {
    const fetchValues = async () => {
      const columnIdentifier = selectedColumnData?.column_id || selectedColumnData?.id;
      if (!columnIdentifier || !tableId || !savedCompanyId || isFetchingValues) return;

      // If we already have distinct_value_counts from a recent fetch, skip
      if (selectedColumnData.distinct_value_counts && Object.keys(selectedColumnData.distinct_value_counts).length > 0) {
        return;
      }

      setIsFetchingValues(true);
      try {
        const response = await Axios.get("/data/metadata/column-values", {
          params: {
            table_id: tableId,
            column_id: columnIdentifier,
            company_id: savedCompanyId,
          },
        });

        const values = response.data;
        if (Array.isArray(values)) {
          const counts: Record<string, number> = {};
          values.forEach((v: any) => {
            const val = v.value || "(Null/Empty)";
            counts[val] = (counts[val] || 0) + 1;
          });

          setSelectedColumnData({
            ...selectedColumnData,
            distinct_value_counts: counts,
            distinct_values: Array.from(new Set(values.map((v: any) => v.value || "(Null/Empty)"))) as string[],
          });
        }
      } catch (err) {
        console.error("Error fetching column values:", err);
      } finally {
        setIsFetchingValues(false);
      }
    };

    fetchValues();
  }, [selectedColumnData?.id, tableId, savedCompanyId, setSelectedColumnData]);

  // Show skeleton only while loading or while column presence is unknown
  if (isLoading || hasColumns === null) {
    return (
      <div className="min-h-[500px] space-y-6">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-80 animate-pulse mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-8 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="w-20 h-2 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (hasColumns === false) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gray-50 rounded-lg p-8">
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-3 text-gray-700">No Columns Found</h1>
            <p className="text-gray-600 leading-relaxed">
              This table doesn't have any columns to analyze.
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
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-3 text-gray-700">No Column Selected</h1>
            <p className="text-gray-600 leading-relaxed">
              Select a column from the sidebar to view detailed data analysis and statistics.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Choose any column to see metrics like data quality, distribution, and metadata.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const distributionData = getProcessedDistribution();
  const totalRecords = Math.max(
    selectedColumnData?.total_records || 0,
    selectedColumnData?.row_count || 0
  );

  const completenessPercentage =
    selectedColumnData?.completeness_score !== undefined
      ? selectedColumnData.completeness_score * 100
      : totalRecords > 0
        ? ((totalRecords - (selectedColumnData?.null_count || 0)) / totalRecords) * 100
        : 0;

  const uniquenessPercentage =
    selectedColumnData?.uniqueness_score !== undefined
      ? selectedColumnData.uniqueness_score * 100
      : totalRecords > 0
        ? ((selectedColumnData?.unique_values_count || selectedColumnData?.distinct_count || 0) /
          totalRecords) *
        100
        : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 p-6"
    >
      {/* Premium Column Summary Card */}
      <div className="group relative bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 p-10 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Data Analysis for Selected Column</h3>
            </div>

            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
              {selectedColumnData.column_name}
              {selectedColumnData.label && selectedColumnData.label !== selectedColumnData.column_name && (
                <span className="ml-3 text-gray-400 text-sm font-medium">({selectedColumnData.label})</span>
              )}
            </h1>

            {/* Business Description - Auto-generated, user-friendly explanation */}
            <div className="mb-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Business Context</div>
                    {isGeneratingDescription && (
                      <div className="flex items-center gap-1 text-[9px] text-indigo-500 italic">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                        </motion.div>
                        Generating...
                      </div>
                    )}
                  </div>
                  <p className={cn(
                    "font-medium text-sm leading-relaxed",
                    (selectedColumnData.column_description || selectedColumnData.technical_description || selectedColumnData.business_description) ? "text-gray-700" : "text-gray-400 italic"
                  )}>
                    {selectedColumnData.column_description || selectedColumnData.technical_description || selectedColumnData.business_description || "Analyzing column data to generate business context..."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="px-5 py-3 bg-white/60 rounded-2xl border border-white/80 shadow-sm flex flex-col items-center min-w-[120px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</span>
              <div className="flex items-center gap-2">
                {selectedColumnData.active_status ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-500" />
                )}
                <span className={cn("text-sm font-black uppercase tracking-tight", selectedColumnData.active_status ? "text-emerald-600" : "text-rose-600")}>
                  {selectedColumnData.active_status ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 pt-12 border-t border-gray-100/50 relative z-10">
          <div className="flex items-center gap-5 p-6 bg-white/30 rounded-3xl border border-white/60 group/stat hover:bg-white/50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover/stat:scale-110 transition-transform">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900 tracking-tighter">
                {selectedColumnData.total_records?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Records</div>
            </div>
          </div>

          <div className="flex items-center gap-5 p-6 bg-white/30 rounded-3xl border border-white/60 group/stat hover:bg-white/50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover/stat:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900 tracking-tighter">
                {selectedColumnData.unique_values_count?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Unique Values</div>
            </div>
          </div>

          <div className="flex items-center gap-5 p-6 bg-white/30 rounded-3xl border border-white/60 group/stat hover:bg-white/50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover/stat:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900 tracking-tighter">
                {selectedColumnData.null_count?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Null Values</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column Metadata Card */}
        <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Hash className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900">Column Metadata</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
            {[
              { label: "Key Type", value: selectedColumnData.key, icon: <Activity className="w-4 h-4" /> },
              { label: "Calculated", value: selectedColumnData.calculated_value ? "Yes" : "No", icon: <CheckCircle className="w-4 h-4" /> },
              { label: "Crawled Status", value: selectedColumnData.crawled_status ? "Operational" : "Pending", icon: <Database className="w-4 h-4" /> },
              { label: "Last Profiled", value: selectedColumnData.date_profiled ? new Date(selectedColumnData.date_profiled).toLocaleDateString() : "Never", icon: <CheckCircle className="w-4 h-4" /> },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="mt-1 text-gray-300">{item.icon}</div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{item.label}</div>
                  <div className="text-base font-bold text-gray-700">{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-gray-50/50 rounded-3xl border border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Value Range</div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-bold text-gray-600"><span className="text-[10px] uppercase mr-1">MIN</span> {selectedColumnData.min_value || "N/A"}</div>
                <div className="h-1 w-8 bg-gray-200 rounded-full" />
                <div className="text-sm font-bold text-gray-600"><span className="text-[10px] uppercase mr-1">MAX</span> {selectedColumnData.max_value || "N/A"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality Dashboard Card */}
        <div className="bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />

          <div className="flex items-center gap-3 mb-10 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Data Quality Metrics</h3>
          </div>

          <div className="space-y-12 relative z-10">
            {[
              { label: "Data Completeness", value: completenessPercentage, color: "bg-indigo-500" },
              { label: "Uniqueness Density", value: uniquenessPercentage, color: "bg-purple-500" },
            ].map((metric, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-xl font-bold text-white">{metric.label}</div>
                  </div>
                  <div className="text-3xl font-black text-white">{metric.value.toFixed(1)}%</div>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.value}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={cn("h-full rounded-full", metric.color)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* End of Metrics Content */}
        </div>
      </div>

      {/* Reference Datasets Horizontal Bar Charts */}
      {distributionData && distributionData.length > 0 && (
        <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900">Reference Datasets</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Top values and their frequencies</p>
              </div>
            </div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
              {distributionData.length} unique values
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-4 scrollbar-hide">
            {distributionData.slice(0, 15).map((item, index) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={item.id}
                className="group flex flex-col p-4 md:p-5 bg-white/40 hover:bg-white/80 rounded-[2rem] border border-white/40 hover:border-blue-200 transition-all cursor-default"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-blue-500 bg-blue-50 w-6 h-6 rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-gray-700 truncate max-w-xs md:max-w-md">{item.value || "(Null / Empty)"}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.count.toLocaleString()} records</div>
                    <div className="text-sm font-black text-gray-900">{item.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.03 }}
                    className="h-full bg-blue-500 group-hover:bg-blue-600 transition-colors rounded-full"
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {distributionData.length > 15 && (
            <div className="text-center mt-8">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Showing top 15 values</p>
            </div>
          )}
        </div>
      )}

      {/* Lineage Sheet */}
      <DataProductSheet
        dataProduct={selectedDataProduct}
        open={lineageOpen}
        onOpenChange={setLineageOpen}
        onDeepDive={(dataProduct) => {
          setSelectedDataProduct(dataProduct);
        }}
      />
    </motion.div>
  );
}
