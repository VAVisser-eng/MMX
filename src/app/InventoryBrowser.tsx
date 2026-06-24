"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export type InventoryCar = {
  Codename: string;
  Model: string;
  Date: string;
  KM: string;
  Color: string;
  PRICE: string;
  BTW: string;
  Status: string;
  EXTRAS: string;
  Image?: string;
  SourceUrl?: string;
};

const typeOptions = [
  { id: "3", label: "3", title: "Model 3" },
  { id: "Y", label: "Y", title: "Model Y" },
  { id: "S", label: "S", title: "Model S" },
  { id: "X", label: "X", title: "Model X" },
];

const getType = (model: string) => {
  if (model.startsWith("Model 3")) return "3";
  if (model.startsWith("Model Y")) return "Y";
  if (model.startsWith("Model S")) return "S";
  if (model.startsWith("Model X")) return "X";
  return "";
};

const colorClass = (color: string) => {
  const value = color.toLowerCase();

  if (value.includes("white")) return "from-white via-zinc-100 to-zinc-300";
  if (value.includes("blue")) return "from-sky-900 via-blue-700 to-slate-950";
  if (value.includes("red") || value.includes("cherry")) {
    return "from-red-950 via-red-700 to-orange-950";
  }
  if (value.includes("grey") || value.includes("gray") || value.includes("silver")) {
    return "from-zinc-500 via-zinc-300 to-slate-700";
  }

  return "from-zinc-950 via-zinc-800 to-black";
};

const formatPrice = (price: string) => {
  const value = Number(price.replace(/[^\d]/g, ""));
  if (!value) return "Price on request";

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatKm = (km: string) => {
  const value = Number(km.replace(/[^\d]/g, ""));
  if (!value) return km;

  return `${new Intl.NumberFormat("nl-NL").format(value)} km`;
};

const translateStatus = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized === "available for test drive") return "Beschikbaar voor proefrit";
  if (normalized === "coming within one week") return "Komt binnen een week";
  if (normalized === "coming within two weeks") return "Komt binnen twee weken";
  if (normalized === "coming soon") return "Binnenkort verwacht";
  if (normalized === "reserved") return "Gereserveerd";
  if (normalized === "sold") return "Verkocht";

  return status;
};

function CarVisual({ car }: { car: InventoryCar }) {
  const isLargeBody = car.Model.includes("Model Y") || car.Model.includes("Model X");
  const carColor = colorClass(car.Color);

  return (
    <div className="relative h-52 overflow-hidden bg-[linear-gradient(135deg,#171717,#030303_58%,#2d1300)]">
      {car.Image ? (
        <Image
          src={car.Image}
          alt={car.Model}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      ) : (
        <>
          <div className="absolute bottom-8 left-1/2 w-[84%] -translate-x-1/2">
            <div
              className={`mx-auto ${
                isLargeBody ? "h-24 rounded-[48%_52%_34%_38%]" : "h-20 rounded-[60%_58%_36%_36%]"
              } bg-gradient-to-r ${carColor} shadow-2xl shadow-orange-500/20`}
            />
            <div className="absolute bottom-[-12px] left-[17%] size-12 rounded-full border-[11px] border-black bg-zinc-600" />
            <div className="absolute bottom-[-12px] right-[17%] size-12 rounded-full border-[11px] border-black bg-zinc-600" />
            <div
              className={`absolute ${
                isLargeBody ? "bottom-12 left-[30%] h-14 w-[38%]" : "bottom-10 left-[31%] h-12 w-[36%]"
              } skew-x-[-16deg] rounded-t-lg border border-black/30 bg-black/25`}
            />
          </div>
          <div className="absolute bottom-7 left-5 right-5 h-px bg-orange-500" />
        </>
      )}
      <div className="absolute left-4 top-4 rounded-sm bg-blue-700 px-3 py-2 text-xs font-black text-white">
        {translateStatus(car.Status) || "Voorraad"}
      </div>
    </div>
  );
}

export default function InventoryBrowser({ cars }: { cars: InventoryCar[] }) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const availableModels = useMemo(() => {
    if (!selectedType) return [];

    return Array.from(
      new Set(
        cars
          .filter((car) => getType(car.Model) === selectedType)
          .map((car) => car.Model),
      ),
    ).sort();
  }, [cars, selectedType]);

  const visibleCars = useMemo(() => {
    if (!selectedModel) return [];

    return cars.filter((car) => car.Model === selectedModel);
  }, [cars, selectedModel]);

  const selectedTypeTitle = typeOptions.find((type) => type.id === selectedType)?.title;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_70%_10%,rgba(255,111,0,0.20),transparent_32%),linear-gradient(135deg,#000_0%,#080808_52%,#160b02_100%)]">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a href="#" className="flex items-center gap-3" aria-label="MMX home">
            <span className="grid size-10 place-items-center rounded-sm border border-orange-500/60 bg-white text-xl font-black text-black">
              M
            </span>
            <span className="text-2xl font-black tracking-[0.2em]">
              MM<span className="text-orange-500">X</span>
            </span>
          </a>
          <a
            href="#voorraad"
            className="rounded-sm bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-white"
          >
            Bekijk voorraad
          </a>
        </nav>

        <div className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 lg:px-10">
          <p className="mb-5 text-sm font-black uppercase tracking-[0.32em] text-orange-500">
            Tweedehands Tesla specialist
          </p>
          <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            Kies sneller de Tesla die bij je past.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl">
            De voorraad komt uit de gepubliceerde MMX sheet. Kies type,
            model en bekijk direct de bijpassende auto&apos;s.
          </p>
        </div>
      </section>

      <section id="voorraad" className="bg-[#050505] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-500">
                Te Koop
              </p>
              <h2 className="mt-3 text-4xl font-black sm:text-5xl">
                {selectedModel || selectedTypeTitle || "Kies type"}
              </h2>
            </div>
            <p className="max-w-xl text-zinc-400">
              Regels met een ingevulde prijs verschijnen automatisch in dit overzicht.
              Zonder prijs blijven ze verborgen.
            </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-3">
            {selectedType ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedType(null);
                  setSelectedModel(null);
                }}
                className="rounded-sm border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:border-orange-500 hover:text-orange-400"
              >
                Terug naar 3 / Y / S / X
              </button>
            ) : null}
            {selectedModel ? (
              <button
                type="button"
                onClick={() => setSelectedModel(null)}
                className="rounded-sm border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:border-orange-500 hover:text-orange-400"
              >
                Terug naar modellen
              </button>
            ) : null}
          </div>

          {!selectedType ? (
            <div className="grid gap-4 sm:grid-cols-4">
              {typeOptions.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setSelectedType(type.id);
                    setSelectedModel(null);
                  }}
                  className="rounded-sm border border-white/10 bg-black px-6 py-10 text-left transition hover:border-orange-500 hover:bg-zinc-950"
                >
                  <span className="block text-7xl font-black text-orange-500">
                    {type.label}
                  </span>
                  <span className="mt-4 block text-xl font-black text-white">
                    {type.title}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedType && !selectedModel ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {availableModels.map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => setSelectedModel(model)}
                  className="rounded-sm border border-white/10 bg-black px-5 py-5 text-left text-lg font-black text-white transition hover:border-orange-500 hover:text-orange-400"
                >
                  {model}
                  <span className="mt-2 block text-sm font-semibold text-zinc-500">
                    {cars.filter((car) => car.Model === model).length} auto&apos;s
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedModel ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {visibleCars.map((car) => (
                <article
                  key={`${car.Codename}-${car.KM}`}
                  className="overflow-hidden rounded-sm border border-white/15 bg-black"
                >
                  <CarVisual car={car} />
                  <div className="p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-2xl font-black text-white">{car.Model}</h3>
                      <strong className="text-3xl font-black text-orange-500">
                        {formatPrice(car.PRICE)}
                      </strong>
                    </div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
                      {car.Codename || "MMX voorraad"}
                    </p>
                    <div className="mt-5 grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
                      <div className="border border-white/10 bg-zinc-950 p-3">
                        <span className="block text-orange-500">Date</span>
                        <strong className="text-orange-500">{car.Date}</strong>
                      </div>
                      <div className="border border-white/10 bg-zinc-950 p-3">
                        <span className="block text-orange-500">KM</span>
                        <strong className="text-orange-500">{formatKm(car.KM)}</strong>
                      </div>
                      <div className="border border-white/10 bg-zinc-950 p-3">
                        <span className="block text-orange-500">Color</span>
                        <strong className="text-orange-500">{car.Color}</strong>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <span className="text-sm font-black uppercase tracking-[0.18em] text-orange-500">
                        Extras
                      </span>
                      <p className="mt-2 min-h-12 text-orange-500">
                        {car.EXTRAS || "Geen extra&apos;s vermeld"}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Status</span>
                      <strong className="text-white">{translateStatus(car.Status)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
