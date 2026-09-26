"use client";

import { useCallback } from "react";
import { formatMoney, formatPercent } from "@/lib/formatters";
import type { PricingResult } from "@/lib/pricing";
import { useConfigurator, useConfiguratorData } from "./configurator-context";

/** Commercial figures only — what the client is allowed to see. */
export interface CommercialTotals {
  initialPayment: number;
  monthlyPayment: number;
  contractMonths: number;
  discountAmount: number;
  vatIncluded: boolean;
  vatRate: number;
}

export function toCommercialTotals(result: PricingResult, vatIncluded: boolean): CommercialTotals {
  return {
    initialPayment: vatIncluded ? result.initialPaymentGross : result.initialPayment,
    monthlyPayment: vatIncluded ? result.monthlyPaymentGross : result.monthlyPayment,
    contractMonths: result.contractMonths,
    discountAmount: vatIncluded ? Math.round(result.discountAmount * (1 + result.vatRate)) : result.discountAmount,
    vatIncluded,
    vatRate: result.vatRate,
  };
}

export function useMoney() {
  const { locale } = useConfiguratorData();
  return useCallback((cents: number, decimals: "auto" | 0 | 2 = "auto") => formatMoney(cents, { locale, decimals }), [locale]);
}

export function usePercent() {
  const { locale } = useConfiguratorData();
  return useCallback((fraction: number, decimals = 1) => formatPercent(fraction, decimals, locale), [locale]);
}

/** Converts a net monthly impact (unrounded cents) into a display amount (VAT aware, whole euros). */
export function useImpactFormatter() {
  const money = useMoney();
  const vatIncluded = useConfigurator((s) => s.config.pricesIncludeVat);
  return useCallback(
    (netCents: number, vatRate: number) => {
      const value = vatIncluded ? netCents * (1 + vatRate) : netCents;
      const euros = Math.max(value > 0 ? 1 : 0, Math.round(value / 100));
      return money(euros * 100, 0);
    },
    [money, vatIncluded],
  );
}
