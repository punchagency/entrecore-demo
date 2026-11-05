"use client";
import * as z from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Label } from "@radix-ui/react-label";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";
import { v4 as uuidv4 } from 'uuid';

import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useDataCountsStore } from "@/app/store/dataCountsStore";

interface EmployeeData {
  id?: string | number;
  external_company_id?: string;
  external_user_id?: string;
  employee_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
  hire_date?: string;
  termination_date?: string | null;
  manager_id?: number | null;
  company_id?: string;
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initialData?: EmployeeData | null;
  managers?: EmployeeData[];
}

const employeeFormSchema = z.object({
  external_company_id: z.string().optional(),
  external_user_id: z.string().optional(),
  employee_id: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
  department: z.string().min(1, "Department is required"),
  hire_date: z.string().optional(),
  termination_date: z.string().optional().nullable(),
  manager_id: z.number().optional().nullable(),
});

type FormData = z.infer<typeof employeeFormSchema>;

export function EmployeeFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  managers = [],
}: EmployeeFormDialogProps) {
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {user} = useUserStore();  
  useEffect(() => {
    setSavedCompanyId(localStorage.getItem('selectedCompanyId' )||user?.active_company||null);
  }, []);
  const queryClient = useQueryClient();
  const updateEmployeesTimestamp = useDataCountsStore(state => state.updateEmployeesTimestamp);

  const form = useForm<FormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      email: initialData?.email || "",
      role: initialData?.role || "",
      department: initialData?.department || "",
      hire_date: initialData?.hire_date || new Date().toISOString().split("T")[0],
      termination_date: initialData?.termination_date || null,
      manager_id: initialData?.manager_id || null,
    },
  });

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        first_name: initialData.first_name || "",
        last_name: initialData.last_name || "",
        email: initialData.email || "",
        role: initialData.role || "",
        department: initialData.department || "",
        hire_date: initialData.hire_date || new Date().toISOString().split("T")[0],
        termination_date: initialData.termination_date || null,
        manager_id: initialData.manager_id || null,
      });
    }
    form.clearErrors();
  }, [initialData, open, form]);

  const employeeMutation = useMutation({
    mutationFn: async (data: EmployeeData) => {
      const employeeData = {
        external_company_id: savedCompanyId || null,
        external_user_id: data.external_user_id || null,
        employee_id: data.employee_id ||`EMP-${uuidv4().split('-')[0]}`,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        role: data.role,
        department: data.department,
        hire_date: data.hire_date || new Date().toISOString().split("T")[0],
        termination_date: data.termination_date || null,
        manager_id: data.manager_id || null
      };
      
      if (mode === "edit" && initialData?.id) {
        updateEmployeesTimestamp();
        return Axios.put(`/data/employees/${initialData.id}`, employeeData);
      } else {
        updateEmployeesTimestamp();
        return Axios.post("/data/employees/", employeeData);
      }
    },
    onSuccess: () => {
      toast.success(
        mode === "add" ? "Employee added successfully" : "Employee updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      onOpenChange(false);
      form.reset();
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error("Error saving employee:", error);
      toast.error("Failed to save employee information");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (values: FormData) => {
    setIsSubmitting(true);

    try {
      const employeeData: EmployeeData = {
        ...values,
        external_company_id: savedCompanyId || "",
        external_user_id: "", // You may need to set this based on your requirements
        employee_id: initialData?.employee_id || "", // Preserve existing employee_id if editing
        company_id: savedCompanyId || "",
      };
  

      await employeeMutation.mutateAsync(employeeData);
    } catch (error) {
      console.error("Error in employee submission:", error);
      setIsSubmitting(false);
    }
  };

  const formatRole = (role: string): string => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#EFF4FF] max-h-[80vh] overflow-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isSubmitting && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EFF4FF] bg-opacity-70 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-primary font-medium">Saving...</p>
            </div>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New Employee" : "Edit Employee"}</DialogTitle>
          <hr className="w-full border-gray-200 my-[0.25vw]" />
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-sm md:text-base font-bold">First Name</Label>
                    <FormControl>
                      <Input placeholder="First Name" className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-sm md:text-base font-bold">Last Name</Label>
                    <FormControl>
                      <Input placeholder="Last Name" className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm md:text-base font-bold">Email</Label>
                  <FormControl>
                    <Input type="email" placeholder="Email" className="bg-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-sm md:text-base font-bold">Role</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="chief_executive_officer">CEO</SelectItem>
                        <SelectItem value="chief_technology_officer">CTO</SelectItem>
                        <SelectItem value="chief_financial_officer">CFO</SelectItem>
                        <SelectItem value="chief_operating_officer">COO</SelectItem>
                        <SelectItem value="chief_marketing_officer">CMO</SelectItem>
                        <SelectItem value="chief_human_resources_officer">CHRO</SelectItem>
                        <SelectItem value="chief_information_officer">CIO</SelectItem>
                        <SelectItem value="vice_president">Vice President</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="principal_engineer">Principal Engineer</SelectItem>
                        <SelectItem value="senior_engineer">Senior Engineer</SelectItem>
                        <SelectItem value="engineer">Engineer</SelectItem>
                        <SelectItem value="junior_engineer">Junior Engineer</SelectItem>
                        <SelectItem value="qa_engineer">QA Engineer</SelectItem>
                        <SelectItem value="devops_engineer">DevOps Engineer</SelectItem>
                        <SelectItem value="data_engineer">Data Engineer</SelectItem>
                        <SelectItem value="ml_engineer">ML Engineer</SelectItem>
                        <SelectItem value="frontend_engineer">Frontend Engineer</SelectItem>
                        <SelectItem value="backend_engineer">Backend Engineer</SelectItem>
                        <SelectItem value="fullstack_engineer">Fullstack Engineer</SelectItem>
                        <SelectItem value="product_manager">Product Manager</SelectItem>
                        <SelectItem value="product_owner">Product Owner</SelectItem>
                        <SelectItem value="product_analyst">Product Analyst</SelectItem>
                        <SelectItem value="ux_designer">UX Designer</SelectItem>
                        <SelectItem value="ui_designer">UI Designer</SelectItem>
                        <SelectItem value="graphic_designer">Graphic Designer</SelectItem>
                        <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                        <SelectItem value="marketing_specialist">Marketing Specialist</SelectItem>
                        <SelectItem value="content_strategist">Content Strategist</SelectItem>
                        <SelectItem value="seo_specialist">SEO Specialist</SelectItem>
                        <SelectItem value="sales_manager">Sales Manager</SelectItem>
                        <SelectItem value="sales_representative">Sales Representative</SelectItem>
                        <SelectItem value="account_executive">Account Executive</SelectItem>
                        <SelectItem value="business_development">Business Development</SelectItem>
                        <SelectItem value="financial_analyst">Financial Analyst</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                        <SelectItem value="controller">Controller</SelectItem>
                        <SelectItem value="hr_manager">HR Manager</SelectItem>
                        <SelectItem value="hr_specialist">HR Specialist</SelectItem>
                        <SelectItem value="recruiter">Recruiter</SelectItem>
                        <SelectItem value="operations_manager">Operations Manager</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                        <SelectItem value="supply_chain_manager">Supply Chain Manager</SelectItem>
                        <SelectItem value="customer_success">Customer Success</SelectItem>
                        <SelectItem value="customer_support">Customer Support</SelectItem>
                        <SelectItem value="research_scientist">Research Scientist</SelectItem>
                        <SelectItem value="r_d_engineer">R&D Engineer</SelectItem>
                        <SelectItem value="legal_counsel">Legal Counsel</SelectItem>
                        <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                        <SelectItem value="it_manager">IT Manager</SelectItem>
                        <SelectItem value="system_administrator">System Administrator</SelectItem>
                        <SelectItem value="network_engineer">Network Engineer</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-sm md:text-base font-bold">Department</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
              <FormField
                control={form.control}
                name="hire_date"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-sm md:text-base font-bold">Hire Date</Label>
                    <FormControl>
                      <Input type="date" className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="termination_date"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-sm md:text-base font-bold">Termination Date</Label>
                    <FormControl>
                      <Input
                        type="date"
                        className="bg-white"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

<FormField
  control={form.control}
  name="manager_id"
  render={({ field }) => (
    <FormItem className="mb-12">
      <Label className="text-sm md:text-base font-bold ">Manager</Label>
      <Select 
        onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))} 
        defaultValue={field.value ? String(field.value) : "null"}
      >
        <FormControl>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Select Manager" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="null">No Manager</SelectItem>
          {mode === "edit" && initialData 
            ? managers.filter((manager) => manager.id !== initialData.id).map((manager) => (
                <SelectItem key={manager.id} value={String(manager.id)}>
                  {manager.first_name} {manager.last_name} - {formatRole(manager.role)}
                </SelectItem>
              ))
            : managers.map((manager) => (
                <SelectItem key={manager.id} value={String(manager.id)}>
                  {manager.first_name} {manager.last_name} - {formatRole(manager.role)}
                </SelectItem>
              ))
          }
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
            <Button type="submit" className="bg-primary text-white py-6 cursor-pointer w-full">
              {mode === "add" ? "Add Employee" : "Update Employee"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
