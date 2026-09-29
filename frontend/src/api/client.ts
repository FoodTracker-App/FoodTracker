import type {
  Batch,
  Product,
  StockMovement,
  StockMovementType,
  StorageLocation,
} from "../types/inventory";
import type { AuthUser } from "../Auth/context";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
  .replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type AuthResponse = AuthUser & {
  accessToken: string;
};

type PageResponse<T> = {
  items: T[];
};

type ApiProduct = {
  id: string;
  productCode: string;
  name: string;
  stockUnit: string;
  description: string | null;
};

type ApiLocation = {
  id: string;
  name: string;
  description: string | null;
};

type ApiBatch = {
  id: string;
  productId: string;
  locationId: string;
  createdById: string;
  manufacturerLot: string | null;
  quantity: number;
  expiryDate: string;
  receivedAt: string;
  updatedAt: string;
  product?: Pick<ApiProduct, "productCode" | "name" | "stockUnit">;
  location?: Pick<ApiLocation, "name">;
};

type ApiStockMovement = {
  id: string;
  batchId: string;
  performedById: string;
  type: StockMovementType;
  quantityChange: number;
  reason: string;
  createdAt: string;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const accessToken = token ?? localStorage.getItem("auth_token");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = payload as {
      error?: { code?: string; message?: string };
    };
    throw new ApiError(
      error.error?.message || `Request failed (${response.status}).`,
      response.status,
      error.error?.code || "REQUEST_FAILED",
    );
  }
  return payload as T;
}

const toProduct = (product: ApiProduct): Product => ({
  id: product.id,
  product_code: product.productCode,
  name: product.name,
  stock_unit: product.stockUnit,
  description: product.description ?? undefined,
});

const toLocation = (location: ApiLocation): StorageLocation => ({
  id: location.id,
  name: location.name,
  description: location.description ?? undefined,
});

const toBatch = (batch: ApiBatch): Batch => ({
  id: batch.id,
  product_id: batch.productId,
  location_id: batch.locationId,
  created_by_id: batch.createdById,
  manufacturer_lot: batch.manufacturerLot ?? undefined,
  quantity: batch.quantity,
  expiry_date: batch.expiryDate,
  received_at: batch.receivedAt,
  updated_at: batch.updatedAt,
  product: batch.product
    ? {
        id: batch.productId,
        product_code: batch.product.productCode,
        name: batch.product.name,
        stock_unit: batch.product.stockUnit,
      }
    : undefined,
  location: batch.location
    ? { id: batch.locationId, name: batch.location.name }
    : undefined,
});

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  me: (token: string) => request<AuthUser>("/auth/me", {}, token),
  logout: (token: string) =>
    request<void>("/auth/logout", { method: "POST" }, token),
};

export const productApi = {
  list: async () => {
    const result = await request<PageResponse<ApiProduct>>("/products?pageSize=100");
    return result.items.map(toProduct);
  },
  create: async (product: Omit<Product, "id">) =>
    toProduct(
      await request<ApiProduct>("/products", {
        method: "POST",
        body: JSON.stringify({
          productCode: product.product_code,
          name: product.name,
          stockUnit: product.stock_unit,
          description: product.description,
        }),
      }),
    ),
  update: async (id: string, input: { name: string }) =>
    toProduct(
      await request<ApiProduct>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    ),
};

export const locationApi = {
  list: async () => {
    const result = await request<PageResponse<ApiLocation>>("/storage-locations");
    return result.items.map(toLocation);
  },
  create: async (location: Omit<StorageLocation, "id">) =>
    toLocation(
      await request<ApiLocation>("/storage-locations", {
        method: "POST",
        body: JSON.stringify(location),
      }),
    ),
  update: async (
    id: string,
    input: { name: string; description?: string },
  ) =>
    toLocation(
      await request<ApiLocation>(`/storage-locations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    ),
};

export const batchApi = {
  list: async () => {
    const result = await request<PageResponse<ApiBatch>>("/batches?pageSize=100");
    return result.items.map(toBatch);
  },
  create: async (input: {
    productId: string;
    locationId: string;
    manufacturerLot?: string;
    quantity: number;
    expiryDate: string;
    receivedAt?: string;
    reason?: string;
  }) =>
    toBatch(
      await request<ApiBatch>("/batches", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ),
  adjustStock: async (input: {
    batchId: string;
    type: StockMovementType;
    quantityChange: number;
    reason: string;
  }): Promise<StockMovement> => {
    const movement = await request<ApiStockMovement>("/stock-movements", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return {
      id: movement.id,
      batch_id: movement.batchId,
      performed_by_id: movement.performedById,
      type: movement.type,
      quantity_change: movement.quantityChange,
      reason: movement.reason,
      created_at: movement.createdAt,
    };
  },
};
