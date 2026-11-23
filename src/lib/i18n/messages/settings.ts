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

  security: {
    passkeys: "Passkeys",
    framing: "Passkeys are tied to this site: they can't be used to sign in anywhere else. Email sign-in stays available either way.",
    unsupportedTitle: "Your browser doesn't support passkeys",
    unsupportedBody:
      "Passkeys need a recent browser with a platform authenticator (Touch ID, Face ID, Windows Hello) or a security key.",
    loading: "Loading passkeys…",
    empty:
      "Add a passkey to skip the email step next time. Passkeys are tied to this site: they can't be used to sign in anywhere else. Email sign-in stays available either way.",
    add: "Add a passkey",
    nickname: "Nickname",
    nicknameOptional: "Nickname (optional)",
    nicknameExample: "e.g. MacBook Touch ID",
    cancel: "Cancel",
    saving: "Saving",
    save: "Save",
    rename: "Rename",
    remove: "Remove",
    unlocks: "Unlocks your vault.",
    canUnlock: "Can also unlock your vault, so you don't have to type its password.",
    stop: "Stop",
    setUp: "Set this up",
    currentWarning:
      "This is the passkey for your current session. You'll stay signed in here, but you'll need to sign in by email or another passkey next time.",
    removeAsk: "Remove this passkey?",
    removing: "Removing",
    confirmRemove: "Confirm remove",
    waiting: "Waiting on your device",
    continue: "Continue",
    confirmOnDevice: "Confirm on your device to continue.",
    browserWillAsk: "Your browser will ask you to confirm with Touch ID, Face ID, Windows Hello, or a security key.",
    synced: "Synced",
    thisDevice: "This device",
    lastUsed: (date: string) => `Last used ${date}`,
    neverUsed: "Never used",
    devicesTitle: "Signed-in devices",
    devicesBody:
      "Lost a device, or signed in somewhere you no longer trust? This signs your account out everywhere, this browser included, and ends every access key a program was paired with.",
    signOutEverywhere: "Sign out everywhere",
    signOutAsk: "Sign out everywhere?",
    signOutBody:
      "Every browser and device is signed out, this one too, and every access key stops working. A program using a key, such as the tessil tool, has to be paired again. Your files, portals and vault are not touched.",
    staySignedIn: "Stay signed in",
    signingOut: "Signing out…",
    unlockTitle: "Unlock your vault with this passkey",
    unlockBody:
      "Confirm it's you once. After that, this passkey opens your vault with a touch or a glance. Every other way in keeps working.",
    errors: {
      setUp: "Couldn't set this up.",
      change: "Couldn't change that.",
      load: "Couldn't load passkeys.",
      add: "Couldn't add a passkey.",
      rename: "Couldn't rename the passkey.",
      remove: "Couldn't remove the passkey.",
      signOut: "Couldn't sign out everywhere. Nothing was changed; try again.",
    },
  },

  passkeyRow: { unnamed: "Unnamed passkey", current: "Used to sign in here" },

  proof: {
    vaultPassword: "Vault password",
    phrase: "Recovery phrase",
    phrasePlaceholder: "word word word …",
    passkeyNote: "You'll confirm with your passkey when you continue.",
    useInstead: { password: "Use your vault password instead", phrase: "Use your recovery phrase instead", passkey: "Use a passkey instead" },
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

  security: {
    passkeys: "Passkeys",
    framing: "Passkeys horen bij deze site: je kunt er nergens anders mee inloggen. Inloggen per e-mail blijft altijd mogelijk.",
    unsupportedTitle: "Je browser ondersteunt geen passkeys",
    unsupportedBody:
      "Passkeys hebben een recente browser nodig met een ingebouwde authenticator (Touch ID, Face ID, Windows Hello) of een beveiligingssleutel.",
    loading: "Passkeys laden…",
    empty:
      "Voeg een passkey toe en sla de stap via e-mail voortaan over. Passkeys horen bij deze site: je kunt er nergens anders mee inloggen. Inloggen per e-mail blijft altijd mogelijk.",
    add: "Passkey toevoegen",
    nickname: "Naam",
    nicknameOptional: "Naam (optioneel)",
    nicknameExample: "bijv. MacBook Touch ID",
    cancel: "Annuleren",
    saving: "Opslaan",
    save: "Opslaan",
    rename: "Hernoemen",
    remove: "Verwijderen",
    unlocks: "Ontgrendelt je kluis.",
    canUnlock: "Kan ook je kluis ontgrendelen, zodat je het wachtwoord niet hoeft te typen.",
    stop: "Stoppen",
    setUp: "Instellen",
    currentWarning:
      "Met deze passkey ben je nu ingelogd. Je blijft hier ingelogd, maar de volgende keer log je in per e-mail of met een andere passkey.",
    removeAsk: "Deze passkey verwijderen?",
    removing: "Verwijderen",
    confirmRemove: "Ja, verwijderen",
    waiting: "Wachten op je apparaat",
    continue: "Doorgaan",
    confirmOnDevice: "Bevestig op je apparaat om door te gaan.",
    browserWillAsk: "Je browser vraagt je te bevestigen met Touch ID, Face ID, Windows Hello of een beveiligingssleutel.",
    synced: "Gesynchroniseerd",
    thisDevice: "Dit apparaat",
    lastUsed: (date: string) => `Laatst gebruikt ${date}`,
    neverUsed: "Nooit gebruikt",
    devicesTitle: "Ingelogde apparaten",
    devicesBody:
      "Een apparaat kwijt, of ergens ingelogd dat je niet meer vertrouwt? Hiermee log je je account overal uit, deze browser ook, en stopt elke toegangssleutel waarmee een programma gekoppeld was.",
    signOutEverywhere: "Overal uitloggen",
    signOutAsk: "Overal uitloggen?",
    signOutBody:
      "Elke browser en elk apparaat wordt uitgelogd, ook dit, en elke toegangssleutel stopt. Een programma met een sleutel, zoals de tessil-tool, moet opnieuw worden gekoppeld. Je bestanden, portalen en kluis blijven zoals ze zijn.",
    staySignedIn: "Ingelogd blijven",
    signingOut: "Uitloggen…",
    unlockTitle: "Je kluis ontgrendelen met deze passkey",
    unlockBody:
      "Bevestig eenmalig dat jij het bent. Daarna opent deze passkey je kluis met een aanraking of een blik. Alle andere manieren blijven werken.",
    errors: {
      setUp: "Dit kon niet worden ingesteld.",
      change: "Dat kon niet worden gewijzigd.",
      load: "De passkeys konden niet worden geladen.",
      add: "De passkey kon niet worden toegevoegd.",
      rename: "De passkey kon niet worden hernoemd.",
      remove: "De passkey kon niet worden verwijderd.",
      signOut: "Overal uitloggen is niet gelukt. Er is niets gewijzigd; probeer het opnieuw.",
    },
  },

  passkeyRow: { unnamed: "Passkey zonder naam", current: "Hiermee ben je hier ingelogd" },

  proof: {
    vaultPassword: "Kluiswachtwoord",
    phrase: "Herstelzin",
    phrasePlaceholder: "woord woord woord …",
    passkeyNote: "Je bevestigt met je passkey als je doorgaat.",
    useInstead: { password: "Gebruik liever je kluiswachtwoord", phrase: "Gebruik liever je herstelzin", passkey: "Gebruik liever een passkey" },
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
