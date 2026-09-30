import { useSyncExternalStore } from "react";
import {
  getDemoBatches,
  subscribeToDemoBatches,
} from "../services/demoInventoryService";

export function useDemoBatches() {
  return useSyncExternalStore(
    subscribeToDemoBatches,
    getDemoBatches,
    getDemoBatches,
  );
}
