// src/types/inventory.ts


// This is based on the database structure given in the backend. It defines the types for products, storage locations, batches, and stock movements.
export type Product = {
  id: string;
  product_code: string;
  name: string;
  stock_unit: string;
  description?: string;
};

export type StorageLocation = {
  id: string;
  name: string;
  description?: string;
};

export type Batch = {
  id: string;
  product_id: string;
  location_id: string;
  created_by_id: string;
  manufacturer_lot?: string;
  quantity: number;
  expiry_date: string;
  received_at: string;
  updated_at: string;

  product?: Product;
  location?: StorageLocation;
};

export type StockMovementType =
  | "RECEIPT"
  | "SALE"
  | "DAMAGE"
  | "DISPOSAL"
  | "CORRECTION";

export type StockMovement = {
  id: string;
  batch_id: string;
  performed_by_id: string;
  type: StockMovementType;
  quantity_change: number;
  reason: string;
  created_at: string;
};

export type ExpiryStatus =
  | "EXPIRED"
  | "TODAY"
  | "URGENT"
  | "UPCOMING";
