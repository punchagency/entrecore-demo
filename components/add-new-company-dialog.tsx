import { z } from "zod";
import { Flag, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useState } from "react";

import {
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, FormItem, FormMessage, Form, FormControl } from "./ui/form";
import { Axios } from "@/app/config/axios";
import { useCompaniesStore } from "@/app/store/companiesStore";

const AddNewCompanyDialog = ({
    open,
    setOpen,
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
}) => {
    const { fetchCompanies } = useCompaniesStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formSchema = z.object({
        name: z.string().min(3, { message: "Company name must be at least 3 characters" })
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
        },
    });

    const handleSubmit: any = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        try {
            const createResponse = await Axios.post('/auth/company/', {
                company_name: values.name,
                is_active: true,
                is_default: false,
            });

            // Activate the company using the onboarding endpoint
            const companyId = createResponse.data.id;
            await Axios.put(`/auth/onboarding/company?company_id=${companyId}`, {
                is_active: true,
            });

            toast.success('Company created successfully');
            form.reset();
            setOpen(false);
            // Refresh the companies list
            await fetchCompanies();
        } catch (error: any) {
            console.error('Error creating company:', error);
            toast.error(error.response?.data?.message || 'Failed to create company');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DialogContent className="bg-white p-0 overflow-hidden sm:max-w-[480px] rounded-2xl border border-slate-200/60 shadow-2xl">
            <div className="p-6 pb-2">
                <DialogHeader>
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100/50 shadow-inner">
                        <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight text-left">
                        Create a New Company Profile
                    </DialogTitle>
                    <DialogDescription className="text-left text-slate-500 mt-1">
                        Enter a unique name for your new company profile workspace.
                    </DialogDescription>
                </DialogHeader>
            </div>

            <div className="px-6 py-4">
                <Form {...form}>
                    <form id="add-company-form" onSubmit={form.handleSubmit(handleSubmit)} className="w-full space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <h4 className="text-[15px] font-semibold text-slate-700 mb-1">
                                        Company Name
                                    </h4>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="e.g. Acme Corporation"
                                            className="h-11 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 rounded-xl transition-all"
                                            {...field}
                                            disabled={isSubmitting}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-rose-500" />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </div>

            <DialogFooter className="px-6 py-4 bg-slate-50/50 border-t border-slate-100/80 flex sm:justify-end gap-3 rounded-b-2xl">
                <Button
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    form="add-company-form"
                    className="bg-primary hover:bg-primary/95 text-white font-medium rounded-xl shadow-sm shadow-primary/20 hover:shadow-md transition-all active:scale-[0.98]"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Creating...' : 'Create Company'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

export default AddNewCompanyDialog;
