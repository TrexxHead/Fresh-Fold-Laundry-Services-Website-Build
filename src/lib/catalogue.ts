import type { CatalogueItem, CustomerCategory, LoadSize } from "./models";

export const PRICE_VERSION = 1;
export const PRICE_EFFECTIVE_FROM = "2026-10-12";

export const LOAD_PRICES: Record<CustomerCategory, Record<LoadSize, number>> = {
  STUDENT: { 6: 850, 9: 1200, 12: 1550 },
  NON_STUDENT: { 6: 1300, 9: 1750, 12: 2250 }
};

export const CATALOGUE: CatalogueItem[] = [
  { id: "iron-shirt", name: "Shirt or blouse", shortName: "Shirt / blouse", category: "IRONING", pricingType: "PER_ITEM", amountJmd: 250, unitLabel: "item", note: "Fixed per-item ironing estimate.", active: true, public: true, needsReview: false, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "iron-trousers", name: "Trousers or pants", shortName: "Trousers / pants", category: "IRONING", pricingType: "PER_ITEM", amountJmd: 250, unitLabel: "item", note: "Fixed per-item ironing estimate.", active: true, public: true, needsReview: false, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "iron-tshirt", name: "T-shirt or polo", shortName: "T-shirt / polo", category: "IRONING", pricingType: "PER_ITEM", amountJmd: 200, unitLabel: "item", note: "Fixed per-item ironing estimate.", active: true, public: true, needsReview: false, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "iron-dress", name: "Dress or gown", shortName: "Dress / gown", category: "IRONING", pricingType: "STARTING_AT", amountJmd: 350, unitLabel: "item", note: "Starting price; garment inspection may change it.", active: true, public: true, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "care-special", name: "Special-care clothing", shortName: "Special-care clothing", category: "SPECIAL_CARE", pricingType: "QUOTE_REQUIRED", amountJmd: null, note: "Listed source amount is +J$250, but the charging unit is unresolved. Staff quote required.", active: true, public: true, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "care-comforter-queen", name: "Queen, Twin XL or Double comforter", shortName: "Medium comforter", category: "SPECIAL_CARE", pricingType: "QUOTE_REQUIRED", amountJmd: null, note: "Source lists +J$800; full price versus surcharge is unresolved.", active: true, public: true, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "care-comforter-king", name: "King comforter", shortName: "King comforter", category: "SPECIAL_CARE", pricingType: "QUOTE_REQUIRED", amountJmd: null, note: "Source lists +J$1,200; full price versus surcharge is unresolved.", active: true, public: true, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "care-rug", name: "Large rug or mat", shortName: "Large rug / mat", category: "SPECIAL_CARE", pricingType: "QUOTE_REQUIRED", amountJmd: null, note: "Source lists +J$1,250; full price versus surcharge is unresolved.", active: true, public: true, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "care-handwash-clothes", name: "Hand-wash clothing", shortName: "Hand-wash clothing", category: "SPECIAL_CARE", pricingType: "PER_BUNDLE", amountJmd: 900, unitLabel: "bundle of 4", note: "J$900 per four items. Other quantities require staff review.", active: true, public: true, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "care-handwash-bag", name: "Hand-wash bag", shortName: "Hand-wash bag", category: "SPECIAL_CARE", pricingType: "QUOTE_REQUIRED", amountJmd: null, note: "Source lists +J$800; whether this is per bag is unresolved.", active: true, public: true, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "product-bag", name: "FreshFold laundry bag", shortName: "Laundry bag", category: "PRODUCT", pricingType: "FIXED", amountJmd: 600, unitLabel: "bag", note: "Optional one-time product.", active: true, public: true, needsReview: false, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "product-hanger", name: "Hanger", shortName: "Hanger", category: "PRODUCT", pricingType: "QUOTE_REQUIRED", amountJmd: null, note: "Source lists +J$50; whether this is per hanger is unresolved.", active: true, public: true, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "care-delicate", name: "Delicate / gentle wash", shortName: "Delicate wash", category: "SPECIAL_CARE", pricingType: "QUOTE_REQUIRED", amountJmd: null, note: "Price not supplied; collect as a request.", active: true, public: true, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 },
  { id: "future-express", name: "Express service", shortName: "Express", category: "FUTURE", pricingType: "SURCHARGE", amountJmd: 350, unitLabel: "load", note: "Disabled: owner says urgent service is not currently offered.", active: false, public: false, needsReview: true, effectiveFrom: PRICE_EFFECTIVE_FROM, version: 1 }
];

export const IRONING_ITEMS = CATALOGUE.filter((item) => item.category === "IRONING" && item.active);
export const BOOKABLE_ADDONS = CATALOGUE.filter((item) => ["SPECIAL_CARE", "PRODUCT"].includes(item.category) && item.active && item.public);

export const SUBSCRIPTION_SEEDS = [
  { id: "student-weekly", name: "Student Weekly Fresh Plan", historicalAmountJmd: 4800, audience: "Student", status: "ENQUIRY_ONLY" as const },
  { id: "student-exam", name: "Student Exam Relief Plan", historicalAmountJmd: 5000, audience: "Student", status: "ENQUIRY_ONLY" as const },
  { id: "nonstudent-weekly", name: "Weekly Fresh Plan", historicalAmountJmd: 6800, audience: "Non-student", status: "ENQUIRY_ONLY" as const },
  { id: "nonstudent-relief", name: "Relief Plan", historicalAmountJmd: 7000, audience: "Non-student", status: "ENQUIRY_ONLY" as const }
];

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", enabled: true },
  { value: "BANK_TRANSFER", label: "Bank transfer", enabled: true },
  { value: "CARD_MACHINE", label: "Card machine", enabled: true },
  { value: "ONLINE_GATEWAY", label: "Online payment", enabled: false }
] as const;
