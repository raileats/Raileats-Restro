import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const siteUrl = "https://www.raileats.in";
const pagePath = "/popular-restaurants-train-journey";
const pageUrl = `${siteUrl}${pagePath}`;

type Restaurant = {
  RestroCode: string;
  RestroName: string;
  StationCode: string;
  StationName: string;
  RestroDisplayPhoto: string;
  RaileatsStatus: string | number | boolean | null;
  RestroRating?: string | number | null;
  MinimumOrderValue?: string | number | null;
};

const getEnv = () => ({
  PROJECT_URL:
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_PROJECT_URL,
  SERVICE_KEY:
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY,
});

const isRaileatsActive = (value: unknown) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "active";
};

function normalizeImageUrl(value: unknown, projectUrl: string) {
  const image = String(value ?? "").trim();

  if (!image) return "/raileats-logo.png";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${projectUrl.replace(
    /\/$/,
    ""
  )}/storage/v1/object/public/restro/${image.replace(/^\/+/, "")}`;
}

function getStationLabel(restro: Restaurant) {
  if (restro.StationCode && restro.StationName) {
    return `${restro.StationCode} - ${restro.StationName}`;
  }

  return restro.StationName || restro.StationCode || "Railway station";
}

async function getActiveRestaurants(): Promise<Restaurant[]> {
  const { PROJECT_URL, SERVICE_KEY } = getEnv();

  if (!PROJECT_URL || !SERVICE_KEY) return [];

  const select = encodeURIComponent(
    [
      "RestroCode",
      "RestroName",
      "StationCode",
      "StationName",
      "RestroDisplayPhoto",
      "RaileatsStatus",
      "RestroRating",
      "MinimumOrderValue",
    ].join(",")
  );

  const apiUrl = `${PROJECT_URL.replace(
    /\/$/,
    ""
  )}/rest/v1/RestroMaster?select=${select}&RaileatsStatus=eq.1&limit=60`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const rows = await response.json();

    return (Array.isArray(rows) ? rows : [])
      .filter((restro) => isRaileatsActive(restro.RaileatsStatus))
      .filter((restro) => restro.RestroCode && restro.RestroName)
      .map((restro) => ({
        RestroCode: String(restro.RestroCode ?? ""),
        RestroName: String(restro.RestroName ?? ""),
        StationCode: String(restro.StationCode ?? ""),
        StationName: String(restro.StationName ?? ""),
        RestroDisplayPhoto: normalizeImageUrl(
          restro.RestroDisplayPhoto,
          PROJECT_URL
        ),
        RaileatsStatus: restro.RaileatsStatus,
        RestroRating: restro.RestroRating ?? null,
        MinimumOrderValue: restro.MinimumOrderValue ?? null,
      }));
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title:
    "Popular Restaurants for Train Journey | Food Delivery in Train | RailEats",
  description:
    "Explore active RailEats restaurants for food delivery in train journeys. Find restaurant partners, stations, ratings and fresh meals online.",
  alternates: {
    canonical: pagePath,
  },
  openGraph: {
    type: "website",
    url: pageUrl,
    siteName: "RailEats",
    title:
      "Popular Restaurants for Train Journey | Food Delivery in Train | RailEats",
    description:
      "Find active RailEats restaurant partners for train food delivery at railway stations across India.",
    images: [
      {
        url: "/raileats-logo.png",
        width: 512,
        height: 512,
        alt: "RailEats popular restaurants for train food delivery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Popular Restaurants for Train Journey | RailEats",
    description:
      "Discover active RailEats restaurants offering food delivery in train journeys.",
    images: ["/raileats-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default async function PopularRestaurantsTrainJourneyPage() {
  const restaurants = await getActiveRestaurants();
  const stationCount = new Set(
    restaurants.map((restro) => restro.StationCode || restro.StationName)
  ).size;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Popular Restaurants for Train Journey",
        item: pageUrl,
      },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Popular RailEats Restaurants for Train Journey",
    itemListElement: restaurants.map((restro, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Restaurant",
        "@id": `${pageUrl}#restaurant-${restro.RestroCode}`,
        name: restro.RestroName,
        image: restro.RestroDisplayPhoto,
        servesCuisine: "Train food delivery",
        priceRange: restro.MinimumOrderValue
          ? `Minimum order Rs ${restro.MinimumOrderValue}`
          : undefined,
        aggregateRating: restro.RestroRating
          ? {
              "@type": "AggregateRating",
              ratingValue: String(restro.RestroRating),
              bestRating: "5",
            }
          : undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: restro.StationName || restro.StationCode,
          addressCountry: "IN",
        },
      },
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does RailEats choose popular restaurants for train journeys?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RailEats shows restaurants that are currently active in the RailEats restaurant database and available for train food delivery workflows.",
        },
      },
      {
        "@type": "Question",
        name: "Can I order food from these restaurants during my train journey?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, passengers can search by PNR, train number or station on RailEats and order from restaurants available for the selected journey and station.",
        },
      },
      {
        "@type": "Question",
        name: "Are restaurant details updated automatically?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Restaurant names, station details, images and availability come from RailEats database records, so updates reflect automatically when restaurant data changes.",
        },
      },
    ],
  };

  return (
    <main className="customer-app-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="container-app py-6 sm:py-10">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500"
        >
          <Link href="/" className="hover:text-orange-600">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-800">Popular Restaurants</span>
        </nav>

        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">
            RailEats restaurant partners
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            Popular Restaurants for Train Journey
          </h1>
          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">
            RailEats connects passengers with active restaurant partners for
            food delivery in train. This page lists restaurants currently
            enabled for RailEats ordering, along with their railway station
            details, images and useful ordering information. Search your PNR,
            train number or station on the homepage to find restaurants available
            for your exact journey timing.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-orange-50 p-4">
              <div className="text-2xl font-black text-orange-600">
                {restaurants.length}
              </div>
              <p className="text-sm font-bold text-slate-700">
                Active RailEats restaurants
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="text-2xl font-black text-emerald-600">
                {stationCount}
              </div>
              <p className="text-sm font-bold text-slate-700">
                Railway stations covered
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-4">
              <div className="text-2xl font-black text-slate-950">PNR</div>
              <p className="text-sm font-bold text-slate-700">
                Search journey before ordering
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition active:scale-95"
            >
              Search Food
            </Link>
            <Link
              href="/stations"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 transition active:scale-95"
            >
              View Stations
            </Link>
          </div>
        </header>
      </section>

      <section className="container-app pb-8" aria-labelledby="restaurant-list-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-orange-600">
              Active restaurants
            </p>
            <h2
              id="restaurant-list-title"
              className="text-2xl font-black text-slate-950"
            >
              Food delivery restaurants in train
            </h2>
          </div>
          <Link href="/" className="text-sm font-black text-orange-600">
            Order now
          </Link>
        </div>

        {restaurants.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restro) => (
              <article
                key={restro.RestroCode}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <img
                  src={restro.RestroDisplayPhoto}
                  alt={`${restro.RestroName} food delivery in train at ${getStationLabel(
                    restro
                  )}`}
                  title={`${restro.RestroName} on RailEats`}
                  width={640}
                  height={360}
                  loading="lazy"
                  decoding="async"
                  className="h-44 w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black leading-snug text-slate-950">
                      {restro.RestroName}
                    </h3>
                    {restro.RestroRating ? (
                      <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
                        {restro.RestroRating} ★
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm font-bold text-slate-600">
                    {getStationLabel(restro)}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                      RailEats active
                    </span>
                    {restro.MinimumOrderValue ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        Min Rs {restro.MinimumOrderValue}
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Restaurants are being updated
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Please search your PNR, train number or station to check currently
              available restaurants for your journey.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white"
            >
              Search Food
            </Link>
          </div>
        )}
      </section>

      <section className="container-app pb-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-2xl font-black text-slate-950">
            How to order from RailEats restaurants
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <strong className="text-sm font-black text-slate-950">
                1. Search journey
              </strong>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Enter PNR, train number or station on RailEats to check route
                and delivery station options.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <strong className="text-sm font-black text-slate-950">
                2. Choose restaurant
              </strong>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Select an available RailEats restaurant based on your train
                timing and station.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <strong className="text-sm font-black text-slate-950">
                3. Get delivery
              </strong>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Place your order and receive food at the selected delivery
                station where service is available.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
