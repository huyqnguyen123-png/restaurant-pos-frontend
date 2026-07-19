// Centralized currency formatting — change the locale/currency here once,
// and every screen that imports formatCurrency updates automatically.
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}