import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICING_RULES,
  PricingValidationError,
  calculatePricing,
  computeBreakEven,
  monthlyDelta,
  quote,
  residualValueForLine,
  resolvePricingRules,
  roundToStep,
  withLine,
  type PricingParams,
  type PricingRules,
  type QuoteInput,
  type QuoteLineInput,
} from "@/lib/pricing";

const euros = (value: number) => Math.round(value * 100);

/** Rules without reserves so the spec examples can be verified exactly. */
const plainRules: PricingRules = {
  ...DEFAULT_PRICING_RULES,
  riskReservePercent: 0,
  maintenanceReservePercent: 0,
  residualCreditPercent: 0,
  roundMonthlyTo: 100,
  roundUpfrontTo: 100,
};

function params(overrides: Partial<PricingParams> = {}): PricingParams {
  return {
    equipmentCost: euros(4000),
    installationCost: 0,
    servicesCost: 0,
    contractMonths: 24,
    upfront: { mode: "amount", value: euros(1200) },
    targetMultiplier: 1.8,
    supportMonthlyCost: 0,
    supportMonthlyPrice: 0,
    riskReservePercent: 0,
    maintenanceReservePercent: 0,
    residualValue: 0,
    residualCreditPercent: 0,
    discount: { mode: "percent", value: 0 },
    vatRate: 0.23,
    vatInclusiveRounding: false,
    monthlyOverride: null,
    targetMargin: null,
    minMarginPercent: 0.35,
    roundMonthlyTo: 100,
    roundUpfrontTo: 100,
    ...overrides,
  };
}

const PTZ_STANDARD = euros(990);
const PTZ_NDI = euros(1600);

function camera(quantity: number, unitCost = PTZ_STANDARD): QuoteLineInput {
  return { key: "camera", quantity, unitCost, costKind: "equipment", residualPercent: 0.15, expectedLifeMonths: 60 };
}

/** Kit from the visual test: 2× PTZ, controller, Stream Deck, PC, infra, installation. */
function broadcastKit(overrides: Partial<QuoteInput> = {}): QuoteInput {
  return {
    lines: [
      camera(2),
      { key: "controller", quantity: 1, unitCost: euros(590), costKind: "equipment", residualPercent: 0.15, expectedLifeMonths: 60 },
      { key: "streamdeck", quantity: 1, unitCost: euros(210), costKind: "equipment", residualPercent: 0.1, expectedLifeMonths: 48 },
      { key: "pc", quantity: 1, unitCost: euros(890), costKind: "equipment", residualPercent: 0.1, expectedLifeMonths: 48 },
      { key: "switch", quantity: 1, unitCost: euros(140), costKind: "equipment", residualPercent: 0.1, expectedLifeMonths: 60 },
      { key: "install", quantity: 1, unitCost: euros(350), costKind: "installation", residualPercent: null, expectedLifeMonths: null },
      { key: "training", quantity: 1, unitCost: euros(180), costKind: "service", residualPercent: null, expectedLifeMonths: null },
    ],
    contractMonths: 24,
    upfront: { mode: "percent", value: 0.3 },
    discount: { mode: "percent", value: 0 },
    support: null,
    monthlyOverride: null,
    targetMargin: null,
    vatInclusiveRounding: false,
    rules: DEFAULT_PRICING_RULES,
    ...overrides,
  };
}

describe("calculatePricing — spec example", () => {
  it("€4.000 cost × 1.8 = €7.200; €1.200 upfront + 24 × €250", () => {
    const result = calculatePricing(params());
    expect(result.totalInternalCost).toBe(euros(4000));
    expect(result.targetRevenue).toBe(euros(7200));
    expect(result.initialPayment).toBe(euros(1200));
    expect(result.monthlyPayment).toBe(euros(250));
    expect(result.totalContractRevenue).toBe(euros(7200));
    expect(result.grossProfit).toBe(euros(3200));
    expect(result.grossMargin).toBeCloseTo(3200 / 7200, 6);
    expect(result.markup).toBeCloseTo(0.8, 6);
    expect(result.marginStatus).toBe("healthy");
  });

  it("computes the break-even month from cash flows", () => {
    // Outlay €4.000, entrada €1.200 → deficit €2.800 / €250 = 11.2 → month 12
    expect(calculatePricing(params()).breakEvenMonth).toBe(12);
  });
});

describe("quantity changes", () => {
  it("adding a third camera increases every value", () => {
    const two = quote(broadcastKit()).result;
    const three = quote(broadcastKit({ lines: broadcastKit().lines.map((l) => (l.key === "camera" ? camera(3) : l)) })).result;

    expect(three.totalInternalCost).toBeGreaterThan(two.totalInternalCost);
    expect(three.equipmentCost - two.equipmentCost).toBe(PTZ_STANDARD);
    expect(three.initialPayment).toBeGreaterThan(two.initialPayment);
    expect(three.monthlyPayment).toBeGreaterThan(two.monthlyPayment);
    expect(three.residualAssetValue).toBeGreaterThan(two.residualAssetValue);
  });

  it("quantity zero removes the line's cost", () => {
    const zero = quote(broadcastKit({ lines: [camera(0)] })).result;
    expect(zero.totalInternalCost).toBe(0);
    expect(zero.monthlyPayment).toBe(0);
    expect(zero.initialPayment).toBe(0);
  });

  it("rejects negative quantities", () => {
    expect(() => quote(broadcastKit({ lines: [camera(-1)] }))).toThrow(PricingValidationError);
  });

  it("reports the marginal monthly impact per line", () => {
    const { result, lineImpacts } = quote(broadcastKit());
    expect(lineImpacts.camera).toBeGreaterThan(0);
    // All line impacts add up to the whole system price share paid monthly
    const sum = Object.values(lineImpacts).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(result.monthlyPaymentExact, 0);
  });
});

describe("camera swap PTZ Standard → PTZ NDI", () => {
  it("recalculates cost, revenue, upfront, monthly, margin and break-even", () => {
    const standard = quote(broadcastKit()).result;
    const ndiInput = withLine(broadcastKit(), camera(2, PTZ_NDI));
    const ndi = quote(ndiInput).result;

    expect(ndi.equipmentCost - standard.equipmentCost).toBe(2 * (PTZ_NDI - PTZ_STANDARD));
    expect(ndi.targetRevenue).toBeGreaterThan(standard.targetRevenue);
    expect(ndi.initialPayment).toBeGreaterThan(standard.initialPayment);
    expect(ndi.monthlyPayment).toBeGreaterThan(standard.monthlyPayment);
    expect(ndi.grossProfit).toBeGreaterThan(standard.grossProfit);
    expect(ndi.breakEvenMonth).not.toBeNull();
  });

  it("exposes the commercial difference between variants without exposing cost", () => {
    const base = broadcastKit();
    const delta = monthlyDelta(base, withLine(base, camera(2, PTZ_NDI)));
    // (2 × €610 × 1.8 + reserves) × 70% / 24 ≈ €68.8/month
    expect(delta / 100).toBeGreaterThan(60);
    expect(delta / 100).toBeLessThan(75);
  });
});

describe("upfront (entrada) changes", () => {
  it("a larger upfront reduces the monthly payment", () => {
    const low = quote(broadcastKit({ upfront: { mode: "percent", value: 0.2 } })).result;
    const high = quote(broadcastKit({ upfront: { mode: "percent", value: 0.5 } })).result;
    expect(high.initialPayment).toBeGreaterThan(low.initialPayment);
    expect(high.monthlyPayment).toBeLessThan(low.monthlyPayment);
  });

  it("rounds the upfront to the configured step", () => {
    const result = quote(broadcastKit()).result;
    expect(result.initialPayment % DEFAULT_PRICING_RULES.roundUpfrontTo).toBe(0);
  });

  it("clamps a fixed upfront larger than the system price", () => {
    const result = calculatePricing(params({ upfront: { mode: "amount", value: euros(99999) } }));
    expect(result.initialPayment).toBe(result.systemPrice);
    expect(result.monthlyPayment).toBe(0);
    expect(result.warnings).toContain("UPFRONT_CLAMPED");
  });

  it("never returns negative payments", () => {
    const result = calculatePricing(params({ upfront: { mode: "percent", value: 1 } }));
    expect(result.initialPayment).toBeGreaterThanOrEqual(0);
    expect(result.monthlyPayment).toBeGreaterThanOrEqual(0);
  });
});

describe("contract term changes", () => {
  it("24 → 36 months lowers the monthly payment", () => {
    const m24 = quote(broadcastKit({ contractMonths: 24 })).result;
    const m36 = quote(broadcastKit({ contractMonths: 36 })).result;
    expect(m36.monthlyPayment).toBeLessThan(m24.monthlyPayment);
    expect(m36.contractMonths).toBe(36);
  });

  it("longer terms accrue more maintenance reserve and depreciate residual value", () => {
    const m24 = quote(broadcastKit({ contractMonths: 24 })).result;
    const m48 = quote(broadcastKit({ contractMonths: 48 })).result;
    expect(m48.maintenanceReserve).toBeGreaterThan(m24.maintenanceReserve);
    expect(m48.residualAssetValue).toBeLessThan(m24.residualAssetValue);
  });

  it("rejects a zero-month contract", () => {
    expect(() => calculatePricing(params({ contractMonths: 0 }))).toThrow(PricingValidationError);
  });
});

describe("discount", () => {
  it("percent discount reduces the system price and payments", () => {
    const full = calculatePricing(params());
    const discounted = calculatePricing(params({ discount: { mode: "percent", value: 0.1 } }));
    expect(discounted.discountAmount).toBe(euros(720));
    expect(discounted.systemPrice).toBe(euros(6480));
    expect(discounted.monthlyPayment).toBeLessThan(full.monthlyPayment);
    expect(discounted.grossProfit).toBeLessThan(full.grossProfit);
  });

  it("fixed discount never exceeds the list price", () => {
    const result = calculatePricing(params({ discount: { mode: "amount", value: euros(50000) } }));
    expect(result.discountAmount).toBe(result.systemListPrice);
    expect(result.systemPrice).toBe(0);
  });
});

describe("residual value", () => {
  it("depreciates linearly and never goes below the floor", () => {
    const line = camera(1);
    expect(residualValueForLine(line, 24, plainRules)).toBe(Math.round(PTZ_STANDARD * 0.6));
    expect(residualValueForLine(line, 60, plainRules)).toBe(Math.round(PTZ_STANDARD * 0.15));
  });

  it("only applies to equipment", () => {
    const service: QuoteLineInput = { key: "s", quantity: 1, unitCost: euros(500), costKind: "service", residualPercent: 0.5, expectedLifeMonths: null };
    expect(residualValueForLine(service, 24, plainRules)).toBe(0);
  });

  it("residual credit lowers the price when enabled", () => {
    const kept = calculatePricing(params({ residualValue: euros(1000), residualCreditPercent: 0 }));
    const credited = calculatePricing(params({ residualValue: euros(1000), residualCreditPercent: 0.5 }));
    expect(credited.systemListPrice).toBe(kept.systemListPrice - euros(500));
    expect(kept.economicProfit).toBe(kept.grossProfit + euros(1000));
  });
});

describe("VAT", () => {
  it("computes VAT-inclusive values from net", () => {
    const result = calculatePricing(params());
    expect(result.monthlyPaymentGross).toBe(euros(307.5));
    expect(result.initialPaymentGross).toBe(euros(1476));
  });

  it("VAT-inclusive rounding produces round gross prices", () => {
    const result = calculatePricing(params({ vatInclusiveRounding: true, upfront: { mode: "percent", value: 0.3 } }));
    expect(result.monthlyPaymentGross % 100).toBe(0);
    expect(result.initialPaymentGross % 100).toBe(0);
  });

  it("profit metrics are always computed on net values", () => {
    const a = calculatePricing(params({ vatRate: 0 }));
    const b = calculatePricing(params({ vatRate: 0.23 }));
    expect(a.grossProfit).toBe(b.grossProfit);
  });
});

describe("minimum margin", () => {
  it("flags a manual monthly override below the minimum margin", () => {
    const result = calculatePricing(params({ monthlyOverride: euros(160) }));
    // Revenue = 1.200 + 24 × 160 = 5.040; margin = 1.040 / 5.040 ≈ 20.6%
    expect(result.monthlyPayment).toBe(euros(160));
    expect(result.grossMargin).toBeCloseTo(1040 / 5040, 6);
    expect(result.marginStatus).toBe("below-minimum");
    expect(result.warnings).toContain("MARGIN_BELOW_MINIMUM");
    expect(result.warnings).toContain("MONTHLY_OVERRIDE_ACTIVE");
  });

  it("flags a loss when revenue does not cover cost", () => {
    const result = calculatePricing(params({ monthlyOverride: euros(50) }));
    expect(result.marginStatus).toBe("loss");
    expect(result.breakEvenMonth).toBeNull();
  });

  it("target margin derives the list price", () => {
    const result = calculatePricing(params({ targetMargin: 0.4, upfront: { mode: "percent", value: 0 } }));
    // 4.000 / (1 − 0.4) = 6.666,67 → monthly rounded up keeps margin ≥ 40%
    expect(result.grossMargin).toBeGreaterThanOrEqual(0.4);
    expect(result.grossMargin).toBeLessThan(0.41);
  });
});

describe("support plans and reserves", () => {
  it("support is billed monthly and never included in the upfront", () => {
    const without = calculatePricing(params());
    const withSupport = calculatePricing(params({ supportMonthlyCost: euros(15), supportMonthlyPrice: euros(29) }));
    expect(withSupport.initialPayment).toBe(without.initialPayment);
    expect(withSupport.monthlyPayment - without.monthlyPayment).toBe(euros(29));
    expect(withSupport.supportCostTotal).toBe(euros(15 * 24));
  });

  it("reserves are added to cost and passed through to price", () => {
    const result = calculatePricing(params({ riskReservePercent: 0.02, maintenanceReservePercent: 0.015 }));
    expect(result.riskReserve).toBe(euros(80));
    expect(result.maintenanceReserve).toBe(euros(120));
    expect(result.totalInternalCost).toBe(euros(4200));
    expect(result.systemListPrice).toBe(euros(7400));
  });
});

describe("validation", () => {
  it.each([
    ["negative cost", { equipmentCost: -1 }],
    ["zero multiplier", { targetMultiplier: 0 }],
    ["upfront above 100%", { upfront: { mode: "percent", value: 1.5 } as const }],
    ["negative override", { monthlyOverride: -100 }],
    ["fractional months", { contractMonths: 12.5 }],
  ])("rejects %s", (_label, override) => {
    expect(() => calculatePricing(params(override as Partial<PricingParams>))).toThrow(PricingValidationError);
  });
});

describe("helpers", () => {
  it("roundToStep", () => {
    expect(roundToStep(25_001, 100, "up")).toBe(25_100);
    expect(roundToStep(25_000, 100, "up")).toBe(25_000);
    expect(roundToStep(21_549, 1000)).toBe(22_000);
    expect(roundToStep(21_449, 1000)).toBe(21_000);
  });

  it("computeBreakEven returns 0 when the upfront covers the outlay", () => {
    expect(computeBreakEven({ upfrontOutlay: 100, monthlyOutflow: 0, initialPayment: 200, monthlyPayment: 10, months: 12 })).toBe(0);
  });

  it("resolvePricingRules applies plan overrides and ignores nulls", () => {
    const rules = resolvePricingRules({ targetMultiplier: 1.8, vatRate: 0.23 }, { targetMultiplier: 2, vatRate: null });
    expect(rules.targetMultiplier).toBe(2);
    expect(rules.vatRate).toBe(0.23);
  });
});
