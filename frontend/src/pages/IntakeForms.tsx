// pages/BatchIntakePage.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import type { Product, StorageLocation } from "../types/inventory";
import Input from "../components/UI/Input";
import Button from "../components/UI/Button";
import { ApiError, batchApi, locationApi, productApi } from "../api/client";

export type BatchIntakeValues = {
  product_id: string;
  location_id: string;
  manufacturer_lot: string;
  quantity: number | "";
  expiry_date: string;
  received_at: string;
};

type FormErrors = Partial<Record<keyof BatchIntakeValues, string>>;

export default function BatchIntakePage() {
  const navigate = useNavigate();

  // Dropdown reference data
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<BatchIntakeValues>({
    product_id: "",
    location_id: "",
    manufacturer_lot: "",
    quantity: 1,
    expiry_date: "",
    received_at: new Date().toISOString().slice(0, 16),
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
    async function loadOptions() {
      try {
        setIsLoadingData(true);
        const [availableProducts, availableLocations] = await Promise.all([
          productApi.list(),
          locationApi.list(),
        ]);
        setProducts(availableProducts);
        setLocations(availableLocations);
      } catch (error) {
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Failed to load products or locations. Please refresh.",
        );
      } finally {
        setIsLoadingData(false);
      }
    }

    loadOptions();
  }, []);

  // Generic input change handler
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));

    // Clear error for the field being edited
    if (errors[name as keyof BatchIntakeValues]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  // Manual validation logic
  function validate(values: BatchIntakeValues): FormErrors {
    const newErrors: FormErrors = {};

    if (!values.product_id.trim()) {
      newErrors.product_id = "Select a product";
    }

    if (!values.location_id.trim()) {
      newErrors.location_id = "Select a storage location";
    }

    if (values.manufacturer_lot && values.manufacturer_lot.length > 100) {
      newErrors.manufacturer_lot = "Lot number cannot exceed 100 characters";
    }

    if (values.quantity === "" || Number(values.quantity) <= 0) {
      newErrors.quantity = "Quantity must be greater than zero";
    } else if (!Number.isInteger(Number(values.quantity))) {
      newErrors.quantity = "Quantity must be a whole number";
    }

    if (!values.expiry_date) {
      newErrors.expiry_date = "Expiry date is required";
    } else if (new Date(values.expiry_date) <= new Date()) {
      newErrors.expiry_date = "Expiry date must be in the future";
    }

    if (!values.received_at) {
      newErrors.received_at = "Received date and time are required";
    }

    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await batchApi.create({
        productId: formData.product_id,
        locationId: formData.location_id,
        manufacturerLot: formData.manufacturer_lot.trim() || undefined,
        quantity: Number(formData.quantity),
        expiryDate: formData.expiry_date,
        receivedAt: new Date(formData.received_at).toISOString(),
      });
      navigate("/", { state: { notice: "Batch received successfully." } });
    } catch (error) {
      setLoadError(
        error instanceof ApiError ? error.message : "Failed to submit the batch.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectClasses =
    "w-full rounded-md border border-gray-300  text-gray-500 px-3 py-3 text-sm font-regular focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100";

  return (
    <div className="min-h-screen bg-gray-200/30 py-8 mt-5">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumbs */}

        {/* Page Header */}
        <div className="mt-7 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Batch Intake
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Record incoming stock, verify expiry dates, and assign to designated
            storage locations.
          </p>
        </div>

        {/* Loading / Error States */}
        {isLoadingData ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
            <p className="text-sm text-gray-500">Loading form options...</p>
          </div>
        ) : loadError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError}
          </div>
        ) : (
          /* Form Card */
          <div className="rounded-lg border border-gray-200 bg-white ">
            <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
              {/* Product Select */}
              <div className="space-y-1">
                <label
                  htmlFor="product_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  id="product_id"
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleChange}
                  className={selectClasses}
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.product_code} — {product.name}
                    </option>
                  ))}
                </select>
                {errors.product_id && (
                  <p className="text-xs text-red-600">{errors.product_id}</p>
                )}
              </div>

              {/* Storage Location Select */}
              <div className="space-y-1">
                <label
                  htmlFor="location_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Storage Location <span className="text-red-500">*</span>
                </label>
                <select
                  id="location_id"
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleChange}
                  className={selectClasses}
                >
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                {errors.location_id && (
                  <p className="text-xs text-red-600">{errors.location_id}</p>
                )}
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Input
                  id="manufacturer_lot"
                  name="manufacturer_lot"
                  label="Manufacturer Lot Number"
                  type="text"
                  maxLength={100}
                  placeholder="e.g. LOT-2026-X"
                  value={formData.manufacturer_lot}
                  onChange={handleChange}
                  error={errors.manufacturer_lot}
                />

                <Input
                  id="quantity"
                  name="quantity"
                  label="Quantity"
                  type="number"
                  min={1}
                  step={1}
                  value={formData.quantity}
                  onChange={handleChange}
                  error={errors.quantity}
                />

                <Input
                  id="expiry_date"
                  name="expiry_date"
                  label="Expiry Date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                  error={errors.expiry_date}
                />

                <Input
                  id="received_at"
                  name="received_at"
                  label="Received Date & Time"
                  type="datetime-local"
                  value={formData.received_at}
                  onChange={handleChange}
                  error={errors.received_at}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Receiving Batch..." : "Receive Batch"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
