// The settings pages (/dashboard/settings/*). See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  seoTitle: "Settings - Tessil",
  loading: "Loading…",
  title: "Settings",
  back: "Transfers",
  email: "Email",
  plan: "Plan",
  memberSince: "Member since",
  sections: "Settings sections",
  nav: { account: "Account", security: "Security", vault: "Vault", access: "Access keys", usage: "Usage" },
  tiers: { free: "Free", pro: "Pro", max: "Max" } as Record<string, string>,

  account: {
    dataTitle: "Your data",
    dataBody:
      "Export everything we have on you as JSON: your account, transfers, and recent sign-in activity. File contents aren't included: we never had them.",
    preparing: "Preparing export",
    export: "Export",
    retry: "Retry",
    exportFailed: "Couldn't export your data.",
    dangerTitle: "Danger zone",
    dangerBody: "Permanently delete your account and all transfers. This can't be undone.",
    deleteAccount: "Delete account",
    typeToConfirm: (email: string) => `Type ${email} to confirm`,
    cancel: "Cancel",
    deleting: "Deleting",
    permanently: "Permanently delete",
    deleteFailed: "Couldn't delete your account.",
  },

  language: {
    body: "For the pages after you sign in, on every device. Parts not yet translated stay in English.",
    failed: "Couldn't save the language. Try again.",
    saved: "Saved.",
  },

  planRow: {
    title: "Plan",
    given: (plan: string) => `${plan}. Given to your account. Nothing is billed.`,
    free: "Free. A plan adds portals: links where other people send you files.",
    pastDue: (plan: string) => `${plan}. The last payment did not go through. Update your card to keep it.`,
    ends: (plan: string, date: string) => `${plan}. Ends on ${date} and does not renew.`,
    renews: (plan: string, date: string) =>
      `${plan}. Renews on ${date}. Changing plan, updating your card and cancelling happen at Polar, our payment provider.`,
    upgradeTo: (plan: string) => `Upgrade to ${plan}`,
    downgradeTo: (plan: string) => `Downgrade to ${plan}`,
    manage: "Manage plan",
    seePlans: "See plans",
    upgrade: "Upgrade",
    waiting: "Payment received. Switching your plan on.",
    active: (plan: string) => `You are on ${plan}. Thank you.`,
    createPortal: "Create a portal",
    slow:
      "Your payment went through, but the plan is not switched on here yet. This can take a minute: reload the page. If it stays like this, write to",
    openFailed: "Couldn't open your plan settings. Try again in a moment.",
  },
};

const nl: typeof en = {
  seoTitle: "Instellingen - Tessil",
  loading: "Laden…",
  title: "Instellingen",
  back: "Transfers",
  email: "E-mailadres",
  plan: "Abonnement",
  memberSince: "Lid sinds",
  sections: "Onderdelen van de instellingen",
  nav: { account: "Account", security: "Beveiliging", vault: "Kluis", access: "Toegangssleutels", usage: "Gebruik" },
  tiers: { free: "Gratis", pro: "Pro", max: "Max" },

  account: {
    dataTitle: "Je gegevens",
    dataBody:
      "Exporteer alles wat we over je hebben als JSON: je account, je transfers en je recente inlogactiviteit. De inhoud van bestanden zit er niet bij: die hadden we nooit.",
    preparing: "Export voorbereiden",
    export: "Exporteren",
    retry: "Opnieuw",
    exportFailed: "Je gegevens konden niet worden geëxporteerd.",
    dangerTitle: "Account verwijderen",
    dangerBody: "Verwijder je account en al je transfers voorgoed. Dit kan niet ongedaan worden gemaakt.",
    deleteAccount: "Account verwijderen",
    typeToConfirm: (email: string) => `Typ ${email} om te bevestigen`,
    cancel: "Annuleren",
    deleting: "Verwijderen",
    permanently: "Voorgoed verwijderen",
    deleteFailed: "Je account kon niet worden verwijderd.",
  },

  language: {
    body: "Voor de pagina's na het inloggen, op elk apparaat. Wat nog niet vertaald is, blijft Engels.",
    failed: "De taal kon niet worden opgeslagen. Probeer het opnieuw.",
    saved: "Opgeslagen.",
  },

  planRow: {
    title: "Abonnement",
    given: (plan: string) => `${plan}. Aan je account gegeven. Er wordt niets gefactureerd.`,
    free: "Gratis. Een abonnement voegt portalen toe: links waarmee anderen jou bestanden sturen.",
    pastDue: (plan: string) => `${plan}. De laatste betaling is niet gelukt. Werk je kaart bij om het te houden.`,
    ends: (plan: string, date: string) => `${plan}. Eindigt op ${date} en wordt niet verlengd.`,
    renews: (plan: string, date: string) =>
      `${plan}. Wordt verlengd op ${date}. Van abonnement wisselen, je kaart bijwerken en opzeggen gaat via Polar, onze betaalprovider.`,
    upgradeTo: (plan: string) => `Overstappen naar ${plan}`,
    downgradeTo: (plan: string) => `Terug naar ${plan}`,
    manage: "Abonnement beheren",
    seePlans: "Bekijk abonnementen",
    upgrade: "Upgraden",
    waiting: "Betaling ontvangen. Je abonnement wordt aangezet.",
    active: (plan: string) => `Je hebt nu ${plan}. Dank je wel.`,
    createPortal: "Maak een portaal",
    slow:
      "Je betaling is gelukt, maar het abonnement staat hier nog niet aan. Dat kan een minuut duren: laad de pagina opnieuw. Blijft het zo, mail dan naar",
    openFailed: "Je abonnementsinstellingen konden niet worden geopend. Probeer het zo nog eens.",
  },
};

export const settingsMessages: Record<Locale, typeof en> = { en, nl };
