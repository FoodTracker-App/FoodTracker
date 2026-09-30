export type ExpiryBucket = "expired" | "today" | "soon" | "later";

export type DemoBatch = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  lot: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  location: string;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateOffsetFromToday(offset: number, today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  const dateYear = date.getUTCFullYear();
  const dateMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dateDay = String(date.getUTCDate()).padStart(2, "0");
  return `${dateYear}-${dateMonth}-${dateDay}`;
}

function calendarDayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

export function daysUntil(expiryDate: string, today: string) {
  return calendarDayNumber(expiryDate) - calendarDayNumber(today);
}

export function getExpiryBucket(days: number): ExpiryBucket {
  if (days < 0) return "expired";
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  return "later";
}

export function buildDemoBatches(
  today: string = dateKey(new Date()),
): DemoBatch[] {
  const samples: Array<
    Omit<DemoBatch, "expiryDate"> & { daysToExpiry: number }
  > = [
    {
      id: "batch-milk-a",
      productId: "milk",
      productCode: "DAI-104",
      productName: "Whole milk",
      lot: "MLK-2409-A",
      quantity: 16,
      unit: "cartons",
      daysToExpiry: -2,
      location: "Chiller A",
    },
    {
      id: "batch-yogurt-a",
      productId: "yogurt",
      productCode: "DAI-208",
      productName: "Greek yogurt",
      lot: "YG-0926-04",
      quantity: 24,
      unit: "cups",
      daysToExpiry: 0,
      location: "Chiller A",
    },
    {
      id: "batch-cheddar-a",
      productId: "cheddar",
      productCode: "DEL-032",
      productName: "Mature cheddar",
      lot: "CHD-76B",
      quantity: 14,
      unit: "blocks",
      daysToExpiry: -1,
      location: "Deli case",
    },
    {
      id: "batch-blueberry-a",
      productId: "blueberries",
      productCode: "PRD-441",
      productName: "Blueberries",
      lot: "BB-014-26",
      quantity: 8,
      unit: "punnets",
      daysToExpiry: 0,
      location: "Produce 1",
    },
    {
      id: "batch-spinach-a",
      productId: "spinach",
      productCode: "PRD-118",
      productName: "Baby spinach",
      lot: "SP-018-26",
      quantity: 6,
      unit: "bags",
      daysToExpiry: 1,
      location: "Produce 2",
    },
    {
      id: "batch-chicken-a",
      productId: "chicken",
      productCode: "MEA-220",
      productName: "Chicken thighs",
      lot: "CH-410-26",
      quantity: 11,
      unit: "kg",
      daysToExpiry: 3,
      location: "Meat case",
    },
    {
      id: "batch-juice-a",
      productId: "juice",
      productCode: "DRK-060",
      productName: "Orange juice",
      lot: "OJ-060-11",
      quantity: 12,
      unit: "bottles",
      daysToExpiry: 3,
      location: "Chiller B",
    },
    {
      id: "batch-milk-b",
      productId: "milk",
      productCode: "DAI-104",
      productName: "Whole milk",
      lot: "MLK-2409-B",
      quantity: 28,
      unit: "cartons",
      daysToExpiry: 5,
      location: "Chiller B",
    },
    {
      id: "batch-sourdough-a",
      productId: "bread",
      productCode: "BAK-017",
      productName: "Sourdough loaf",
      lot: "SD-090-26",
      quantity: 9,
      unit: "loaves",
      daysToExpiry: 4,
      location: "Bakery rack",
    },
    {
      id: "batch-eggs-a",
      productId: "eggs",
      productCode: "DAI-332",
      productName: "Free-range eggs",
      lot: "EG-331-26",
      quantity: 20,
      unit: "dozen",
      daysToExpiry: 8,
      location: "Chiller C",
    },
    {
      id: "batch-carrots-a",
      productId: "carrots",
      productCode: "PRD-004",
      productName: "Loose carrots",
      lot: "CR-004-26",
      quantity: 30,
      unit: "kg",
      daysToExpiry: 12,
      location: "Produce 2",
    },
    {
      id: "batch-peas-a",
      productId: "peas",
      productCode: "FRZ-200",
      productName: "Garden peas",
      lot: "FP-200-26",
      quantity: 17,
      unit: "bags",
      daysToExpiry: 45,
      location: "Freezer 1",
    },
  ];

  return samples.map(({ daysToExpiry, ...batch }) => ({
    ...batch,
    expiryDate: dateOffsetFromToday(daysToExpiry, today),
  }));
}

export function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function expiryCopy(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  return `In ${days}d`;
}
