/** Human-readable diff of proposal items for the audit history. */

export interface HistoryItem {
  productId: string;
  displayName: string;
  quantity: number;
}

const label = (item: HistoryItem) => `${item.displayName} ×${item.quantity}`;

/**
 * "PTZ Standard ×2 → PTZ NDI ×2". Items of the same product whose variant or
 * quantity changed are paired; the rest are listed as added/removed.
 */
export function describeItemChanges(before: HistoryItem[], after: HistoryItem[]): string[] {
  const changes: string[] = [];
  const beforeByProduct = new Map(before.map((i) => [i.productId, i]));
  const afterByProduct = new Map(after.map((i) => [i.productId, i]));

  for (const item of after) {
    const previous = beforeByProduct.get(item.productId);
    if (!previous) changes.push(`adicionou ${label(item)}`);
    else if (previous.displayName !== item.displayName || previous.quantity !== item.quantity) {
      changes.push(`alterou ${label(previous)} para ${label(item)}`);
    }
  }
  for (const item of before) {
    if (!afterByProduct.has(item.productId)) changes.push(`removeu ${label(item)}`);
  }
  return changes;
}

export interface ConditionsSnapshot {
  contractMonths: number;
  monthlyPayment: number;
  initialPayment: number;
}

export function describeConditionChanges(before: ConditionsSnapshot, after: ConditionsSnapshot, money: (cents: number) => string): string[] {
  const changes: string[] = [];
  if (before.contractMonths !== after.contractMonths) changes.push(`prazo ${before.contractMonths} → ${after.contractMonths} meses`);
  if (before.initialPayment !== after.initialPayment) changes.push(`entrada ${money(before.initialPayment)} → ${money(after.initialPayment)}`);
  if (before.monthlyPayment !== after.monthlyPayment) changes.push(`mensalidade ${money(before.monthlyPayment)} → ${money(after.monthlyPayment)}`);
  return changes;
}
