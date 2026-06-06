export type VehicleModel = {
  name: string;
  variants?: string[];
  variantLabel?: string;
};

export const VEHICLE_MODELS: VehicleModel[] = [
  { name: "Compact" },
  { name: "Maxima Z" },
  { name: "Maxima WB" },
  { name: "4S LPG" },
  { name: "Cargo" },
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
 * Format a model name + variant into a display string.
 */
export function formatModelDisplay(modelName: string, modelVariant?: string | null): string {
  if (modelVariant) {
    return `${modelName} — ${modelVariant}`;
  }
  return modelName;
}
