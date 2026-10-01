import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  Check,
  Clock3,
  MapPin,
  Package,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, batchApi } from "../api/client";
import type { Batch } from "../types/inventory";
import {
  dateKey,
  daysUntil,
  expiryCopy,
  formatDate,
  getExpiryBucket,
} from "../utils/inventoryDates";
import type { ExpiryBucket } from "../utils/inventoryDates";

const bucketDetails: Array<{
  key: ExpiryBucket;
  label: string;
  detail: string;
  icon: typeof AlertTriangle;
  accent: string;
  bar: string;
  iconBackground: string;
  iconColor: string;
}> = [
  {
    key: "expired",
    label: "Expired",
    detail: "Past date",
    icon: AlertTriangle,
    accent: "border-l-rose-500",
    bar: "bg-rose-500",
    iconBackground: "bg-rose-100",
    iconColor: "text-rose-500",
  },
  {
    key: "today",
    label: "Today",
    detail: "Needs action",
    icon: CalendarClock,
    accent: "border-l-amber-500",
    bar: "bg-amber-500",
    iconBackground: "bg-amber-100",
    iconColor: "text-amber-500",
  },
  {
    key: "soon",
    label: "Next 3 days",
    detail: "Plan rotation",
    icon: Clock3,
    accent: "border-l-orange-500",
    bar: "bg-orange-500",
    iconBackground: "bg-orange-100",
    iconColor: "text-orange-500",
  },
  {
    key: "later",
    label: "Later",
    detail: "In good shape",
    icon: Check,
    accent: "border-l-emerald-600",
    bar: "bg-emerald-600",
    iconBackground: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
];

const bucketStyles: Record<ExpiryBucket, string> = {
  expired: "border-rose-200 bg-rose-50 text-rose-800",
  today: "border-amber-200 bg-amber-50 text-amber-800",
  soon: "border-orange-200 bg-orange-50 text-orange-800",
  later: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

type DashboardBatch = {
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

const toDisplayBatch = (batch: Batch): DashboardBatch => ({
  id: batch.id,
  productId: batch.product_id,
  productCode: batch.product?.product_code ?? "UNKNOWN",
  productName: batch.product?.name ?? "Unknown product",
  lot: batch.manufacturer_lot ?? "—",
  quantity: batch.quantity,
  unit: batch.product?.stock_unit ?? "units",
  expiryDate: batch.expiry_date,
  location: batch.location?.name ?? "Unassigned",
});

function Dashboard() {
  const today = dateKey(new Date());
  const [batches, setBatches] = useState<DashboardBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBatches() {
      try {
        setIsLoading(true);
        const data = await batchApi.list();
        if (!active) return;
        setBatches(data.map(toDisplayBatch));
        setLoadError(null);
      } catch (error) {
        if (!active) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Failed to load inventory data.",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadBatches();

    return () => {
      active = false;
    };
  }, []);

  const bucketCounts = bucketDetails.map((bucket) => ({
    ...bucket,
    count: batches.filter(
      (batch) =>
        getExpiryBucket(daysUntil(batch.expiryDate, today)) === bucket.key,
    ).length,
  }));
  const productsCount = new Set(batches.map((batch) => batch.productId)).size;
  const locations = Array.from(new Set(batches.map((batch) => batch.location)))
    .map((name) => ({
      name,
      count: batches.filter((batch) => batch.location === name).length,
    }))
    .sort((first, second) => second.count - first.count);
  const maxLocationCount =
    locations.length > 0
      ? Math.max(...locations.map((location) => location.count))
      : 1;
  const attentionBatches = [...batches]
    .filter(
      (batch) =>
        getExpiryBucket(daysUntil(batch.expiryDate, today)) !== "later",
    )
    .sort(
      (first, second) =>
        daysUntil(first.expiryDate, today) -
        daysUntil(second.expiryDate, today),
    );
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f9faf9] px-4 pb-12 pt-24 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-base font-semibold text-slate-800">
              Loading stock overview…
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Fetching the latest batches from the backend.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#f9faf9] px-4 pb-12 pt-24 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="font-semibold">Unable to load inventory</p>
            <p className="mt-2">{loadError}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9faf9] px-4 pb-12 pt-24 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              
              <span>{dateLabel}</span>
            </div>
            <h1 className="font-semibold text-gray-800 sm:text-xl lg:text-2xl">
              Daily stock overview
            </h1>
            <p className="mt-2 max-w-2xl  text-slate-600 sm:text-base lg:text-[14px]">
              A clear view of what needs attention and what can wait.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/batches"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <Boxes aria-hidden="true" size={17} />
              View batches
            </Link>
            <Link
              to="/add"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <Package aria-hidden="true" size={17} />
              Register product
            </Link>
          </div>
        </header>

        <section
          aria-label="Expiry status summary"
          className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {bucketCounts.map((bucket) => {
            const Icon = bucket.icon;
            return (
              <article
                key={bucket.key}
                className={`rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      {bucket.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">
                      {bucket.count}
                    </p>
                  </div>
                  <span
                    className={`rounded-md ${bucket.iconBackground} ${bucket.iconColor} p-2`}
                  >
                    <Icon aria-hidden="true" size={18} />
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {bucket.detail} · batches
                </p>
              </article>
            );
          })}
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Expiry breakdown
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {batches.length} tracked batches across {productsCount}{" "}
                  products
                </p>
              </div>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                Date-based status
              </span>
            </div>

            <div
              aria-label={bucketCounts
                .map((bucket) => `${bucket.label}: ${bucket.count}`)
                .join(", ")}
              role="img"
              className="flex h-3 overflow-hidden rounded-full bg-slate-100"
            >
              {bucketCounts.map((bucket) => (
                <span
                  key={bucket.key}
                  className={bucket.bar}
                  style={{
                    width: `${batches.length ? (bucket.count / batches.length) * 100 : 0}%`,
                  }}
                />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
              {bucketCounts.map((bucket) => (
                <div key={bucket.key} className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${bucket.bar}`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{bucket.label}</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
                      {bucket.count} {bucket.count === 1 ? "batch" : "batches"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>Today</span>
              <span>Next 3 days</span>
              <span>Later than 3 days</span>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Storage locations
                </h2>
                <p className="mt-1 text-sm text-slate-500">Batches by area</p>
              </div>
              <MapPin aria-hidden="true" className="text-slate-400" size={19} />
            </div>
            <ul className="space-y-4">
              {locations.slice(0, 5).map((location) => (
                <li key={location.name}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700">
                      {location.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {location.count}{" "}
                      {location.count === 1 ? "batch" : "batches"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-700"
                      style={{
                        width: `${(location.count / maxLocationCount) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            
          </article>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  Needs attention
                </h2>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-rose-800">
                  {attentionBatches.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Expired or due within the next three days
              </p>
            </div>
            <Link
              to="/batches"
              className="inline-flex min-h-10 items-center gap-1 self-start rounded-md px-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 sm:self-auto"
            >
              Open batch inventory
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>

          {attentionBatches.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium text-slate-800">
                Nothing needs attention
              </p>
              <p className="mt-1 text-sm text-slate-500">
                No batches are expired or due soon.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                    <th scope="col" className="px-6 py-3">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Batch / lot
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Location
                    </th>
                    <th scope="col" className="px-4 py-3">
                      On hand
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Expiry
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attentionBatches.map((batch) => {
                    const days = daysUntil(batch.expiryDate, today);
                    const bucket = getExpiryBucket(days);
                    return (
                      <tr
                        key={batch.id}
                        className="align-middle hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-3.5">
                          <p className="text-sm font-semibold text-slate-800">
                            {batch.productName}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-slate-500">
                            {batch.productCode}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          {batch.lot}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">
                          {batch.location}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium tabular-nums text-slate-700">
                          {batch.quantity} {batch.unit}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">
                          {formatDate(batch.expiryDate)}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${bucketStyles[bucket]}`}
                          >
                            {bucket === "expired"
                              ? "Expired"
                              : bucket === "today"
                                ? "Today"
                                : expiryCopy(days)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        
      </div>
    </main>
  );
}

export default Dashboard;
