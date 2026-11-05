export interface Company {
    id: number;
    name: string;
    logoFile: string;
    valuation: string;
    investment: string;
    equity: number;
    category: string;
    round: string;
  }
  
  export interface FundingRound {
    organization: string;
    amount: number;
    round: string;
  }