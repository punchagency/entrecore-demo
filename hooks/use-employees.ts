"use client";

import { useState, useEffect } from 'react';
import { Axios } from '@/app/config/axios';
import { useUserStore } from '@/app/store/userStore';
import { useDataCountsStore } from '@/app/store/dataCountsStore';
import { useDatasetStore } from '@/app/store/datasetStore';

export interface Employee {
  id: number;
  row_id?: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  role: string;
  hire_date: string;
  termination_date: string | null;
  manager_id: number | null;
  external_company_id: string;
  external_user_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  full_name?: string;
  job_title?: string;
  business_unit?: string;
  gender?: string;
  ethnicity?: string;
  age?: number;
  annual_salary?: number;
  bonus_percentage?: number;
  country?: string;
  city?: string;
}

interface ColumnData {
  id: string;
  column_id: string;
  table_id: string;
  value: string;
  created_at: string;
}

interface ColumnResponse {
  column_id: string;
  column_name: string;
  column_description: string | null;
  column_type: string;
  column_data_type: string | null;
  column_data_length: number | null;
  column_data_precision: number | null;
  column_data_scale: number | null;
  column_data: ColumnData[];
}

function transformColumnsToEmployees(columnsData: ColumnResponse[]): Employee[] {
  if (!Array.isArray(columnsData) || columnsData.length === 0) {
    return [];
  }

  console.log('Columns data structure:', columnsData.map(col => ({
    name: col.column_name,
    dataLength: col.column_data?.length || 0,
    sampleValues: col.column_data?.slice(0, 5).map(d => d.value) || []
  })));

  
  const primaryColumn = columnsData.reduce((prev, current) => 
    (current.column_data?.length || 0) > (prev.column_data?.length || 0) ? current : prev
  );

  const maxRows = primaryColumn.column_data?.length || 0;
  
  if (maxRows === 0) {
    return [];
  }

  console.log('Primary column:', primaryColumn.column_name, 'with', maxRows, 'rows');

  const employees: Employee[] = [];

  
  const columnMaps = new Map<string, { values: string[], isLookup: boolean }>();
  
  columnsData.forEach(column => {
    const columnName = column.column_name.toLowerCase().trim();
    const values = column.column_data?.map(d => d.value) || [];
    const isLookup = values.length < maxRows;
    
    columnMaps.set(columnName, { values, isLookup });
    
    console.log(`Column "${columnName}": ${values.length} values, isLookup: ${isLookup}`);
  });

  
  const getValue = (columnName: string, index: number): string => {
    const lowerColumnName = columnName.toLowerCase();
    
    
    let columnInfo = columnMaps.get(lowerColumnName);
    
    
    if (!columnInfo) {
      const matchingKey = Array.from(columnMaps.keys()).find(key => 
        key.includes(lowerColumnName) || lowerColumnName.includes(key)
      );
      columnInfo = matchingKey ? columnMaps.get(matchingKey) : undefined;
    }
    
    if (!columnInfo) return '';
    
    if (columnInfo.isLookup) {
        
      const valueIndex = index % columnInfo.values.length;
      return columnInfo.values[valueIndex] || '';
    } else {
      return columnInfo.values[index] || '';
    }
  };

  
  const getDistributedValue = (columnName: string, index: number): string => {
    const lowerColumnName = columnName.toLowerCase();
    let columnInfo = columnMaps.get(lowerColumnName);
    
    if (!columnInfo) {
      const matchingKey = Array.from(columnMaps.keys()).find(key => 
        key.includes(lowerColumnName) || lowerColumnName.includes(key)
      );
      columnInfo = matchingKey ? columnMaps.get(matchingKey) : undefined;
    }
    
    if (!columnInfo) return '';
    
    if (columnInfo.isLookup && columnInfo.values.length > 0) {
      
      const distributions = {
        'department': [0.2, 0.15, 0.15, 0.1, 0.2, 0.1, 0.1],
        'gender': [0.5, 0.5],
        'ethnicity': [0.4, 0.3, 0.15, 0.1, 0.05],
      };
      
      const distKey = Object.keys(distributions).find(key => lowerColumnName.includes(key));
      
      if (distKey && distributions[distKey as keyof typeof distributions]) {
        const dist = distributions[distKey as keyof typeof distributions];
        const random = (index * 7) % 100;
        let cumulative = 0;
        
        for (let i = 0; i < dist.length && i < columnInfo.values.length; i++) {
          cumulative += dist[i] * 100;
          if (random < cumulative) {
            return columnInfo.values[i];
          }
        }
      }
      
      const valueIndex = index % columnInfo.values.length;
      return columnInfo.values[valueIndex];
    } else {
      return columnInfo.values[index] || '';
    }
  };

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[$,%]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
    if (!fullName) return { firstName: '', lastName: '' };
    const parts = fullName.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    return { firstName, lastName };
  };

  const generateEmail = (firstName: string, lastName: string, employeeId: string): string => {
    if (firstName && lastName) {
      return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`;
    }
    return `${employeeId.toLowerCase()}@company.com`;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  for (let i = 0; i < maxRows; i++) {
    const employeeId = getValue('employee id', i);
    const fullName = getValue('full name', i);
    const jobTitle = getDistributedValue('job title', i);
    const department = getDistributedValue('department', i);
    const businessUnit = getDistributedValue('business unit', i);
    const gender = getDistributedValue('gender', i);
    const ethnicity = getDistributedValue('ethnicity', i);
    const age = getValue('age', i);
    const hireDate = getValue('hire date', i);
    const annualSalary = getValue('annual salary', i);
    const bonusPercentage = getValue('bonus %', i);
    const country = getDistributedValue('country', i);
    const city = getDistributedValue('city', i);
    const exitDate = getValue('exit date', i);

    if (i < 5) {
      console.log(`Employee ${i}:`, {
        employeeId,
        fullName,
        jobTitle,
        department,
        businessUnit
      });
    }

    const { firstName, lastName } = splitFullName(fullName);
    const email = generateEmail(firstName, lastName, employeeId);
    const currentDate = new Date().toISOString();

    const employee: Employee = {
      id: i + 1,
      employee_id: employeeId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      department: department,
      role: jobTitle,
      hire_date: formatDate(hireDate),
      termination_date: exitDate ? formatDate(exitDate) : null,
      manager_id: null,
      external_company_id: '',
      external_user_id: employeeId,
      created_at: currentDate,
      updated_at: currentDate,
      is_active: !exitDate,
      full_name: fullName,
      job_title: jobTitle,
      business_unit: businessUnit,
      gender: gender,
      ethnicity: ethnicity,
      age: parseNumber(age),
      annual_salary: parseNumber(annualSalary),
      bonus_percentage: parseNumber(bonusPercentage),
      country: country,
      city: city,
    };

    employees.push(employee);
  }

  console.log('Total employees created:', employees.length);
  return employees;
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const setEmployeeCount = useDataCountsStore(state => state.setEmployeeCount);
  const { selectedDatasets, getDatasetByType } = useDatasetStore();
  const {user} = useUserStore();  
  useEffect(() => {
    setSavedCompanyId(localStorage.getItem('selectedCompanyId' )||user?.active_company||null);
  }, []);
  
  useEffect(() => {
    if (!savedCompanyId) {
      console.error('User loaded but no company_id found:', savedCompanyId);
      setError('Company information not available');
      setLoading(false);
      return;
    }
    
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let response;
        
        const staffDataset = getDatasetByType('staff');
        
        if (staffDataset?.id && staffDataset?.columns) {
          response = await Axios.post(`/data/metadata/column-values/bulk`, {
            company_id: savedCompanyId,
            column_ids: staffDataset.columns,
          });
          
          const transformedData = transformColumnsToEmployees(response.data);
          
          setEmployees(transformedData);
          setEmployeeCount(transformedData.length);
        } else {
          response = await Axios.get('/data/employees/', {
            params: {
              skip: 0,
              limit: 100,
              company_id: savedCompanyId
            }
          });

          setEmployees(response.data);
          if (Array.isArray(response.data)) {
            setEmployeeCount(response.data.length);
          } else if (response.data && 'total' in response.data) {
            setEmployeeCount(response.data.total);
          }
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError('Failed to load employee data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [savedCompanyId, selectedDatasets]);

  const staffDataset = getDatasetByType('staff');

  return { 
    employees, 
    loading, 
    error,
    isDatasetSource: !!staffDataset?.id,
    datasetInfo: staffDataset
  };
}