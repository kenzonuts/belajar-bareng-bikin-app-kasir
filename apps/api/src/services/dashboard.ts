import { listLowStock } from './stock.js';
import { getBalanceSummary, listTransactions } from './transactions.js';

export async function getDashboard(userId: string) {
  const [summary, lowStock, recentTransactions] = await Promise.all([
    getBalanceSummary(userId),
    listLowStock(userId, 5),
    listTransactions(userId).then((rows) => rows.slice(0, 5)),
  ]);

  return {
    balance: summary.balance,
    income: summary.income,
    expense: summary.expense,
    lowStock,
    recentTransactions,
  };
}
