// src/pages/ProductsPage.tsx

import { useState, useMemo } from "react";
import type { Product } from "../types/inventory";
import Input from "../components/UI/Input";
import Button from "../components/UI/Button";

export type AddProductFormData = Omit<Product, "id">;
type FormErrors = Partial<Record<keyof AddProductFormData, string>>;

type TabType = "search" | "add";

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("search");

  // Sample catalog state
  const [products, setProducts] = useState<Product[]>([
    {
      id: "prod-1",
      product_code: "PRD-PARA-500",
      name: "Paracetamol 500mg Tablets",
      stock_unit: "Box",
      description: "Analgesic and antipyretic formulation.",
    },
    {
      id: "prod-2",
      product_code: "PRD-AMOX-250",
      name: "Amoxicillin 250mg Suspension",
      stock_unit: "Bottle",
      description: "Antibacterial medication for oral suspension.",
    },
    {
      id: "prod-3",
      product_code: "PRD-IBU-400",
      name: "Ibuprofen 400mg Softgels",
      stock_unit: "Blister Pack",
      description: "Nonsteroidal anti-inflammatory drug (NSAID).",
    },
  ]);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  // Create Product Form State
  const [formData, setFormData] = useState<AddProductFormData>({
    product_code: "",
    name: "",
    stock_unit: "",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Edit / Rename Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameUnit, setRenameUnit] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  // Filtered Products for Search
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.product_code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Handle Create Form Input
  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof AddProductFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(values: AddProductFormData): FormErrors {
    const errs: FormErrors = {};
    if (!values.product_code.trim()) errs.product_code = "Product code is required";
    if (!values.name.trim()) errs.name = "Product name is required";
    if (!values.stock_unit.trim()) errs.stock_unit = "Stock unit is required";
    return errs;
  }

  // Handle Form Submission (Add Product)
  async function handleAddProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusMessage(null);

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        product_code: formData.product_code.trim().toUpperCase(),
        name: formData.name.trim(),
        stock_unit: formData.stock_unit.trim(),
        description: formData.description?.trim() || undefined,
      };

      setProducts((prev) => [newProduct, ...prev]);
      setFormData({ product_code: "", name: "", stock_unit: "", description: "" });
      setStatusMessage({ text: `Product "${newProduct.name}" added successfully.`, type: "success" });
      setActiveTab("search"); // Switch tab to view catalog
    } catch {
      setStatusMessage({ text: "Failed to add product. Please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Open Rename / Edit Dialog
  function openEditModal(product: Product) {
    setEditingProduct(product);
    setRenameValue(product.name);
    setRenameUnit(product.stock_unit);
    setRenameError(null);
  }

  // Save Renamed Product
  function handleSaveRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameValue.trim()) {
      setRenameError("Product name cannot be empty.");
      return;
    }
    if (!renameUnit.trim()) {
      setRenameError("Stock unit cannot be empty.");
      return;
    }

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...p, name: renameValue.trim(), stock_unit: renameUnit.trim() }
            : p
        )
      );
      setEditingProduct(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mt-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Product Catalog
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, rename, and register master products for inventory tracking.
          </p>
        </div>

        {/* Global Notifications */}
        {statusMessage && (
          <div
            className={`mb-6 rounded-lg p-4 text-sm font-medium ${
              statusMessage.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Tab Navigation Controls */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "search"
                  ? "border-b-2 border-emerald-600 text-emerald-700 font-semibold"
                  : "text-slate-500 hover:border-b-2 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              Search & Manage Products ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "add"
                  ? "border-b-2 border-emerald-600 text-emerald-700 font-semibold"
                  : "text-slate-500 hover:border-b-2 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              + Add New Product
            </button>
          </nav>
        </div>

        {/* TAB 1: Search, Filter & Rename */}
        {activeTab === "search" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Input
                id="search_query"
                name="search_query"
                placeholder="Search by code, product name, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Product List */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No products matched your criteria.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => (
                    <li
                      key={product.id}
                      className="flex flex-col gap-2 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {product.product_code}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {product.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Unit: <span className="font-medium text-slate-700">{product.stock_unit}</span>
                          {product.description && ` • ${product.description}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          Rename / Edit
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Add New Product Form */}
        {activeTab === "add" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleAddProduct} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  id="product_code"
                  name="product_code"
                  label="Product Code / SKU"
                  placeholder="e.g. PRD-PARA-500"
                  value={formData.product_code}
                  onChange={handleFormChange}
                  error={errors.product_code}
                />

                <Input
                  id="stock_unit"
                  name="stock_unit"
                  label="Stock Unit"
                  placeholder="e.g. Box, Tablet, Vial"
                  value={formData.stock_unit}
                  onChange={handleFormChange}
                  error={errors.stock_unit}
                />
              </div>

              <Input
                id="name"
                name="name"
                label="Product Name"
                placeholder="e.g. Paracetamol 500mg Tablets"
                value={formData.name}
                onChange={handleFormChange}
                error={errors.name}
              />

              <Input
                as="textarea"
                id="description"
                name="description"
                label="Description (Optional)"
                rows={3}
                placeholder="Active ingredients, instructions, notes..."
                value={formData.description || ""}
                onChange={handleFormChange}
                error={errors.description}
              />

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setActiveTab("search")}
                  disabled={isSubmitting}
                  className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {isSubmitting ? "Creating..." : "Save Product"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Rename / Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Rename Product
            </h3>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              SKU: {editingProduct.product_code}
            </p>

            <form onSubmit={handleSaveRename} className="mt-4 space-y-4">
              <Input
                id="rename_name"
                name="rename_name"
                label="Product Name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
              />

              <Input
                id="rename_unit"
                name="rename_unit"
                label="Stock Unit"
                value={renameUnit}
                onChange={(e) => setRenameUnit(e.target.value)}
              />

              {renameError && (
                <p className="text-xs text-red-600">{renameError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}