import { buildDemoBatches } from "../utils/demoInventory";
import type { DemoBatch } from "../utils/demoInventory";

const STORAGE_KEY = "stockwise-demo-batches";
const CHANGE_EVENT = "stockwise-demo-batches-changed";

let cachedBatches: DemoBatch[] | undefined;

export type NewDemoBatch = Omit<DemoBatch, "id">;

function isDemoBatch(value: unknown): value is DemoBatch {
  if (typeof value !== "object" || value === null) return false;

  const batch = value as Record<string, unknown>;
  return (
    typeof batch.id === "string" &&
    typeof batch.productId === "string" &&
    typeof batch.productCode === "string" &&
    typeof batch.productName === "string" &&
    typeof batch.lot === "string" &&
    typeof batch.quantity === "number" &&
    Number.isInteger(batch.quantity) &&
    typeof batch.unit === "string" &&
    typeof batch.expiryDate === "string" &&
    typeof batch.location === "string"
  );
}

function saveBatches(batches: DemoBatch[]) {
  cachedBatches = batches;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  } catch {
    // Keep the demo usable for this session when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getDemoBatches(): DemoBatch[] {
  if (cachedBatches) return cachedBatches;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.every(isDemoBatch)) {
        cachedBatches = parsed;
        return cachedBatches;
      }
    }
  } catch {
    // Fall back to fresh sample data if saved demo data is unavailable or invalid.
  }

  cachedBatches = buildDemoBatches();
  saveBatches(cachedBatches);
  return cachedBatches;
}

export function addDemoBatch(batch: NewDemoBatch): DemoBatch {
  const createdBatch: DemoBatch = {
    ...batch,
    id: `demo-${crypto.randomUUID()}`,
  };
  saveBatches([...getDemoBatches(), createdBatch]);
  return createdBatch;
}

export function subscribeToDemoBatches(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    cachedBatches = undefined;
    onChange();
  }

  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}
