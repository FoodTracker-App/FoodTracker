import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  PackagePlus,
  Search,
  XCircle,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BatchIntakeModal from "../components/BatchIntakeModal";
import Button from "../components/UI/Button";
import { ApiError, batchApi, locationApi, productApi } from "../api/client";
import type { Batch, Product, StorageLocation } from "../types/inventory";
import {
  dateKey,
  daysUntil,
  expiryCopy,
  formatDate,
  getExpiryBucket,
} from "../utils/inventoryDates";
import type { ExpiryBucket } from "../utils/inventoryDates";

type ExpiryFilter = "all" | ExpiryBucket;
type SortOption = "expiry" | "product" | "quantity";

const expiryDetails: Record<
  ExpiryBucket,
  { label: string; className: string; icon: typeof Clock3 }
> = {
  expired: {
    label: "Expired",
    className: "border-rose-200 bg-rose-50 text-rose-800",
    icon: XCircle,
  },
  today: {
    label: "Expires today",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: CalendarDays,
  },
  soon: {
    label: "Within 3 days",
    className: "border-orange-200 bg-orange-50 text-orange-900",
    icon: Clock3,
  },
  later: {
    label: "Safe / later",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CheckCircle2,
  },
};

const expiryOrder: ExpiryBucket[] = ["expired", "today", "soon", "later"];

type InventoryBatch = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  lot: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  location: string;
};

const toInventoryBatch = (batch: Batch): InventoryBatch => ({
  id: batch.id,
  productId: batch.product_id,
  productCode: batch.product?.product_code ?? "UNKNOWN",
  productName: batch.product?.name ?? "Unknown product",
  lot: batch.manufacturer_lot ?? "Unassigned lot",
  quantity: batch.quantity,
  unit: batch.product?.stock_unit ?? "units",
  expiryDate: batch.expiry_date,
  location: batch.location?.name ?? "Unassigned",
});

function BatchInventory() {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const today = dateKey(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const [sort, setSort] = useState<SortOption>("expiry");
  const [notice, setNotice] = useState<string | null>(null);
  const isCreateRoute = location.pathname === "/batches/new";
  const isCreateOpen = modalOpen || isCreateRoute;

  useEffect(() => {
    let active = true;

    async function loadInventory() {
      try {
        const [batchData, productData, locationData] = await Promise.all([
          batchApi.list(),
          productApi.list(),
          locationApi.list(),
        ]);
        if (!active) return;
        setBatches(batchData.map(toInventoryBatch));
        setProducts(productData);
        setStorageLocations(locationData);
        setLoadError(null);
      } catch (error) {
        if (!active) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Failed to load inventory from the backend.",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadInventory();
    return () => {
      active = false;
    };
  }, []);

  const locationOptions = useMemo(
    () => [...new Set(batches.map((batch) => batch.location))].sort(),
    [batches],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<ExpiryBucket, number> = {
      expired: 0,
      today: 0,
      soon: 0,
      later: 0,
    };
    for (const batch of batches) {
      counts[getExpiryBucket(daysUntil(batch.expiryDate, today))] += 1;
    }
    return counts;
  }, [batches, today]);

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return batches
      .filter((batch) => {
        const matchesSearch =
          !query ||
          [
            batch.productName,
            batch.productCode,
            batch.lot,
            batch.location,
          ].some((value) => value.toLowerCase().includes(query));
        const matchesLocation =
          locationFilter === "all" || batch.location === locationFilter;
        const matchesExpiry =
          expiryFilter === "all" ||
          getExpiryBucket(daysUntil(batch.expiryDate, today)) === expiryFilter;
        return matchesSearch && matchesLocation && matchesExpiry;
      })
      .sort((first, second) => {
        if (sort === "product") {
          return first.productName.localeCompare(second.productName);
        }
        if (sort === "quantity") return second.quantity - first.quantity;
        return (
          daysUntil(first.expiryDate, today) -
          daysUntil(second.expiryDate, today)
        );
      });
  }, [batches, expiryFilter, locationFilter, search, sort, today]);

  const productCount = new Set(batches.map((batch) => batch.productId)).size;
  const attentionCount =
    statusCounts.expired + statusCounts.today + statusCounts.soon;
  const hasFilters =
    search.trim() !== "" || locationFilter !== "all" || expiryFilter !== "all";

  function closeCreateModal() {
    setModalOpen(false);
    setCreateError(null);
    if (isCreateRoute) navigate("/batches", { replace: true });
  }

  async function createBatch(input: Parameters<typeof batchApi.create>[0]) {
    setIsSubmitting(true);
    setCreateError(null);
    try {
      const createdBatch = await batchApi.create(input);
      const displayBatch = toInventoryBatch(createdBatch);
      setBatches((current) => [...current, displayBatch]);
      setNotice(`Batch ${displayBatch.lot} added to inventory.`);
      closeCreateModal();
    } catch (error) {
      setCreateError(
        error instanceof ApiError
          ? error.message
          : "Failed to add the batch to inventory.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setLocationFilter("all");
    setExpiryFilter("all");
  }

  function renderStatus(bucket: ExpiryBucket, days: number) {
    const details = expiryDetails[bucket];
    return (
      <span
        className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-semibold ${details.className}`}
      >
        {details.label}
        <span className="font-normal">· {expiryCopy(days)}</span>
      </span>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f9faf9] px-4 pb-12 pt-24 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">Loading live inventory...</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#f9faf9] px-4 pb-12 pt-24 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          <p className="font-semibold">Unable to load live inventory</p>
          <p className="mt-2">{loadError}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9faf9] px-4 pb-12 pt-24 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Batch inventory
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Each delivery stays separate, with its own quantity, expiry date,
              and storage location.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/alerts"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Expiry alerts <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Button onClick={() => setModalOpen(true)}>
              <PackagePlus aria-hidden="true" className="mr-2" size={17} />
              Add batch
            </Button>
          </div>
        </header>


        {notice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
              className="rounded p-1 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        <section
          aria-label="Inventory summary"
          className="mb-5 grid gap-3 sm:grid-cols-3"
        >
          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Batch records</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {batches.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Separate lots on hand</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">
              Products represented
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {productCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Catalog items with a batch
            </p>
          </article>
          <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Expiry attention
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-950">
              {attentionCount}
            </p>
            <p className="mt-1 text-xs text-amber-900">
              Expired or due within 3 days
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  All batches
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredBatches.length} of {batches.length} records
                </p>
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-9 items-center gap-2 self-start rounded-md px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:self-auto"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(160px,0.55fr)_minmax(170px,0.6fr)_minmax(160px,0.55fr)]">
              <label className="relative block">
                <span className="sr-only">
                  Search product, code, lot, or location
                </span>
                <Search
                  aria-hidden="true"
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, lot, location"
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label>
                <span className="sr-only">Filter by storage location</span>
                <select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">All locations</option>
                  {locationOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by expiry status</span>
                <select
                  value={expiryFilter}
                  onChange={(event) =>
                    setExpiryFilter(event.target.value as ExpiryFilter)
                  }
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">All expiry statuses</option>
                  {expiryOrder.map((item) => (
                    <option key={item} value={item}>
                      {expiryDetails[item].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="relative">
                <ArrowDownWideNarrow
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <span className="sr-only">Sort batches</span>
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as SortOption)
                  }
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="expiry">Earliest expiry</option>
                  <option value="product">Product name</option>
                  <option value="quantity">Largest quantity</option>
                </select>
              </label>
            </div>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="font-semibold text-slate-800">
                {batches.length === 0
                  ? "No batches yet"
                  : "No matching batches"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {batches.length === 0
                  ? "Add a batch to start tracking quantity, expiry, and location."
                  : "Try another search or clear the selected filters."}
              </p>
              {batches.length === 0 ? (
                <Button className="mt-4" onClick={() => setModalOpen(true)}>
                  <PackagePlus aria-hidden="true" className="mr-2" size={16} />
                  Add first batch
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-sm font-semibold text-emerald-800 underline underline-offset-4"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-212.5 border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                      <th scope="col" className="px-5 py-3">
                        Product / lot
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Quantity
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Location
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Expiry
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBatches.map((batch) => {
                      const days = daysUntil(batch.expiryDate, today);
                      const bucket = getExpiryBucket(days);
                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900">
                              {batch.productName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {batch.productCode}{" "}
                              <span aria-hidden="true">·</span> Lot {batch.lot}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-800">
                            {batch.quantity}{" "}
                            <span className="font-normal text-slate-500">
                              {batch.unit}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin
                                aria-hidden="true"
                                size={14}
                                className="text-slate-400"
                              />
                              {batch.location}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-slate-800">
                              {formatDate(batch.expiryDate)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {expiryCopy(days)}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {renderStatus(bucket, days)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-200 md:hidden">
                {filteredBatches.map((batch) => {
                  const days = daysUntil(batch.expiryDate, today);
                  const bucket = getExpiryBucket(days);
                  return (
                    <li key={batch.id} className="space-y-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {batch.productName}
                          </p>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {batch.productCode} · Lot {batch.lot}
                          </p>
                        </div>
                        {renderStatus(bucket, days)}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Quantity</p>
                          <p className="mt-0.5 font-medium">
                            {batch.quantity} {batch.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Expiry</p>
                          <p className="mt-0.5 font-medium">
                            {formatDate(batch.expiryDate)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500">
                            Storage location
                          </p>
                          <p className="mt-0.5 inline-flex items-center gap-1.5 font-medium">
                            <MapPin
                              aria-hidden="true"
                              size={14}
                              className="text-slate-400"
                            />
                            {batch.location}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <MapPin aria-hidden="true" size={14} />
          {locationOptions.length} storage areas represented
        </p>
      </div>

      <BatchIntakeModal
        key={isCreateOpen ? "open" : "closed"}
        isOpen={isCreateOpen}
        products={products}
        locations={storageLocations}
        error={createError}
        isSubmitting={isSubmitting}
        onClose={closeCreateModal}
        onCreate={createBatch}
      />
    </main>
  );
}

export default BatchInventory;

