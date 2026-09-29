// pages/BatchIntakePage.tsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { Product, StorageLocation } from "../types/inventory";
import Input from "../components/UI/Input";
import  Button  from "../components/UI/Button";

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
        // Replace with actual API calls if needed:
        setProducts([
          { id: "1", product_code: "PRD-001", name: "Paracetamol 500mg" },
          { id: "2", product_code: "PRD-002", name: "Amoxicillin 250mg" },
        ] as Product[]);

        setLocations([
          { id: "loc-1", name: "Main Warehouse - Rack A" },
          { id: "loc-2", name: "Cold Storage Room" },
        ] as StorageLocation[]);
      } catch (err) {
        console.error(err);
        setLoadError("Failed to load products or locations. Please refresh.");
      } finally {
        setIsLoadingData(false);
      }
    }

    loadOptions();
  }, []);

  // Generic input change handler
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
      console.log("Submitting batch intake values:", formData);
      navigate("/inventory/batches");
    } catch (err) {
      console.error(err);
      alert("Failed to submit the batch.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectClasses =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumbs */}
       

        {/* Page Header */}
        <div className="mt-7 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Batch Intake
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Record incoming stock, verify expiry dates, and assign to designated storage locations.
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
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
              {/* Product Select */}
              <div className="space-y-1">
                <label htmlFor="product_id" className="block text-sm font-medium text-gray-700">
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
                <label htmlFor="location_id" className="block text-sm font-medium text-gray-700">
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
                  // onClick={() => navigate("/inventory/batches")}
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