import InventoryBrowser, { type InventoryCar } from "./InventoryBrowser";
import localInventory from "@/data/inventory.json";

const sheetCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7exQlwHvimGqlYpggDpvTrIpp07J411U2XJ0WZZg3Asu1A7lJoqgz8ZoA1hWi3yggO59F9CpUUion/pub?single=true&output=csv";
const listingsBaseUrl =
  "https://mmxbv.nl/enkele-vermeldingspaginas/?type-aanbod=voorraad&sorteer-op=nieuwste";

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

const decodeHtml = (value = "") =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeModel = (value: string) =>
  value
    .replace(/^Tesla\s+/i, "")
    .replace(/sr\+/gi, "RWD")
    .replace(/\bhighland\b/gi, "Highland")
    .replace(/long range/gi, "Long Range")
    .replace(/\bawd\b/gi, "AWD")
    .replace(/\brwd\b/gi, "RWD")
    .replace(/\s+/g, " ")
    .trim();

const hasPrice = (value: string) => /\d/.test(value);
const digitsOnly = (value = "") => value.replace(/[^\d]/g, "");

const getModelType = (model = "") => {
  const normalized = model.toLowerCase();

  if (normalized.includes("model 3")) return "Model 3";
  if (normalized.includes("model y")) return "Model Y";
  if (normalized.includes("model s")) return "Model S";
  if (normalized.includes("model x")) return "Model X";
  return "";
};

const getModel3ColorImage = (color = "") => {
  const normalized = color.toLowerCase();

  if (normalized.includes("cherry")) {
    return "/inventory-images/model-3-cherry-red.jpeg";
  }
  if (normalized.includes("red")) return "/inventory-images/model-3-red.jpeg";
  if (normalized.includes("blue")) return "/inventory-images/model-3-blue.jpeg";
  if (normalized.includes("black")) return "/inventory-images/model-3-black.jpeg";
  if (normalized.includes("grey") || normalized.includes("gray") || normalized.includes("silver")) {
    return "/inventory-images/model-3-grey.jpeg";
  }
  if (normalized.includes("white")) return "/inventory-images/model-3-white.jpeg";

  return undefined;
};

const pickImage = (html = "") => {
  const srcset = html.match(/(?:data-srcset|srcset)="([^"]+)"/)?.[1] ?? "";
  const src = html.match(/(?:data-src|src)="([^"]+)"/)?.[1] ?? "";
  const bestFromSet = srcset
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0])
    .find((url) => url.includes("-768x768"));

  return bestFromSet || (src.startsWith("data:") ? "" : src);
};

type Listing = {
  href: string;
  image: string;
  km: string;
  modelType: string;
  price: string;
  title: string;
};

async function getListings() {
  try {
    const pages = await Promise.all(
      [1, 2, 3, 4].map(async (page) => {
        const response = await fetch(`${listingsBaseUrl}&bladzijde=${page}`, {
          next: { revalidate: 300 },
        });

        if (!response.ok) return "";

        return response.text();
      }),
    );

    const listings = pages.flatMap((html) =>
      [
        ...html.matchAll(
          /<div class="vehica-car-row[\s\S]*?(?=<div class="vehica-car-row|<nav|<\/main>)/gi,
        ),
      ].map((match) => {
        const cardHtml = match[0];
        const text = decodeHtml(cardHtml);
        const href =
          cardHtml.match(/href="([^"]*\/enkele-vermeldingspagina\/[^"]+)"/i)?.[1] ??
          "";
        const title = decodeHtml(
          cardHtml.match(/class="vehica-car-card-row__name"[\s\S]*?>([\s\S]*?)<\/span>/i)?.[1] ??
            cardHtml.match(/alt="([^"]*Tesla Model[^"]+)"/i)?.[1] ??
            "",
        );

        return {
          href,
          image: pickImage(cardHtml),
          km: digitsOnly(text.match(/\b[\d,.]+km\b/i)?.[0] ?? ""),
          modelType: getModelType(title),
          price: digitsOnly(text.match(/(?:€|â‚¬)\s?[\d,.]+/)?.[0] ?? ""),
          title,
        };
      }),
    );

    return listings.filter(
      (listing) => listing.href && listing.image && listing.modelType && listing.price && listing.km,
    );
  } catch {
    return [];
  }
}

const findListing = (car: InventoryCar, listings: Listing[]) => {
  const modelType = getModelType(car.Model);
  const price = digitsOnly(car.PRICE);
  const km = digitsOnly(car.KM);

  return listings.find(
    (listing) =>
      listing.modelType === modelType &&
      listing.price === price &&
      listing.km === km,
  );
};

async function getCars() {
  try {
    const [response, listings] = await Promise.all([
      fetch(sheetCsvUrl, {
        next: { revalidate: 300 },
      }),
      getListings(),
    ]);

    if (!response.ok) throw new Error("Sheet not available");

    const rows = parseCsv(await response.text()).filter((row) =>
      row.some((cell) => cell.trim()),
    );
    const headers = rows[0].map((header) => header.trim());

    const cars = rows
      .slice(1)
      .map((row) =>
        Object.fromEntries(
          headers.map((header, index) => [header, row[index]?.trim() ?? ""]),
        ),
      )
      .map((car) => {
        const model = normalizeModel(String(car.Model ?? ""));

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
        };
      })
      .filter((car) => car.Model && hasPrice(car.PRICE));

    return Promise.all(
      cars.map(async (car) => {
        const localModel3Image =
          getModelType(car.Model) === "Model 3" ? getModel3ColorImage(car.Color) : undefined;
        const listing = await findListing(car, listings);

        return {
          ...car,
          Image: localModel3Image ?? listing?.image,
          SourceUrl: listing?.href,
        };
      }),
    );
  } catch {
    return fallbackCars.filter((car) => car.Model && hasPrice(car.PRICE));
  }
}

export default async function Home() {
  const cars = await getCars();

  return <InventoryBrowser cars={cars} />;
}
