// src/pages/StockAdjustmentPage.tsx

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { Batch, StockMovementType } from "../types/inventory";
import Input from "../components/UI/Input";
import Button from "../components/UI/Button";

export type StockAdjustmentFormData = {
  batch_id: string;
  type: StockMovementType;
  quantity_change: number | "";
  reason: string;
};

type FormErrors = Partial<Record<keyof StockAdjustmentFormData, string>>;

const MOVEMENT_TYPES: { label: string; value: StockMovementType; isDeduction: boolean }[] = [
  { label: "Damage (Physical breakage / contamination)", value: "DAMAGE", isDeduction: true },
  { label: "Disposal (Expired or spoiled inventory)", value: "DISPOSAL", isDeduction: true },
  { label: "Stock Count Correction (Discrepancy)", value: "CORRECTION", isDeduction: false },
  { label: "Manual Receipt (Found stock)", value: "RECEIPT", isDeduction: false },
  { label: "Sale Adjustment / Return", value: "SALE", isDeduction: false },
];

export default function StockAdjustmentPage() {
  const navigate = useNavigate();

  // Reference batches list
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<StockAdjustmentFormData>({
    batch_id: "",
    type: "DAMAGE",
    quantity_change: "",
    reason: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Load available batches with embedded product and location details
  useEffect(() => {
    async function loadBatches() {
      try {
        setIsLoadingBatches(true);
        // Replace with your real API fetch, e.g., getBatches()
        const mockBatches: Batch[] = [
          {
            id: "batch-101",
            product_id: "prod-1",
            location_id: "loc-1",
            created_by_id: "user-1",
            manufacturer_lot: "LOT-2026-A",
            quantity: 48,
            expiry_date: "2026-12-31",
            received_at: "2026-01-15T09:00:00Z",
            updated_at: "2026-01-15T09:00:00Z",
            product: {
              id: "prod-1",
              product_code: "PRD-001",
              name: "Paracetamol 500mg",
              stock_unit: "Box",
            },
            location: {
              id: "loc-1",
              name: "Main Warehouse - Rack A",
            },
          },
          {
            id: "batch-102",
            product_id: "prod-2",
            location_id: "loc-2",
            created_by_id: "user-1",
            manufacturer_lot: "LOT-2026-B",
            quantity: 12,
            expiry_date: "2026-10-15",
            received_at: "2026-02-10T10:30:00Z",
            updated_at: "2026-02-10T10:30:00Z",
            product: {
              id: "prod-2",
              product_code: "PRD-002",
              name: "Amoxicillin 250mg",
              stock_unit: "Vial",
            },
            location: {
              id: "loc-2",
              name: "Cold Storage Room",
            },
          },
        ];

        setBatches(mockBatches);
      } catch (err) {
        console.error(err);
        setLoadError("Could not retrieve active inventory batches. Please refresh.");
      } finally {
        setIsLoadingBatches(false);
      }
    }

    loadBatches();
  }, []);

  // Currently selected batch
  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === formData.batch_id),
    [batches, formData.batch_id]
  );

  // Projected new stock calculation
  const projectedQuantity = useMemo(() => {
    if (!selectedBatch || formData.quantity_change === "") return null;
    const change = Number(formData.quantity_change);
    return selectedBatch.quantity + change;
  }, [selectedBatch, formData.quantity_change]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));

    if (errors[name as keyof StockAdjustmentFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  // Quick helper to flip sign when clicking presets (e.g. Damage -> automatically suggests negative)
  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newType = e.target.value as StockMovementType;
    const typeMeta = MOVEMENT_TYPES.find((t) => t.value === newType);

    setFormData((prev) => {
      let qty = prev.quantity_change;
      if (typeof qty === "number" && qty !== 0) {
        if (typeMeta?.isDeduction && qty > 0) qty = -Math.abs(qty);
      }
      return { ...prev, type: newType, quantity_change: qty };
    });

    if (errors.type) {
      setErrors((prev) => ({ ...prev, type: undefined }));
    }
  }

  function validate(values: StockAdjustmentFormData): FormErrors {
    const newErrors: FormErrors = {};

    if (!values.batch_id) {
      newErrors.batch_id = "Please select a batch to adjust";
    }

    if (values.quantity_change === "" || Number(values.quantity_change) === 0) {
      newErrors.quantity_change = "Enter a non-zero adjustment quantity";
    } else if (!Number.isInteger(Number(values.quantity_change))) {
      newErrors.quantity_change = "Quantity must be a whole integer";
    } else if (
      selectedBatch &&
      selectedBatch.quantity + Number(values.quantity_change) < 0
    ) {
      newErrors.quantity_change = `Adjustment cannot reduce stock below zero (current: ${selectedBatch.quantity} ${selectedBatch.product?.stock_unit || "units"})`;
    }

    if (!values.reason.trim()) {
      newErrors.reason = "A reason or audit justification is required";
    } else if (values.reason.trim().length < 5) {
      newErrors.reason = "Please provide a more descriptive reason (min 5 characters)";
    }

    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Payload ready for your stock movement API:
      const payload = {
        batch_id: formData.batch_id,
        type: formData.type,
        quantity_change: Number(formData.quantity_change),
        reason: formData.reason.trim(),
      };

      console.log("Submitting stock adjustment:", payload);

      // Navigate to batch details or movement history
      navigate("/inventory/movements");
    } catch (err) {
      console.error(err);
      setServerError("Failed to record the stock adjustment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectClasses =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mt-10 mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Stock Adjustment
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Log inventory discrepancies, damage, disposal, or manual count corrections.
          </p>
        </div>

        {/* Server Alert Message */}
        {serverError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {isLoadingBatches ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <p className="text-sm text-slate-500">Loading active batches...</p>
          </div>
        ) : loadError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Batch Selector */}
              <div>
                <label
                  htmlFor="batch_id"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Target Batch <span className="text-red-500">*</span>
                </label>
                <select
                  id="batch_id"
                  name="batch_id"
                  value={formData.batch_id}
                  onChange={handleChange}
                  className={`${selectClasses} ${errors.batch_id ? "border-red-400 focus:ring-red-100" : ""}`}
                >
                  <option value="">Select a batch to adjust</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.product?.name || "Unknown Product"} (Lot: {batch.manufacturer_lot || "N/A"}) — Current: {batch.quantity} {batch.product?.stock_unit || "units"}
                    </option>
                  ))}
                </select>
                {errors.batch_id && (
                  <p className="mt-1 text-xs text-red-600">{errors.batch_id}</p>
                )}
              </div>

              {/* Selected Batch Summary Card */}
              {selectedBatch && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">Product Code:</span>
                    <span>{selectedBatch.product?.product_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">Location:</span>
                    <span>{selectedBatch.location?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">Current Balance:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedBatch.quantity} {selectedBatch.product?.stock_unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">Expiry Date:</span>
                    <span>{selectedBatch.expiry_date}</span>
                  </div>
                </div>
              )}

              {/* Adjustment Type & Quantity */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="type"
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Adjustment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleTypeChange}
                    className={selectClasses}
                  >
                    {MOVEMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Input
                    id="quantity_change"
                    name="quantity_change"
                    label="Quantity Change (+ or -)"
                    type="number"
                    step={1}
                    placeholder="e.g. -5 or 10"
                    value={formData.quantity_change}
                    onChange={handleChange}
                    error={errors.quantity_change}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Use negative numbers for deductions (e.g. <span className="font-mono text-slate-700">-5</span>) and positive for additions.
                  </p>
                </div>
              </div>

              {/* Calculated Real-time Balance Preview */}
              {selectedBatch && projectedQuantity !== null && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm flex items-center justify-between ${
                    projectedQuantity < 0
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-blue-100 bg-blue-50 text-blue-900"
                  }`}
                >
                  <span>Projected Batch Balance:</span>
                  <span className="font-semibold text-base">
                    {projectedQuantity} {selectedBatch.product?.stock_unit}
                  </span>
                </div>
              )}

              {/* Audit Reason */}
              <Input
                as="textarea"
                id="reason"
                name="reason"
                label="Adjustment Reason & Notes"
                rows={3}
                placeholder="Explain why this inventory adjustment is being made (e.g., Vial dropped and shattered during transfer)..."
                value={formData.reason}
                onChange={handleChange}
                error={errors.reason}
              />

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
                <Button
                variant="secondary"
                  type="button"
                  onClick={() => navigate("/inventory/movements")}
                  disabled={isSubmitting}
                  className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Recording..." : "Apply Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}