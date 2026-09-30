import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  RotateCcw,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  buildDemoBatches,
  dateKey,
  daysUntil,
  expiryCopy,
  formatDate,
  getExpiryBucket,
} from "../utils/demoInventory";
import type { ExpiryBucket } from "../utils/demoInventory";

type StatusFilter = "all" | ExpiryBucket;

function isStatusFilter(value: string): value is StatusFilter {
  return (
    value === "all" ||
    value === "expired" ||
    value === "today" ||
    value === "soon" ||
    value === "later"
  );
}

const statusLabels: Record<ExpiryBucket, string> = {
  expired: "Expired",
  today: "Expires today",
  soon: "Within 3 days",
  later: "Safe / later",
};

const statusClasses: Record<ExpiryBucket, string> = {
  expired: "border-rose-200 bg-rose-50 text-rose-800",
  today: "border-amber-200 bg-amber-50 text-amber-900",
  soon: "border-orange-200 bg-orange-50 text-orange-900",
  later: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

const statusCards: Array<{
  key: ExpiryBucket;
  title: string;
  supportingText: string;
  icon: typeof AlertTriangle;
  iconClass: string;
}> = [
  {
    key: "expired",
    title: "Expired",
    supportingText: "Remove from sale",
    icon: AlertTriangle,
    iconClass: "bg-rose-100 text-rose-700",
  },
  {
    key: "today",
    title: "Today",
    supportingText: "Due before close",
    icon: CalendarDays,
    iconClass: "bg-amber-100 text-amber-800",
  },
  {
    key: "soon",
    title: "Next 3 days",
    supportingText: "Prioritize rotation",
    icon: Clock3,
    iconClass: "bg-orange-100 text-orange-800",
  },
  {
    key: "later",
    title: "Later",
    supportingText: "No immediate action",
    icon: CheckCircle2,
    iconClass: "bg-emerald-100 text-emerald-800",
  },
];

function ExpiryAlerts() {
  const today = dateKey(new Date());
  const batches = useMemo(() => buildDemoBatches(today), [today]);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const locationOptions = useMemo(
    () => [...new Set(batches.map((batch) => batch.location))].sort(),
    [batches],
  );

  const counts = useMemo(() => {
    const initial: Record<ExpiryBucket, number> = {
      expired: 0,
      today: 0,
      soon: 0,
      later: 0,
    };

    for (const batch of batches) {
      const bucket = getExpiryBucket(daysUntil(batch.expiryDate, today));
      initial[bucket] += 1;
    }

    return initial;
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
        const matchesStatus =
          statusFilter === "all" ||
          getExpiryBucket(daysUntil(batch.expiryDate, today)) === statusFilter;

        return matchesSearch && matchesLocation && matchesStatus;
      })
      .sort(
        (first, second) =>
          daysUntil(first.expiryDate, today) -
          daysUntil(second.expiryDate, today),
      );
  }, [batches, locationFilter, search, statusFilter, today]);

  const urgentCount = counts.expired + counts.today + counts.soon;
  const hasFilters =
    search.trim() !== "" || locationFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setLocationFilter("all");
    setStatusFilter("all");
  }

  function renderStatus(bucket: ExpiryBucket, days: number) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[bucket]}`}
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
        {bucket === "expired" || bucket === "today"
          ? statusLabels[bucket]
          : `${statusLabels[bucket]} · ${expiryCopy(days)}`}
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9faf9] px-4 pb-12 pt-24 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>Store operations</span>
              <span aria-hidden="true">/</span>
              <span>Freshness</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Expiry alerts
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Find the batches that need attention and keep stock moving in date
              order.
            </p>
          </div>
          <Link
            to="/batches"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:self-auto"
          >
            <span>Open batch inventory</span>
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </header>

        <div className="mb-5 flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <span className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-600">
            <CalendarDays aria-hidden="true" size={16} />
          </span>
          <p>
            <span className="font-semibold text-slate-800">
              Demo inventory.
            </span>{" "}
            Sample batch data is shown here; expiry dates are calculated from
            today.
          </p>
        </div>

        <section
          aria-label="Batch counts by expiry status"
          className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {statusCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.key}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      {card.title}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">
                      {counts[card.key]}
                    </p>
                  </div>
                  <span className={`rounded-md p-2 ${card.iconClass}`}>
                    <Icon aria-hidden="true" size={18} />
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {card.supportingText}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.42fr)]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Action window
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Expired or due within the next three days
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
                <AlertTriangle aria-hidden="true" size={16} />
                {urgentCount} {urgentCount === 1 ? "batch" : "batches"} to
                review
              </span>
            </div>
            <div
              className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100"
              aria-hidden="true"
            >
              {statusCards.map((card) => {
                const share = batches.length
                  ? (counts[card.key] / batches.length) * 100
                  : 0;
                const barClass: Record<ExpiryBucket, string> = {
                  expired: "bg-rose-500",
                  today: "bg-amber-500",
                  soon: "bg-orange-500",
                  later: "bg-emerald-600",
                };
                return (
                  <span
                    key={card.key}
                    className={barClass[card.key]}
                    style={{ width: `${share}%` }}
                  />
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
              {statusCards.map((card) => (
                <span key={card.key} className="inline-flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${card.key === "expired" ? "bg-rose-500" : card.key === "today" ? "bg-amber-500" : card.key === "soon" ? "bg-orange-500" : "bg-emerald-600"}`}
                  />
                  {card.title}:{" "}
                  <strong className="font-semibold text-slate-800">
                    {counts[card.key]}
                  </strong>
                </span>
              ))}
            </div>
          </article>

          <article className="flex flex-col justify-between rounded-lg border border-emerald-900 bg-emerald-950 p-5 text-white sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                Next step
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                Rotate stock by date
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-100">
                Check the earliest dates first, then confirm the lot and shelf
                before moving stock.
              </p>
            </div>
            <Link
              to="/batches"
              className="mt-5 inline-flex min-h-10 items-center gap-2 self-start rounded-md border border-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <MapPin aria-hidden="true" size={15} />
              Find a batch
            </Link>
          </article>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Expiry register
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
                    {filteredBatches.length}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Sorted by nearest expiry date
                </p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="inline-flex min-h-9 items-center gap-2 self-start rounded-md px-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
              >
                <RotateCcw aria-hidden="true" size={15} />
                Clear filters
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_200px]">
              <label className="relative block">
                <span className="sr-only">
                  Search product, lot, or location
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
                  placeholder="Search product, lot, or location"
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block">
                <span className="sr-only">Filter by storage location</span>
                <select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">All locations</option>
                  {locationOptions.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="sr-only">Filter by expiry status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    const nextStatus = event.target.value;
                    if (isStatusFilter(nextStatus)) setStatusFilter(nextStatus);
                  }}
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">All expiry statuses</option>
                  {statusCards.map((card) => (
                    <option key={card.key} value={card.key}>
                      {statusLabels[card.key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="px-5 py-14 text-center sm:px-8">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Search aria-hidden="true" size={19} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                No batches match those filters
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or clear the selected filters.
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-190 border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                      <th scope="col" className="px-6 py-3">
                        Product
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Batch / lot
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Storage location
                      </th>
                      <th scope="col" className="px-4 py-3">
                        On hand
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Expiry date
                      </th>
                      <th scope="col" className="px-6 py-3">
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
                            {renderStatus(bucket, days)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {filteredBatches.map((batch) => {
                  const days = daysUntil(batch.expiryDate, today);
                  const bucket = getExpiryBucket(days);
                  return (
                    <li key={batch.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {batch.productName}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-slate-500">
                            {batch.productCode} · {batch.lot}
                          </p>
                        </div>
                        {renderStatus(bucket, days)}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div>
                          <p className="text-slate-500">Location</p>
                          <p className="mt-0.5 font-medium text-slate-800">
                            {batch.location}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">On hand</p>
                          <p className="mt-0.5 font-medium tabular-nums text-slate-800">
                            {batch.quantity} {batch.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expiry date</p>
                          <p className="mt-0.5 font-medium text-slate-800">
                            {formatDate(batch.expiryDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Time remaining</p>
                          <p className="mt-0.5 font-medium text-slate-800">
                            {expiryCopy(days)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              {filteredBatches.length} of {batches.length} batches shown
            </span>
            <span>Statuses are based on calendar days from today.</span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ExpiryAlerts;
