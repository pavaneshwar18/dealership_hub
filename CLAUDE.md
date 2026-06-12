# Dealership Hub Developer Notes

## ⚠️ CRITICAL DEPLOYMENT STEP
When pushing these changes to your production environment, you **MUST** run the database migration and pricing consolidation script to align production data:

```bash
npx tsx scratch/rename-db-models.ts
```

This script will:
- Rename existing model names to append "Diesel" (excluding Wego) in the `VehicleStock`, `SaleReport`, and `VehiclePriceConfig` tables.
- Consolidate color variant pricing configurations (e.g. `G.Yellow`, `E.Green` of `Maxima Z (CNG)`) to the base empty-variant model configuration so that no pricing data is lost.

## Standard Commands
- Run local dev server: `npm run dev`
- Run local DB setup: `npm run db:setup`
- Build production check: `npm run build`
