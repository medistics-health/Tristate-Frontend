import type { SystemSettings } from "../services/operations/users";

export type BillingPaymentMethod = "ACH" | "CREDIT_CARD";

export type ProcessingFeeSettings = {
  allocationMode?: "PERCENT";
  creditCard: {
    COMPANY: { ratePercent: number; fixedFee: number };
    CLIENT: { ratePercent: number; fixedFee: number };
  };
  ach: {
    COMPANY: { ratePercent: number; capAmount: number };
    CLIENT: { ratePercent: number; capAmount: number };
  };
};

type ProcessingFeeTotals = {
  creditCard: { ratePercent: number; fixedFee: number };
  ach: { ratePercent: number; capAmount: number };
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundToPrecision(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeAllocationPair(
  first: number,
  second: number,
  decimals = 2,
): [number, number] {
  const total = roundToPrecision(Math.max(0, first) + Math.max(0, second), 4);
  if (total <= 0) {
    return [0, 0];
  }

  const firstShare = roundToPrecision((Math.max(0, first) / total) * 100, decimals);
  return [firstShare, roundToPrecision(100 - firstShare, decimals)];
}

function buildActualSettings(
  source?: Partial<SystemSettings> | Record<string, any> | null,
) {
  return {
    creditCard: {
      COMPANY: {
        ratePercent: asNumber(
          source?.creditCard?.COMPANY?.ratePercent ??
            source?.creditCardCompanyRatePercent,
          1.4,
        ),
        fixedFee: asNumber(
          source?.creditCard?.COMPANY?.fixedFee ??
            source?.creditCardCompanyFixedFee,
          0.3,
        ),
      },
      CLIENT: {
        ratePercent: asNumber(
          source?.creditCard?.CLIENT?.ratePercent ??
            source?.creditCardClientRatePercent,
          1.5,
        ),
        fixedFee: asNumber(
          source?.creditCard?.CLIENT?.fixedFee ??
            source?.creditCardClientFixedFee,
          0,
        ),
      },
    },
    ach: {
      COMPANY: {
        ratePercent: asNumber(
          source?.ach?.COMPANY?.ratePercent ?? source?.achCompanyRatePercent,
          0.8,
        ),
        capAmount: asNumber(
          source?.ach?.COMPANY?.capAmount ?? source?.achCompanyCapAmount,
          5,
        ),
      },
      CLIENT: {
        ratePercent: asNumber(
          source?.ach?.CLIENT?.ratePercent ?? source?.achClientRatePercent,
          0,
        ),
        capAmount: asNumber(
          source?.ach?.CLIENT?.capAmount ?? source?.achClientCapAmount,
          0,
        ),
      },
    },
  };
}

export function buildGeneralSettingsTotals(
  source?: Partial<SystemSettings> | Record<string, unknown> | null,
): ProcessingFeeTotals {
  const actual = buildActualSettings(source);
  return {
    creditCard: {
      ratePercent: roundToPrecision(
        actual.creditCard.COMPANY.ratePercent +
          actual.creditCard.CLIENT.ratePercent,
        4,
      ),
      fixedFee: roundToPrecision(
        actual.creditCard.COMPANY.fixedFee + actual.creditCard.CLIENT.fixedFee,
        2,
      ),
    },
    ach: {
      ratePercent: roundToPrecision(
        actual.ach.COMPANY.ratePercent + actual.ach.CLIENT.ratePercent,
        4,
      ),
      capAmount: roundToPrecision(
        actual.ach.COMPANY.capAmount + actual.ach.CLIENT.capAmount,
        2,
      ),
    },
  };
}

export function buildPracticeDefaultProcessingFeeSettings(
  source?: Partial<SystemSettings> | Record<string, unknown> | null,
): ProcessingFeeSettings {
  const actual = buildActualSettings(source);
  const [creditRateCompany, creditRateClient] = normalizeAllocationPair(
    actual.creditCard.COMPANY.ratePercent,
    actual.creditCard.CLIENT.ratePercent,
  );
  const [creditFixedCompany, creditFixedClient] = normalizeAllocationPair(
    actual.creditCard.COMPANY.fixedFee,
    actual.creditCard.CLIENT.fixedFee,
  );
  const [achRateCompany, achRateClient] = normalizeAllocationPair(
    actual.ach.COMPANY.ratePercent,
    actual.ach.CLIENT.ratePercent,
  );
  const [achCapCompany, achCapClient] = normalizeAllocationPair(
    actual.ach.COMPANY.capAmount,
    actual.ach.CLIENT.capAmount,
  );

  return {
    allocationMode: "PERCENT",
    creditCard: {
      COMPANY: {
        ratePercent: creditRateCompany,
        fixedFee: creditFixedCompany,
      },
      CLIENT: {
        ratePercent: creditRateClient,
        fixedFee: creditFixedClient,
      },
    },
    ach: {
      COMPANY: {
        ratePercent: achRateCompany,
        capAmount: achCapCompany,
      },
      CLIENT: {
        ratePercent: achRateClient,
        capAmount: achCapClient,
      },
    },
  };
}

export function buildProcessingFeeSettings(
  source?: Partial<SystemSettings> | Record<string, any> | null,
): ProcessingFeeSettings {
  if (source?.allocationMode === "PERCENT") {
    return {
      allocationMode: "PERCENT",
      creditCard: {
        COMPANY: {
          ratePercent: asNumber(
            source?.creditCard?.COMPANY?.ratePercent,
            0,
          ),
          fixedFee: asNumber(source?.creditCard?.COMPANY?.fixedFee, 0),
        },
        CLIENT: {
          ratePercent: asNumber(source?.creditCard?.CLIENT?.ratePercent, 0),
          fixedFee: asNumber(source?.creditCard?.CLIENT?.fixedFee, 0),
        },
      },
      ach: {
        COMPANY: {
          ratePercent: asNumber(source?.ach?.COMPANY?.ratePercent, 0),
          capAmount: asNumber(source?.ach?.COMPANY?.capAmount, 0),
        },
        CLIENT: {
          ratePercent: asNumber(source?.ach?.CLIENT?.ratePercent, 0),
          capAmount: asNumber(source?.ach?.CLIENT?.capAmount, 0),
        },
      },
    };
  }

  return buildPracticeDefaultProcessingFeeSettings(source);
}

export function buildResolvedProcessingFeeSettings(
  settings: ProcessingFeeSettings,
  totalsSource?: Partial<SystemSettings> | Record<string, unknown> | null,
) {
  const totals = buildGeneralSettingsTotals(totalsSource);

  return {
    creditCard: {
      COMPANY: {
        ratePercent: roundToPrecision(
          (totals.creditCard.ratePercent *
            settings.creditCard.COMPANY.ratePercent) /
            100,
          4,
        ),
        fixedFee: roundToPrecision(
          (totals.creditCard.fixedFee * settings.creditCard.COMPANY.fixedFee) /
            100,
          2,
        ),
      },
      CLIENT: {
        ratePercent: roundToPrecision(
          (totals.creditCard.ratePercent *
            settings.creditCard.CLIENT.ratePercent) /
            100,
          4,
        ),
        fixedFee: roundToPrecision(
          (totals.creditCard.fixedFee * settings.creditCard.CLIENT.fixedFee) /
            100,
          2,
        ),
      },
    },
    ach: {
      COMPANY: {
        ratePercent: roundToPrecision(
          (totals.ach.ratePercent * settings.ach.COMPANY.ratePercent) / 100,
          4,
        ),
        capAmount: roundToPrecision(
          (totals.ach.capAmount * settings.ach.COMPANY.capAmount) / 100,
          2,
        ),
      },
      CLIENT: {
        ratePercent: roundToPrecision(
          (totals.ach.ratePercent * settings.ach.CLIENT.ratePercent) / 100,
          4,
        ),
        capAmount: roundToPrecision(
          (totals.ach.capAmount * settings.ach.CLIENT.capAmount) / 100,
          2,
        ),
      },
    },
  };
}

export function buildPracticeLabelSettings(
  settings: ProcessingFeeSettings,
  paymentMethod: BillingPaymentMethod,
  feeBearer: "COMPANY" | "CLIENT",
  totalsSource?: Partial<SystemSettings> | Record<string, unknown> | null,
) {
  const resolved = buildResolvedProcessingFeeSettings(settings, totalsSource);

  if (paymentMethod === "CREDIT_CARD") {
    return {
      primary: resolved.creditCard[feeBearer].ratePercent,
      secondary: resolved.creditCard[feeBearer].fixedFee,
    };
  }

  return {
    primary: resolved.ach[feeBearer].ratePercent,
    secondary: resolved.ach[feeBearer].capAmount,
  };
}

export function getAllocationPercent(value: number, _total?: number, decimals = 2) {
  return roundToPrecision(value, decimals);
}

export function updateFeeAllocation(
  current: ProcessingFeeSettings,
  _totalsSource: Partial<SystemSettings> | Record<string, unknown> | null,
  paymentMethod: BillingPaymentMethod,
  feeBearer: "COMPANY" | "CLIENT",
  field: "ratePercent" | "fixedFee" | "capAmount",
  value: string,
): ProcessingFeeSettings {
  const parsed = value === "" ? 0 : Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;
  const nextPercent = Math.min(100, Math.max(0, roundToPrecision(safeValue, 2)));
  const otherPercent = roundToPrecision(100 - nextPercent, 2);
  const otherFeeBearer = feeBearer === "COMPANY" ? "CLIENT" : "COMPANY";

  if (paymentMethod === "CREDIT_CARD") {
    return {
      ...current,
      allocationMode: "PERCENT",
      creditCard: {
        ...current.creditCard,
        [feeBearer]: {
          ...current.creditCard[feeBearer],
          [field]: nextPercent,
        },
        [otherFeeBearer]: {
          ...current.creditCard[otherFeeBearer],
          [field]: otherPercent,
        },
      },
    };
  }

  return {
    ...current,
    allocationMode: "PERCENT",
    ach: {
      ...current.ach,
      [feeBearer]: {
        ...current.ach[feeBearer],
        [field]: nextPercent,
      },
      [otherFeeBearer]: {
        ...current.ach[otherFeeBearer],
        [field]: otherPercent,
      },
    },
  };
}

export function getProcessingFeeValidationError(
  current: ProcessingFeeSettings,
  _totalsSource: Partial<SystemSettings> | Record<string, unknown> | null,
  paymentMethod: BillingPaymentMethod | "",
) {
  if (!paymentMethod) {
    return null;
  }

  if (paymentMethod === "CREDIT_CARD") {
    const rateTotal = roundToPrecision(
      current.creditCard.COMPANY.ratePercent +
        current.creditCard.CLIENT.ratePercent,
      2,
    );
    const fixedTotal = roundToPrecision(
      current.creditCard.COMPANY.fixedFee + current.creditCard.CLIENT.fixedFee,
      2,
    );

    if (rateTotal !== 100) {
      return "Credit Card rate allocation must total 100%.";
    }
    if (fixedTotal !== 100) {
      return "Credit Card fixed fee allocation must total 100%.";
    }
    return null;
  }

  const rateTotal = roundToPrecision(
    current.ach.COMPANY.ratePercent + current.ach.CLIENT.ratePercent,
    2,
  );
  const capTotal = roundToPrecision(
    current.ach.COMPANY.capAmount + current.ach.CLIENT.capAmount,
    2,
  );

  if (rateTotal !== 100) {
    return "ACH rate allocation must total 100%.";
  }
  if (capTotal !== 100) {
    return "ACH cap allocation must total 100%.";
  }
  return null;
}
