/**
 * Seeded products from UAP backend (src/db/seed.ts).
 * Used for product selection dropdowns throughout the UI.
 */
export const PRODUCTS = [
  { id: "sigops", name: "sigops", displayName: "SigOps" },
  { id: "credora-os", name: "credora-os", displayName: "Credora OS" },
  { id: "assera", name: "assera", displayName: "Assera" },
  { id: "paynex", name: "paynex", displayName: "Paynex" },
  { id: "talentra", name: "talentra", displayName: "Talentra" },
  { id: "lifetra", name: "lifetra", displayName: "Lifetra" },
];

export const DEFAULT_PRODUCT_ID = PRODUCTS[0].id;
