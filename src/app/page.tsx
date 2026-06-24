import InventoryBrowser, { type InventoryCar } from "./InventoryBrowser";
import localInventory from "@/data/inventory.json";

const sheetCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOR5zDBqzJ-dUC-aa7EWkz2uAIx0ULVfs32lQZ8OdeKDZrocc9fFkKI7rJl5b_eMMLzAGdrM9BQAex/pub?gid=883902162&single=true&output=csv";

const fallbackCars = localInventory as InventoryCar[];

const parseCsv = (csv: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

const normalizeModel = (value: string) =>
  value
    .replace(/sr\+/gi, "RWD")
    .replace(/\bhighland\b/gi, "Highland")
    .replace(/long range/gi, "Long Range")
    .replace(/\bawd\b/gi, "AWD")
    .replace(/\brwd\b/gi, "RWD")
    .replace(/\s+/g, " ")
    .trim();

const hasPrice = (value: string) => /\d/.test(value);

const imageByCar = new Map(
  fallbackCars.map((car) => [
    `${normalizeKey(car.Codename)}|${normalizeKey(car.Model)}|${normalizeKey(car.KM)}`,
    {
      Image: car.Image,
      SourceUrl: car.SourceUrl,
    },
  ]),
);

async function getCars() {
  try {
    const response = await fetch(sheetCsvUrl, {
      next: { revalidate: 300 },
    });

    if (!response.ok) throw new Error("Sheet not available");

    const rows = parseCsv(await response.text()).filter((row) =>
      row.some((cell) => cell.trim()),
    );
    const headers = rows[0].map((header) => header.trim());

    return rows
      .slice(1)
      .map((row) =>
        Object.fromEntries(
          headers.map((header, index) => [header, row[index]?.trim() ?? ""]),
        ),
      )
      .map((car) => {
        const model = normalizeModel(String(car.Model ?? ""));
        const mappedImage = imageByCar.get(
          `${normalizeKey(String(car.Codename ?? ""))}|${normalizeKey(model)}|${normalizeKey(String(car.KM ?? ""))}`,
        );

        return {
          Codename: String(car.Codename ?? ""),
          Model: model,
          Date: String(car.Date ?? ""),
          KM: String(car.KM ?? ""),
          Color: String(car.Color ?? ""),
          PRICE: String(car.PRICE ?? ""),
          BTW: String(car.BTW ?? ""),
          Status: String(car.Status ?? ""),
          EXTRAS: String(car.EXTRAS ?? ""),
          Image: mappedImage?.Image,
          SourceUrl: mappedImage?.SourceUrl,
        };
      })
      .filter((car) => car.Model && hasPrice(car.PRICE));
  } catch {
    return fallbackCars.filter((car) => car.Model && hasPrice(car.PRICE));
  }
}

export default async function Home() {
  const cars = await getCars();

  return <InventoryBrowser cars={cars} />;
}
