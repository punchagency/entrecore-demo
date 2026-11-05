"use client";

import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ROUTING_RULES_IMPORT_FIELDS,
  ROUTING_RULES_JSON_EXAMPLE,
} from "../services/routing-rules-import-format";

type RoutingRulesImportHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RoutingRulesImportHelpDialog({
  open,
  onOpenChange,
}: RoutingRulesImportHelpDialogProps) {
  const handleCopyExample = async () => {
    try {
      await navigator.clipboard.writeText(ROUTING_RULES_JSON_EXAMPLE);
      toast.success("Example JSON copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleDownloadExample = () => {
    const blob = new Blob([ROUTING_RULES_JSON_EXAMPLE], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drat-routing-rules-example.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-xl">Import format guide</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Upload a JSON rules file (recommended). Paths are subfolders under each entity&apos;s Drive
            folder — configure client roots on the Entities page.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="json" className="flex flex-col min-h-0 flex-1">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2 shrink-0">
            <TabsTrigger value="json" className="rounded-lg">
              JSON (recommended)
            </TabsTrigger>
            <TabsTrigger value="hazel" className="rounded-lg">
              Hazel migration
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto px-6 py-4 flex-1">
            <TabsContent value="json" className="mt-0 space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <p className="text-sm font-semibold text-indigo-950 mb-1">Standard format</p>
                <p className="text-sm text-indigo-900/80 leading-relaxed">
                  Use JSON for new rules and long-term maintenance.{" "}
                  <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">target_folder</code> is the
                  path <strong>under</strong> each entity&apos;s linked Drive folder — not the client name
                  itself.
                </p>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                Provide a JSON <strong>array of rules</strong>, or an object with a{" "}
                <code className="text-xs bg-slate-100 px-1 rounded">rules</code> array.
              </p>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">Field</th>
                      <th className="px-3 py-2 font-semibold text-slate-700 w-20">Required</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ROUTING_RULES_IMPORT_FIELDS.map((field) => (
                      <tr key={field.name}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-900 align-top">{field.name}</td>
                        <td className="px-3 py-2 align-top">
                          {field.required ? (
                            <span className="text-xs font-semibold text-rose-600">Yes</span>
                          ) : (
                            <span className="text-xs text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 leading-relaxed align-top">
                          {field.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => void handleCopyExample()}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy example
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={handleDownloadExample}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download example
                </Button>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Example</p>
                <pre className="max-h-52 overflow-auto rounded-xl bg-slate-950 text-slate-100 p-4 text-xs leading-relaxed">
                  {ROUTING_RULES_JSON_EXAMPLE}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="hazel" className="mt-0 space-y-4">
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-sm font-semibold text-amber-950 mb-1">One-time migration (Virgil)</p>
                <p className="text-sm text-amber-900/80 leading-relaxed">
                  Upload a Hazel <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">.hazelrules</code>{" "}
                  export to import existing rules. We convert conditions and folders automatically, and strip
                  legacy client-root tokens like{" "}
                  <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">{`{clients}`}</code> from paths.
                  Export to JSON afterward if you want to retire Hazel.
                </p>
              </div>

              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    1
                  </span>
                  <span>Export rules from Hazel on Mac.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    2
                  </span>
                  <span>
                    Upload <code className="text-xs bg-slate-100 px-1 rounded">.hazelrules</code> here — paths
                    are normalized on import.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    3
                  </span>
                  <span>Map each client&apos;s Drive root on the Entities page, then test with a sample doc.</span>
                </li>
              </ol>
            </TabsContent>
          </div>
        </Tabs>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
