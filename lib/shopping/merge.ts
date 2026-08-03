export function normalizeName(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

export function mergeQuantity(existing: number, add: number): number {
  return Math.round((existing + add) * 100) / 100;
}
