export type VehicleModel = {
  name: string;
  variants?: string[];
  variantLabel?: string;
};

export const VEHICLE_MODELS: VehicleModel[] = [
  { name: "RE Diesel" },
  { name: "Maxima Z Diesel" },
  { name: "Maxima WB Diesel" },
  { name: "RE LPG" },
  { name: "Cargo Diesel" },
  { name: "RE CNG" },
  { name: "Maxima Z (CNG)", variants: ["G.Yellow", "E.Green"], variantLabel: "Colour" },
  { name: "Maxima WB (CNG)", variants: ["G.Yellow", "E.Green"], variantLabel: "Colour" },
  { name: "Cargo CNG", variants: ["G.Yellow", "E.Green"], variantLabel: "Colour" },
  { name: "Wego", variants: ["P5009", "P5012", "P7012", "P9018", "C9012"], variantLabel: "Model" },
];

/**
 * Build a flat list of every model+variant combination.
 * Used by the stock grid to enumerate all possible rows.
 */
export function getAllStockRows(): { modelName: string; modelVariant: string | null }[] {
  const rows: { modelName: string; modelVariant: string | null }[] = [];
  for (const model of VEHICLE_MODELS) {
    if (model.variants && model.variants.length > 0) {
      for (const variant of model.variants) {
        rows.push({ modelName: model.name, modelVariant: variant });
      }
    } else {
      rows.push({ modelName: model.name, modelVariant: null });
    }
  }
  return rows;
}

/**
 * Build a consolidated list of rows for the pricing configurations.
 * Models with color-based variants (variantLabel === "Colour") are clubbed into a single row,
 * since their colors share the same price. Other variants (like Wego model codes) remain separate.
 */
export function getPricingConfigRows(): { modelName: string; modelVariant: string | null }[] {
  const rows: { modelName: string; modelVariant: string | null }[] = [];
  for (const model of VEHICLE_MODELS) {
    if (model.variants && model.variants.length > 0 && model.variantLabel !== "Colour") {
      for (const variant of model.variants) {
        rows.push({ modelName: model.name, modelVariant: variant });
      }
    } else {
      rows.push({ modelName: model.name, modelVariant: null });
    }
  }
  return rows;
}

/**
 * Format a model name + variant into a display string.
 */
export function formatModelDisplay(modelName: string, modelVariant?: string | null): string {
  if (modelVariant) {
    return `${modelName} — ${modelVariant}`;
  }
  return modelName;
}
