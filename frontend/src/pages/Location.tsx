// src/pages/LocationsPage.tsx

import { useState, useMemo } from "react";
import { MapPin, Plus, Search, Edit2 } from "lucide-react";
import type { StorageLocation } from "../types/inventory";
import Input from "../components/UI/Input";
import Button from "../components/UI/Button";

export type AddLocationFormData = Omit<StorageLocation, "id">;
type FormErrors = Partial<Record<keyof AddLocationFormData, string>>;

type TabType = "manage" | "add";

export default function LocationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("manage");

  // Sample state for locations
  const [locations, setLocations] = useState<StorageLocation[]>([
    {
      id: "loc-1",
      name: "Main Warehouse - Rack A",
      description: "Primary staging area for non-refrigerated pharmaceuticals.",
    },
    {
      id: "loc-2",
      name: "Cold Storage Room B",
      description: "Temperature-controlled chamber maintained at 2°C - 8°C.",
    },
    {
      id: "loc-3",
      name: "Dispensing Floor Shelf 3",
      description: "Fast-moving front stock for outpatient prescription fills.",
    },
  ]);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form State
  const [formData, setFormData] = useState<AddLocationFormData>({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Edit Modal State
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return locations;
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.description && loc.description.toLowerCase().includes(q))
    );
  }, [locations, searchQuery]);

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof AddLocationFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(values: AddLocationFormData): FormErrors {
    const errs: FormErrors = {};
    if (!values.name.trim()) errs.name = "Location name is required";
    else if (values.name.trim().length < 3) {
      errs.name = "Location name must be at least 3 characters";
    }
    return errs;
  }

  // Handle Add Location
  async function handleAddLocation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusMessage(null);

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const newLocation: StorageLocation = {
        id: `loc-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      };

      setLocations((prev) => [newLocation, ...prev]);
      setFormData({ name: "", description: "" });
      setStatusMessage({
        text: `Location "${newLocation.name}" created successfully.`,
        type: "success",
      });
      setActiveTab("manage");
    } catch {
      setStatusMessage({
        text: "Failed to create location. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Open Edit Modal
  function openEditModal(loc: StorageLocation) {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditDescription(loc.description || "");
    setEditError(null);
  }

  // Save Edit
  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError("Location name cannot be empty.");
      return;
    }

    if (editingLocation) {
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === editingLocation.id
            ? {
                ...loc,
                name: editName.trim(),
                description: editDescription.trim() || undefined,
              }
            : loc
        )
      );
      setEditingLocation(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mt-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Storage Locations
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage warehouse bays, cold storage, and dispensing zones for batches.
            </p>
          </div>
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

        {/* Tab Controls */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="-mb-px flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab("manage")}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "manage"
                  ? "border-b-2 border-emerald-600 text-emerald-700 font-semibold"
                  : "text-slate-500 hover:border-b-2 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <MapPin className="h-4 w-4" />
              Manage Locations ({locations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`flex items-center gap-1.5 pb-3 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "add"
                  ? "border-b-2 border-emerald-600 text-emerald-700 font-semibold"
                  : "text-slate-500 hover:border-b-2 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          </nav>
        </div>

        {/* TAB 1: Search & Manage */}
        {activeTab === "manage" && (
          <div className="space-y-4">
            <div className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <Input
                id="search_locations"
                name="search_locations"
                placeholder="Search storage locations or room descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Location Cards */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {filteredLocations.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No storage locations found matching "{searchQuery}".
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredLocations.map((loc) => (
                    <li
                      key={loc.id}
                      className="flex flex-col gap-3 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {loc.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {loc.description || "No description provided."}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => openEditModal(loc)}
                        className="self-end sm:self-auto inline-flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 text-slate-400" />
                        Edit
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Add Location Form */}
        {activeTab === "add" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleAddLocation} className="space-y-5">
              <Input
                id="name"
                name="name"
                label="Location Name"
                placeholder="e.g. Cold Storage Chamber 1, Shelf B-4, Room 102"
                value={formData.name}
                onChange={handleFormChange}
                error={errors.name}
              />

              <Input
                as="textarea"
                id="description"
                name="description"
                label="Description & Instructions (Optional)"
                rows={3}
                placeholder="Temperature limits, aisle coordinates, access permissions..."
                value={formData.description || ""}
                onChange={handleFormChange}
                error={errors.description}
              />

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveTab("manage")}
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
                  {isSubmitting ? "Creating..." : "Save Location"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Edit Location Modal */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Edit Storage Location
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Update name or storage notes for reference throughout batch intakes.
            </p>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              <Input
                id="edit_name"
                name="edit_name"
                label="Location Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <Input
                as="textarea"
                id="edit_description"
                name="edit_description"
                label="Description"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />

              {editError && (
                <p className="text-xs text-red-600">{editError}</p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingLocation(null)}
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