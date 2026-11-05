"use client";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  MarkerType,
  Position,
  Handle,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { Edit, Plus, Search, Trash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useEmployees, Employee } from "@/hooks/use-employees";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import DeleteEmployeeDialog from "@/components/delete-employee-dialog";
import { EmployeeFormDialog } from "@/components/employee-form-dialog";


const formatRole = (role: string): string => {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface StaffNodeData {
  name: string;
  role: string;
  department: string;
  email: string;
}

const StaffNode = ({ data }: { data: StaffNodeData }) => {
  // Determine background color based on department
  const getDepartmentColor = (department: string): string => {
    const colorMap: Record<string, string> = {
      Engineering: "bg-blue-50 border-blue-300",
      Sales: "bg-emerald-50 border-emerald-300",
      Marketing: "bg-violet-50 border-violet-300",
      Operations: "bg-amber-50 border-amber-300",
      HR: "bg-rose-50 border-rose-300",
      Finance: "bg-yellow-50 border-yellow-300",
      IT: "bg-indigo-50 border-indigo-300",
      Product: "bg-sky-50 border-sky-300",
      Research: "bg-teal-50 border-teal-300",
      Legal: "bg-slate-50 border-slate-300",
      Other: "bg-neutral-50 border-neutral-300",
    };

    // Find matching department or return default
    for (const [key, value] of Object.entries(colorMap)) {
      if (department.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return "bg-white border-gray-200";
  };

  // Determine role badge color based on seniority
  const getRoleBadgeColor = (role: string): string => {
    if (role.toLowerCase().includes("chief") || role.toLowerCase().includes("ceo")) {
      return "bg-red-100 text-red-800";
    } else if (
      role.toLowerCase().includes("vice president") ||
      role.toLowerCase().includes("director")
    ) {
      return "bg-orange-100 text-orange-800";
    } else if (role.toLowerCase().includes("manager") || role.toLowerCase().includes("lead")) {
      return "bg-blue-100 text-blue-800";
    } else if (role.toLowerCase().includes("senior")) {
      return "bg-green-100 text-green-800";
    } else if (role.toLowerCase().includes("junior") || role.toLowerCase().includes("intern")) {
      return "bg-gray-100 text-gray-800";
    }
    return "bg-indigo-100 text-indigo-800";
  };

  return (
    <div
      className={`rounded-lg border-2 shadow-md p-4 min-w-[220px] ${getDepartmentColor(data.department)}`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-gray-400" />

      <div className="flex flex-col items-center gap-3">
        {/* Name */}
        <span className="font-bold text-gray-800 text-center">{data.name}</span>

        {/* Role Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(data.role)}`}
        >
          {data.role}
        </span>

        {/* Department with icon */}
        <div className="flex items-center text-xs text-gray-600 mt-1">
          <svg
            className="w-3 h-3 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
              clipRule="evenodd"
            ></path>
          </svg>
          {data.department}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-gray-400" />
    </div>
  );
};

const nodeTypes = {
  staffNode: StaffNode,
};

interface OrgChartLayout {
  nodes: Node[];
  edges: Edge[];
}


// Helper function to get role level (with fallback)
// Helper function to get role level (with updated hierarchy including your specific job titles)
const getRoleLevel = (role: string): number => {
  const roleHierarchy: Record<string, number> = {
    // C-Suite (Top Level)
    chief_executive_officer: 1,
    ceo: 1,
    
    // C-Suite (Second Level)
    chief_technology_officer: 2,
    chief_financial_officer: 2,
    chief_operating_officer: 2,
    chief_marketing_officer: 2,
    chief_human_resources_officer: 2,
    chief_information_officer: 2,
    cto: 2,
    cfo: 2,
    coo: 2,
    cmo: 2,
    chro: 2,
    cio: 2,

    // Executive Level
    president: 3,
    executive_vice_president: 4,
    senior_vice_president: 5,
    vice_president: 6,
    vp: 6,

    // Senior Management
    director: 7,
    senior_director: 6,
    
    // Management
    manager: 8,
    senior_manager: 7,
    sr_manager: 7,
    engineering_manager: 8,
    computer_systems_manager: 8,
    product_manager: 8,
    marketing_manager: 8,
    sales_manager: 8,
    hr_manager: 8,
    operations_manager: 8,
    it_manager: 8,
    
    // Senior Architects & Technical Leadership
    enterprise_architect: 9,
    technical_architect: 9,
    solutions_architect: 9,
    it_systems_architect: 9,
    cloud_infrastructure_architect: 9,
    network_architect: 9,
    // Team Leads & Senior Individual Contributors
    team_lead: 10,
    lead: 10,
    principal_engineer: 10,
    sr_business_partner: 10,
    sr_account_representative: 10,
    sr_analyst: 10,
    
    // Regular Individual Contributors - Technical
    automation_engineer: 11,
    development_engineer: 11,
    operations_engineer: 11,
    quality_engineer: 11,
    test_engineer: 11,
    controls_engineer: 11,
    field_engineer: 11,
    network_engineer: 11,
    
    // Regular Individual Contributors - Administrative/Support
    system_administrator: 11,
    network_administrator: 11,
    it_coordinator: 11,
    business_partner: 11,
    account_representative: 11,
    systems_analyst: 11,
    hris_analyst: 11,
    
    // Analysts (by seniority)
    analyst_ii: 12,
    analyst: 12,
    service_desk_analyst: 12,
    
    // Entry Level & Support
    junior_engineer: 13,
    contractor: 13,
    other: 13,
    
    // Interns
    intern: 14,

    // Legacy mappings for backward compatibility
    engineer: 11,
    qa_engineer: 11,
    devops_engineer: 11,
    data_engineer: 11,
    ml_engineer: 11,
    frontend_engineer: 11,
    backend_engineer: 11,
    fullstack_engineer: 11,
    customer_support: 12,
    consultant: 11,
    product_owner: 10,
    project_manager: 10,
    supply_chain_manager: 8,
    controller: 9,
    compliance_officer: 9,
    senior_engineer: 10,
    senior_analyst: 10,
    senior_specialist: 10,
    product_analyst: 10,
    ux_designer: 10,
    ui_designer: 10,
    graphic_designer: 10,
    marketing_specialist: 10,
    content_strategist: 10,
    seo_specialist: 10,
    sales_representative: 11,
    account_executive: 10,
    business_development: 10,
    financial_analyst: 11,
    accountant: 11,
    hr_specialist: 11,
    recruiter: 11,
    customer_success: 11,
    research_scientist: 10,
    r_d_engineer: 10,
    legal_counsel: 10,
  };

  // Normalize the role string for matching
  const normalizedRole = role.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // Direct match
  if (roleHierarchy[normalizedRole]) {
    return roleHierarchy[normalizedRole];
  }

  // Try partial matching with priority to more specific matches
  const partialMatches = Object.keys(roleHierarchy)
    .filter((key) => {
      // Check if the normalized role contains the key or vice versa
      return normalizedRole.includes(key) || key.includes(normalizedRole);
    })
    .sort((a, b) => {
      // Prioritize exact substring matches and longer matches
      const aExact = normalizedRole.includes(a) ? 1 : 0;
      const bExact = normalizedRole.includes(b) ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return b.length - a.length;
    });

  if (partialMatches.length > 0) {
    return roleHierarchy[partialMatches[0]];
  }

  // Special handling for common patterns not caught above
  if (normalizedRole.includes('vice') && normalizedRole.includes('president')) {
    return 6;
  }
  if (normalizedRole.includes('director')) {
    return 7;
  }
  if (normalizedRole.includes('manager')) {
    return 8;
  }
  if (normalizedRole.includes('senior') || normalizedRole.includes('sr')) {
    return 10;
  }
  if (normalizedRole.includes('architect')) {
    return 9;
  }
  if (normalizedRole.includes('engineer')) {
    return 11;
  }
  if (normalizedRole.includes('analyst')) {
  return 12;
  }

  // Default to mid-level if no match found
  return 11;
};


const createOrgChartLayout = (employees: Employee[]): OrgChartLayout => {
  const employeeMap = new Map<number, Employee>();
  employees.forEach((emp) => {
    employeeMap.set(emp.id, emp);
  });

  const departmentHeads: Record<string, Employee> = {};

  employees.forEach((emp) => {
    const department = emp.department;
    const roleLevel = getRoleLevel(emp.role);

    if (
      !departmentHeads[department] ||
      getRoleLevel(departmentHeads[department].role) > roleLevel
    ) {
      departmentHeads[department] = emp;
    }
  });

  let ceo = employees.find((emp) => emp.role.includes("chief_executive_officer"));
  if (!ceo) {
    ceo = employees.reduce((mostSenior, current) => {
      return getRoleLevel(current.role) < getRoleLevel(mostSenior.role) ? current : mostSenior;
    }, employees[0]);
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  employees.forEach((emp) => {
    // Add node for this employee
    nodes.push({
      id: emp.id.toString(),
      type: 'staffNode',
      data: {
        name: `${emp.first_name} ${emp.last_name}`,
        role: formatRole(emp.role),
        department: emp.department,
        email: emp.email
      },
      position: { x: 0, y: 0 }
    });
    
    const department = emp.department;
    const role = emp.role.toLowerCase();
    
    const isLeadershipRole = 
      role.includes('manager') || 
      role.includes('head') || 
      role.includes('lead') || 
      role.includes('director') ||
      role.includes('chief');
    
    if (isLeadershipRole && (
      !departmentHeads[department] ||
      getRoleLevel(departmentHeads[department].role) > getRoleLevel(emp.role)
    )) {
      departmentHeads[department] = emp;
    }
  });

  employees.forEach((emp) => {
    if (emp.manager_id && employeeMap.has(emp.manager_id)) {
      edges.push({
        id: `e${emp.manager_id}-${emp.id}`,
        source: emp.manager_id.toString(),
        target: emp.id.toString(),
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    }
    else if (emp.id !== ceo?.id) {
      const deptHead = departmentHeads[emp.department];

      if (deptHead && emp.id !== deptHead.id) {
        edges.push({
          id: `e${deptHead.id}-${emp.id}`,
          source: deptHead.id.toString(),
          target: emp.id.toString(),
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }
      else if (ceo && emp.id !== ceo.id) {
        edges.push({
          id: `e${ceo.id}-${emp.id}`,
          source: ceo.id.toString(),
          target: emp.id.toString(),
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }
    }
  });

  if (ceo) {
    Object.values(departmentHeads).forEach((deptHead) => {
      if (deptHead.id !== ceo.id) {
        edges.push({
          id: `e${ceo.id}-${deptHead.id}`,
          source: ceo.id.toString(),
          target: deptHead.id.toString(),
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }
    });
  }

  return { nodes, edges };
};
const applyHierarchicalLayout = (nodes: Node[], edges: Edge[]): Node[] => {
  const nodeLevels: Record<string, number> = {};

  nodes.forEach((node) => {
    const nodeData = node.data as StaffNodeData;
    const role = nodeData.role.toLowerCase().replace(/ /g, "_");
    nodeLevels[node.id] = getRoleLevel(role);
  });

  const nodesByLevel: Record<number, Node[]> = {};
  Object.entries(nodeLevels).forEach(([nodeId, level]) => {
    if (!nodesByLevel[level]) nodesByLevel[level] = [];
    const node = nodes.find((n) => n.id === nodeId);
    if (node) nodesByLevel[level].push(node);
  });

  const levelHeight = 150;
  const nodeWidth = 220;
  const nodeSpacing = 30;

  const positionedNodes = [...nodes];

  const sortedLevels = Object.keys(nodesByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  sortedLevels.forEach((level) => {
    const nodesInLevel = nodesByLevel[level];
    const levelWidth = nodesInLevel.length * (nodeWidth + nodeSpacing);
    const startX = -levelWidth / 2 + nodeWidth / 2;

    nodesInLevel.forEach((node, index) => {
      const nodeIndex = positionedNodes.findIndex((n) => n.id === node.id);
      if (nodeIndex !== -1) {
        positionedNodes[nodeIndex] = {
          ...positionedNodes[nodeIndex],
          position: {
            x: startX + index * (nodeWidth + nodeSpacing),
            y: level * levelHeight,
          },
        };
      }
    });
  });

  return positionedNodes;
};

export default function StaffPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { employees, loading, error, isDatasetSource } = useEmployees();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filteredEmployee, setFilteredEmployee] = useState<Employee | null>(null);

  console.log(employees);
  
  useEffect(() => {
    if (employees && employees.length > 0) {
      const { nodes: layoutNodes, edges: layoutEdges } = createOrgChartLayout(employees);
      const positionedNodes = applyHierarchicalLayout(layoutNodes, layoutEdges);
      setNodes(positionedNodes);
      setEdges(layoutEdges);
    }
  }, [employees]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as HTMLElement)) {
        setSearchResults([]);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (selectedEmployee && query !== `${selectedEmployee.first_name} ${selectedEmployee.last_name}`) {
      setSelectedEmployee(null);
    }
    
    if (query.trim().length > 0) {
      const results = employees.filter(emp => 
        emp.first_name.toLowerCase().includes(query.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(query.toLowerCase()) ||
        emp.role.toLowerCase().includes(query.toLowerCase()) ||
        emp.department.toLowerCase().includes(query.toLowerCase()) ||
        emp.email.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10); 
      
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectEmployee = (employee: Employee) => {
    setSearchQuery(`${employee.first_name} ${employee.last_name}`);
    setFilteredEmployee(employee);
    setSearchResults([]);
  };

  // Sort employees by row_id if available, otherwise keep original order
  const sortedEmployees = [...employees].sort((a, b) => {
    if (a.row_id && b.row_id) {
      // Convert row_id to number for proper numeric sorting
      const aRowId = parseInt(a.row_id) || 0;
      const bRowId = parseInt(b.row_id) || 0;
      return aRowId - bRowId;
    }
    // If no row_id, maintain original order using id
    return a.id - b.id;
  });

  const displayedEmployees = filteredEmployee 
    ? [filteredEmployee] 
    : sortedEmployees;         

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };
  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="flex flex-col items-start px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 sm:gap-6 py-4 sm:py-6">
        <div className="flex items-center gap-4 justify-between w-full">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold shrink-0">Organization Chart</h3>
         {!isDatasetSource &&
         <>
         <Button variant="outline" size="icon" onClick={() => setIsAddDialogOpen(true)} className="flex items-center w-40 sm:w-52 hover:bg-[#3064f6] hover:text-white py-5 bg-[#3064f6] text-white">

            <Plus />
            Add Employee
          </Button>
          <EmployeeFormDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            mode="add"
            managers={employees}
          /> 
          </>
          }
        </div>
      </div>

      <div className="w-full bg-white rounded-lg p-6">
        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="h-[500px] flex items-center justify-center text-red-500">
            Error loading staff data: {error}
          </div>
        ) : employees.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center text-gray-500">
            No staff data available
          </div>
        ) : (
          <div className="h-[650px] border rounded-lg">
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        )}
      </div>
      <div className="w-full flex flex-row items-center justify-between mt-12">
        <h3 className="text-base sm:text-lg lg:text-xl font-bold shrink-0">Employee List</h3>
        <div className="relative w-44 sm:w-48 md:w-60 lg:w-72" ref={searchRef}>
          <Search
            color="#000000"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none w-4 md:w-5"
          />
          <Input
            type="text"
            placeholder="Search staff"
            value={searchQuery}
            className="w-full rounded-full pl-8 md:pl-10 pr-2 md:pr-3 lg:pr-4"
            onChange={handleSearchChange}
          />
          
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 sm:max-h-56 lg:max-h-64 overflow-auto">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelectEmployee(result)}
                >
                  <span className="font-medium mr-3">
                    {result.first_name} {result.last_name}:
                  </span>
                  {formatRole(result.role)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 my-8 w-full">
        {filteredEmployee && (
          <div className="mb-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing results for: <span className="font-medium">{filteredEmployee.first_name} {filteredEmployee.last_name}</span>
            </div>
            <button 
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={() => {
                setFilteredEmployee(null);
                setSearchQuery('');
              }}
            >
              Show all employees
            </button>
          </div>
        )}
        
        <Table className="w-full border">
          <TableHeader>
            <TableRow className="bg-gray-50 text-soft-black">
              <TableHead className="border p-2 w-1/8 text-center font-bold">
                Employee First Name
              </TableHead>
              <TableHead className="border p-2 w-1/8 text-center font-bold">
                Employee Last Name
              </TableHead>
              <TableHead className="border p-2 w-1/8 text-center font-bold">Role</TableHead>
              <TableHead className="border p-2 w-1/8 text-center font-bold">Email</TableHead>
              <TableHead className="border p-2 w-1/8 text-center font-bold">Department</TableHead>
              <TableHead className="border p-2 w-1/8 text-center font-bold">Hire Date</TableHead>
              <TableHead className="border p-2 w-1/8 text-center font-bold">
                Termination Date
              </TableHead>
              {!isDatasetSource && <TableHead className="border p-2 w-1/8 text-center font-bold">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedEmployees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="border p-2 w-1/8 text-center">
                  {employee.first_name}
                </TableCell>
                <TableCell className="border p-2 w-1/8 text-center">{employee.last_name}</TableCell>
                <TableCell className="border p-2 w-1/8 text-center">{formatRole(employee.role)}</TableCell>
                <TableCell className="border p-2 w-1/8 text-center">{employee.email}</TableCell>
                <TableCell className="border p-2 w-1/8 text-center">
                  {employee.department.charAt(0).toUpperCase() + employee.department.slice(1)}
                </TableCell>
                <TableCell className="border p-2 w-1/8 text-center">{employee.hire_date}</TableCell>
                <TableCell className="border p-2 w-1/8 text-center">
                  {employee.termination_date}
                </TableCell>
                {!isDatasetSource && <TableCell className="border p-2 w-1/8 text-center space-x-6">
                  <Button variant="outline" size="icon" onClick={() => handleEditClick(employee)}>
                    <Edit />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleDeleteClick(employee)}
                  >
                    <Trash />
                  </Button>
                </TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EmployeeFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        initialData={selectedEmployee}
        managers={employees}
        />
      <DeleteEmployeeDialog 
        deleteOpen={deleteDialogOpen}
        setDeleteOpen={setDeleteDialogOpen}
        selectedEmployee={employeeToDelete}
      />
    </div>
  );
}