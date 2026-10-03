export function titleCase(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const CATEGORY_LABEL: Record<string, string> = {
  RACKET: "Rackets",
  BALL: "Balls",
  SHOES: "Shoes",
  ACCESSORY: "Accessories",
  APPAREL: "Apparel",
  SERVICE: "Services",
  FOOD: "Food",
  BEVERAGE: "Drinks",
};
