import { CATALOGUE, LOAD_PRICES, PRICE_VERSION } from "./catalogue";
import type { Estimate, EstimateInput, EstimateLine, QuantitySelection } from "./models";

export function formatJmd(amount: number): string {
  return `J$${new Intl.NumberFormat("en-JM", { maximumFractionDigits: 0 }).format(amount)}`;
}

function itemLines(selections: QuantitySelection[]): EstimateLine[] {
  return selections
    .filter(({ quantity }) => Number.isInteger(quantity) && quantity > 0)
    .map(({ itemId, quantity }) => {
      const item = CATALOGUE.find((entry) => entry.id === itemId);
      if (!item || !item.active || !item.public) throw new Error(`Item ${itemId} is not publicly bookable.`);
      let amountJmd: number | null = null;
      if (["FIXED", "PER_ITEM", "SURCHARGE", "STARTING_AT"].includes(item.pricingType) && item.amountJmd !== null) {
        amountJmd = item.amountJmd * quantity;
      }
      if (item.pricingType === "PER_BUNDLE" && item.amountJmd !== null && quantity % 4 === 0) {
        amountJmd = item.amountJmd * (quantity / 4);
      }
      return {
        id: item.id,
        label: item.name,
        detail: item.note,
        quantity,
        amountJmd,
        pricingType: amountJmd === null ? "QUOTE_REQUIRED" : item.pricingType,
        requiresReview: item.needsReview || amountJmd === null
      } satisfies EstimateLine;
    });
}

export function calculateEstimate(input: EstimateInput, createdAt = new Date().toISOString()): Estimate {
  const lines: EstimateLine[] = [];
  if (input.serviceType !== "IRONING") {
    if (!input.loadSize) throw new Error("A load size is required for wash services.");
    const amountJmd = LOAD_PRICES[input.customerCategory][input.loadSize];
    lines.push({
      id: `load-${input.customerCategory.toLowerCase()}-${input.loadSize}`,
      label: `${input.loadSize} lb wash, dry & fold`,
      detail: input.customerCategory === "STUDENT" ? "Student rate — provisional until staff verifies a current student ID." : "Non-student fixed-load estimate.",
      quantity: 1,
      amountJmd,
      pricingType: "FIXED",
      requiresReview: input.customerCategory === "STUDENT" && !input.studentVerified
    });
  }
  lines.push(...itemLines(input.items));
  const knownTotalJmd = lines.reduce((sum, line) => sum + (line.amountJmd ?? 0), 0);
  const hasQuoteRequired = lines.some((line) => line.amountJmd === null);
  return {
    version: PRICE_VERSION,
    currency: "JMD",
    knownTotalJmd,
    provisional: hasQuoteRequired || lines.some((line) => line.requiresReview),
    hasQuoteRequired,
    lines,
    createdAt
  };
}

export function requiresPriceApproval(original: Estimate, revisedTotalJmd: number): boolean {
  if (!Number.isInteger(revisedTotalJmd) || revisedTotalJmd < 0) throw new Error("Revised totals must be non-negative integer JMD amounts.");
  return revisedTotalJmd > original.knownTotalJmd;
}
