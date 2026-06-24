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

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

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

const yearFromDate = (date = "") => date.match(/\d{4}/)?.[0] ?? "";

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
  color?: string;
  href: string;
  image: string;
  km: string;
  model: string;
  price: string;
  title: string;
  year: string;
};

const colorAliases: Record<string, string[]> = {
  black: ["black", "zwart"],
  blue: ["blue", "blauw"],
  grey: ["grey", "gray", "grijs", "midnight silver", "stealth grey"],
  red: ["red", "rood", "cherry"],
  silver: ["silver", "zilver"],
  white: ["white", "wit", "pearl white"],
};

const normalizeColor = (value = "") => {
  const normalized = value.toLowerCase().trim();
  const match = Object.entries(colorAliases).find(([color, aliases]) =>
    [color, ...aliases].some((alias) => normalized.includes(alias)),
  );

  return match?.[0] ?? normalized;
};

const inferColor = (value = "") => {
  const normalized = value.toLowerCase();
  const match = Object.entries(colorAliases).find(([, aliases]) =>
    aliases.some((alias) => normalized.includes(alias)),
  );

  return match?.[0] ?? "";
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
          color: inferColor(text),
          href,
          image: pickImage(cardHtml),
          km: digitsOnly(text.match(/\b[\d,.]+km\b/i)?.[0] ?? ""),
          model: normalizeModel(title),
          price: digitsOnly(text.match(/(?:€|â‚¬)\s?[\d,.]+/)?.[0] ?? ""),
          title,
          year: text.match(/\b20\d{2}\b/)?.[0] ?? "",
        };
      }),
    );

    return listings.filter(
      (listing) => listing.href && listing.image && listing.model && listing.price,
    );
  } catch {
    return [];
  }
}

const enrichListingColor = async (listing: Listing) => {
  if (listing.color) return listing;

  try {
    const response = await fetch(listing.href, {
      next: { revalidate: 300 },
    });

    if (!response.ok) return listing;

    return {
      ...listing,
      color: inferColor(decodeHtml(await response.text())),
    };
  } catch {
    return listing;
  }
};

const findListing = async (car: InventoryCar, listings: Listing[]) => {
  const model = normalizeKey(normalizeModel(car.Model));
  const price = digitsOnly(car.PRICE);
  const km = digitsOnly(car.KM);
  const year = yearFromDate(car.Date);
  const color = normalizeColor(car.Color);

  const modelAndPrice = listings.filter(
    (listing) => normalizeKey(listing.model).includes(model) && listing.price === price,
  );

  if (!modelAndPrice.length) return undefined;

  const colorCheckedListings = await Promise.all(modelAndPrice.map(enrichListingColor));
  const matchingColorListings = color
    ? colorCheckedListings.filter((listing) => listing.color === color)
    : colorCheckedListings;

  if (!matchingColorListings.length) return undefined;

  return (
    matchingColorListings.find((listing) => listing.km === km && listing.year === year) ??
    matchingColorListings.find((listing) => listing.km === km) ??
    matchingColorListings.find((listing) => listing.year === year) ??
    matchingColorListings[0]
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
        const listing = await findListing(car, listings);

        return {
          ...car,
          Image: listing?.image,
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
