export type Category = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StockItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  minimumStock: number;
  categoryId: string;
  categoryName: string | null;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StockGroup = {
  id: string;
  name: string;
  description: string | null;
  items: StockItem[];
};

export type Transaction = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardData = {
  balance: number;
  income: number;
  expense: number;
  lowStock: StockItem[];
  recentTransactions: Transaction[];
};
