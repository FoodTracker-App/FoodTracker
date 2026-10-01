import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Input from "./UI/Input";
import Button from "./UI/Button";
import type { Product, StorageLocation } from "../types/inventory";

type BatchForm = {
  productId: string;
  location: string;
  lot: string;
  quantity: string;
  expiryDate: string;
};

type BatchFormErrors = Partial<Record<keyof BatchForm, string>>;

type BatchIntakeModalProps = {
  isOpen: boolean;
  products: Product[];
  locations: StorageLocation[];
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (batch: {
    productId: string;
    locationId: string;
    manufacturerLot?: string;
    quantity: number;
    expiryDate: string;
  }) => void | Promise<void>;
};

function isValidDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999) return false;

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export default function BatchIntakeModal({
  isOpen,
  products,
  locations,
  error,
  isSubmitting,
  onClose,
  onCreate,
}: BatchIntakeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<BatchForm>({
    productId: "",
    location: "",
    lot: "",
    quantity: "1",
    expiryDate: "",
  });
  const [errors, setErrors] = useState<BatchFormErrors>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function updateField(field: keyof BatchForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submitBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: BatchFormErrors = {};
    const quantity = Number(form.quantity);

    if (!form.productId) nextErrors.productId = "Choose a product.";
    if (!form.location) nextErrors.location = "Choose a storage location.";
    if (form.lot.trim().length > 100) {
      nextErrors.lot = "Lot number must be 100 characters or fewer.";
    }
    if (!form.quantity || !Number.isInteger(quantity) || quantity < 1) {
      nextErrors.quantity = "Enter a whole quantity of at least 1.";
    }
    if (!isValidDateOnly(form.expiryDate)) {
      nextErrors.expiryDate = "Enter a valid expiry date.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!products.some((item) => item.id === form.productId)) {
      setErrors({ productId: "Choose a product from the list." });
      return;
    }

    if (!locations.some((item) => item.id === form.location)) {
      setErrors({ location: "Choose a storage location from the list." });
      return;
    }

    void onCreate({
      productId: form.productId,
      locationId: form.location,
      manufacturerLot: form.lot.trim() || undefined,
      quantity,
      expiryDate: form.expiryDate,
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="batch-modal-title"
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(100%-2rem,42rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h2 id="batch-modal-title" className="text-lg font-semibold">
            Receive a batch
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add a separate lot with its own quantity, expiry, and location.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close batch form"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <form onSubmit={submitBatch} className="space-y-5 px-5 py-5 sm:px-6">
        {error && (
          <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div>
          <label
            htmlFor="batch-product"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Product <span className="text-rose-700">*</span>
          </label>
          <select
            id="batch-product"
            autoFocus
            value={form.productId}
            onChange={(event) => updateField("productId", event.target.value)}
            aria-invalid={Boolean(errors.productId)}
            aria-describedby={
              errors.productId ? "batch-product-error" : undefined
            }
            className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.product_code} · {product.name}
              </option>
            ))}
          </select>
          {errors.productId && (
            <p id="batch-product-error" className="mt-1 text-xs text-rose-700">
              {errors.productId}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="batch-lot"
            label="Batch / lot number"
            value={form.lot}
            onChange={(event) => updateField("lot", event.target.value)}
            maxLength={100}
            placeholder="e.g. LOT-2026-A"
            error={errors.lot}
          />
          <Input
            id="batch-quantity"
            label="Quantity"
            type="number"
            min={1}
            step={1}
            value={form.quantity}
            onChange={(event) => updateField("quantity", event.target.value)}
            error={errors.quantity}
          />
          <Input
            id="batch-expiry"
            label="Expiry date"
            type="date"
            value={form.expiryDate}
            onChange={(event) => updateField("expiryDate", event.target.value)}
            error={errors.expiryDate}
          />
          <div>
            <label
              htmlFor="batch-location"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Storage location <span className="text-rose-700">*</span>
            </label>
            <select
              id="batch-location"
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              aria-invalid={Boolean(errors.location)}
              aria-describedby={
                errors.location ? "batch-location-error" : undefined
              }
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Select a location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            {errors.location && (
              <p
                id="batch-location-error"
                className="mt-1 text-xs text-rose-700"
              >
                {errors.location}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Expiry is recorded as a calendar date. Past dates are allowed for
          accurate inventory records.
        </p>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialogRef.current?.close()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding batch..." : "Add batch"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
