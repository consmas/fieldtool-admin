"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchFuelPrices } from "@/lib/api/fuel_prices";

export default function FuelPricesPage() {
  const { data: prices = [], isLoading, isError } = useQuery({
    queryKey: ["fuel_prices"],
    queryFn: fetchFuelPrices,
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Fuel Prices</p>
          <h2 className="text-lg font-semibold md:text-xl">Reference Table</h2>
        </div>
        <Link
          href="/fuel-prices/new"
          className="w-full rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground sm:w-auto"
        >
          Add Fuel Price
        </Link>
      </div>

      {isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">Loading...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load fuel prices.
        </div>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {prices.map((price) => (
              <div key={price.id} className="ops-card p-3">
                <p className="text-xs text-muted-foreground">Price / Liter</p>
                <p className="text-base font-semibold text-foreground">{price.price_per_liter}</p>
                <p className="mt-2 text-xs text-muted-foreground">Effective At</p>
                <p className="text-sm text-foreground">{price.effective_at}</p>
                <Link
                  href={`/fuel-prices/${price.id}/edit`}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-xs"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>

          <div className="ops-card hidden p-4 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-2">Price / Liter</th>
                    <th className="py-2">Effective At</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price) => (
                    <tr key={price.id} className="border-t border-border">
                      <td className="py-3">{price.price_per_liter}</td>
                      <td className="py-3 text-muted-foreground">{price.effective_at}</td>
                      <td className="py-3">
                        <Link
                          href={`/fuel-prices/${price.id}/edit`}
                          className="rounded-lg border border-border px-3 py-1 text-xs"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
