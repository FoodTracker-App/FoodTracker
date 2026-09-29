import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError, batchApi } from "../api/client";
import type { Batch } from "../types/inventory";
import Button from "../components/UI/Button";

export default function DashboardPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const notice = location.state?.notice as string | undefined;

  useEffect(() => {
    batchApi.list()
      .then(setBatches)
      .catch((reason: unknown) => {
        setError(reason instanceof ApiError ? reason.message : "Could not load inventory.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto mt-10 max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inventory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Current batch balances and expiration dates.
            </p>
          </div>
          <Link to="/batches">
            <Button>Receive a batch</Button>
          </Link>
        </div>

        {notice && (
          <p role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}

        {isLoading ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading inventory...
          </p>
        ) : !error && batches.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-600">No batches have been received yet.</p>
            <Link className="mt-4 inline-block" to="/batches">
              <Button variant="secondary">Receive the first batch</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Lot</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Quantity</th>
                  <th className="px-5 py-3 font-semibold">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{batch.product?.name || "Unknown product"}</div>
                      <div className="text-xs text-slate-500">{batch.product?.product_code}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{batch.manufacturer_lot || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{batch.location?.name || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {batch.quantity} {batch.product?.stock_unit}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{batch.expiry_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
