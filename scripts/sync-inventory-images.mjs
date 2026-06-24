import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const inventoryPath = path.join(root, "src", "data", "inventory.json");
const imageDir = path.join(root, "public", "inventory-images");
const listingsBase =
  "https://mmxbv.nl/enkele-vermeldingspaginas/?type-aanbod=voorraad&sorteer-op=nieuwste";

const decode = (value = "") =>
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

const normalizeModel = (value = "") =>
  decode(value)
    .replace(/SR\+/gi, "RWD")
    .replace(/HIGHLAND/g, "Highland")
    .replace(/Long range/g, "Long Range")
    .replace(/\s+/g, " ")
    .trim();

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const priceDigits = (value = "") => value.replace(/[^\d]/g, "");
const kmDigits = (value = "") => value.replace(/[^\d]/g, "");
const yearFromDate = (date = "") => {
  const match = date.match(/\d{4}/);
  return match ? match[0] : "";
};

const pickImage = (imgHtml = "") => {
  const srcset = imgHtml.match(/(?:data-srcset|srcset)="([^"]+)"/)?.[1] ?? "";
  const src = imgHtml.match(/src="([^"]+)"/)?.[1] ?? "";
  const bestFromSet = srcset
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0])
    .find((url) => url.includes("-768x768"));

  return bestFromSet || (src.startsWith("data:") ? "" : src);
};

const parseListings = async () => {
  const listings = [];

  for (let page = 1; page <= 4; page += 1) {
    const url = `${listingsBase}&bladzijde=${page}`;
    const html = await (await fetch(url)).text();
    const cardMatches = [...html.matchAll(/<div class="vehica-car-row[\s\S]*?(?=<div class="vehica-car-row|<nav|<\/main>)/gi)];

    for (const match of cardMatches) {
      const cardHtml = match[0];
      const href = cardHtml.match(/href="([^"]*\/enkele-vermeldingspagina\/[^"]+)"/i)?.[1] ?? "";
      const text = decode(cardHtml);

      if (!href || !text.includes("Tesla Model")) continue;

      const image = pickImage(cardHtml);
      const title = decode(
        cardHtml.match(/class="vehica-car-card-row__name"[\s\S]*?>([\s\S]*?)<\/span>/i)?.[1] ??
          cardHtml.match(/alt="([^"]*Tesla Model[^"]+)"/i)?.[1] ??
          "",
      );
      const price = text.match(/€\s?[\d,.]+/)?.[0] ?? "";
      const year = text.match(/\b20\d{2}\b/)?.[0] ?? "";
      const km = text.match(/\b[\d,.]+km\b/i)?.[0] ?? "";

      listings.push({
        href,
        image,
        km: kmDigits(km),
        model: normalizeModel(title),
        price: priceDigits(price),
        title,
        year,
      });
    }
  }

  const unique = new Map();
  for (const listing of listings) {
    if (listing.image && !unique.has(listing.href)) unique.set(listing.href, listing);
  }

  return [...unique.values()];
};

const findMatch = (car, listings) => {
  const model = normalizeModel(car.Model);
  const price = priceDigits(car.PRICE);
  const km = kmDigits(car.KM);
  const year = yearFromDate(car.Date);

  return (
    listings.find(
      (listing) =>
        listing.price === price &&
        listing.km === km &&
        listing.year === year &&
        listing.model.includes(model.replace("Model 3 RWD", "Model 3")),
    ) ??
    listings.find(
      (listing) =>
        listing.price === price &&
        listing.km === km &&
        listing.model.includes(model.replace("Model 3 RWD", "Model 3")),
    ) ??
    listings.find((listing) => listing.price === price && listing.km === km)
  );
};

await fs.mkdir(imageDir, { recursive: true });

const inventory = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
const listings = await parseListings();
let matched = 0;

for (const car of inventory) {
  const listing = findMatch(car, listings);

  if (!listing) continue;

  const ext = listing.image.includes(".png")
    ? ".png"
    : listing.image.includes(".jpg")
      ? ".jpg"
      : ".jpeg";
  const fileName = `${slug(`${car.Codename}-${car.Model}`)}${ext}`;
  const outputPath = path.join(imageDir, fileName);
  const response = await fetch(listing.image);

  if (!response.ok) continue;

  await fs.writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  car.Image = `/inventory-images/${fileName}`;
  car.SourceUrl = listing.href;
  matched += 1;
}

await fs.writeFile(inventoryPath, JSON.stringify(inventory, null, 2));

console.log(`Matched ${matched} of ${inventory.length} cars.`);
