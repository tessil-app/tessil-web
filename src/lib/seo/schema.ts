// Structured data about Tessil itself, shared by every page that describes it,
// so search engines and AI answers read one consistent set of facts.

import { SITE_URL } from "$lib/config/site";
import { PLANS } from "$lib/config/plans";

export const ORG_ID = `${SITE_URL}/#organization`;
export const APP_ID = `${SITE_URL}/#app`;

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Tessil",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    sameAs: ["https://github.com/tessil-app"],
  };
}

/** The product, with every plan as an offer. `features` is in the page's language. */
export function applicationNode(features: string[], description?: string) {
  return {
    "@type": "WebApplication",
    "@id": APP_ID,
    name: "Tessil",
    url: SITE_URL,
    ...(description ? { description } : {}),
    applicationCategory: "SecurityApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript and modern browser APIs",
    isAccessibleForFree: true,
    license: "https://www.gnu.org/licenses/agpl-3.0.html",
    publisher: { "@id": ORG_ID },
    featureList: features,
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: String(plan.price?.monthly ?? 0),
      priceCurrency: "EUR",
      ...(plan.price
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: String(plan.price.monthly),
              priceCurrency: "EUR",
              unitCode: "MON",
            },
          }
        : {}),
      url: `${SITE_URL}/pricing`,
    })),
  };
}
