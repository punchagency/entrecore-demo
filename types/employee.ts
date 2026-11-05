export interface Employee {
    id: string;
    name: string;
    title: string;
    imageUrl?: string;
    directReports?: Employee[];
  }