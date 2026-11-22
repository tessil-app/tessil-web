// Text of the sign-in pages: /login, /signin/verify and /signin/code.
// See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  login: {
    seoTitle: "Sign in - Tessil",
    title: "Sign in",
    tagline:
      "We'll email you a one-time link. First time here? Your account is created on first sign-in, no password needed.",
    linkInvalid: "That sign-in link has expired or been used. Request a new one below.",
    passkeyFailed: "Passkey sign-in failed.",
    genericError: "Something went wrong. Try again.",
    codeMismatch: "That code didn't match. Try again or request a new link.",
    inboxTitle: "Check your inbox",
    inboxBefore: "If",
    inboxAfter:
      "is a valid email, a sign-in link is on its way. The link expires in 15 minutes. Don't see it after a minute or two? Check your spam or junk folder.",
    otherDevice: "Opened the link on a different device?",
    otherDeviceBody: "The other device will show you a 6-digit code. Enter it here to sign in on this device.",
    verifying: "Verifying…",
    withCode: "Sign in with code",
    another: "Send another link",
    passkeyFailedTitle: "Passkey sign-in failed",
    waitingPasskey: "Waiting for passkey…",
    withPasskey: "Sign in with passkey",
    passkeyHint: "Use a passkey saved on this device, or pick one from another device.",
    or: "or",
    email: "Email",
    emailPlaceholder: "you@example.com",
    sending: "Sending…",
    send: "Send sign-in link",
    storesTitle: "What an account stores",
    stores:
      "Your email, when you signed in, and the size and dates of what you send. Never your files, their names or the key that opens them.",
    storesLink: "Everything it stores",
  },
  verify: {
    seoTitle: "Signing you in - Tessil",
    failedTitle: "This link didn't work",
    failedTagline: "Sign-in links are single use and valid for 15 minutes.",
    title: "Signing you in",
    tagline: "One moment while we check your sign-in link.",
    freshTitle: "Request a fresh link",
    fresh:
      "This link has already been used, has expired, or is incomplete. Ask for a new one and open it on the same device you requested it from.",
    back: "Back to sign-in",
    checking: "Checking your link",
  },
  code: {
    seoTitle: "Your sign-in code - Tessil",
    title: "Your sign-in code",
    tagline:
      "It looks like you opened the link on a different device. Type this code on the device where you started signing in. We won't sign you in here.",
    expired: "expired",
    left: (m: number, s: number) => (m === 0 ? `${s}s left` : `${m}m ${s.toString().padStart(2, "0")}s left`),
    noneTitle: "No code to show",
    none: "This page only works when reached from a sign-in email link. Head back to your other device and request a fresh link.",
    back: "Back to sign-in",
    expiredTitle: "This code has expired",
    expiredBody: "Sign-in codes are valid for 15 minutes. Start over from the device where you began.",
    newLink: "Request a new link",
    sixDigits: "Six-digit code",
    codeLabel: "Sign-in code",
    copied: "Copied",
    copy: "Copy code",
    nextTitle: "What to do next",
    next:
      "Switch back to the device where you started signing in and enter this code. Closing this tab won't lose anything: the code stays valid on the other device until it's used or expires.",
  },
};

const nl: typeof en = {
  login: {
    seoTitle: "Inloggen - Tessil",
    title: "Inloggen",
    tagline:
      "We mailen je een eenmalige link. Voor het eerst hier? Je account wordt aangemaakt bij de eerste keer inloggen, zonder wachtwoord.",
    linkInvalid: "Die inloglink is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.",
    passkeyFailed: "Inloggen met passkey is mislukt.",
    genericError: "Er ging iets mis. Probeer het opnieuw.",
    codeMismatch: "Die code klopt niet. Probeer het opnieuw of vraag een nieuwe link aan.",
    inboxTitle: "Kijk in je inbox",
    inboxBefore: "Als",
    inboxAfter:
      "een geldig e-mailadres is, is er een inloglink onderweg. De link verloopt na 15 minuten. Zie je hem na een minuut of twee niet? Kijk dan in je spam of ongewenste e-mail.",
    otherDevice: "De link op een ander apparaat geopend?",
    otherDeviceBody: "Het andere apparaat toont een code van 6 cijfers. Vul die hier in om op dit apparaat in te loggen.",
    verifying: "Controleren…",
    withCode: "Inloggen met code",
    another: "Nog een link sturen",
    passkeyFailedTitle: "Inloggen met passkey is mislukt",
    waitingPasskey: "Wachten op passkey…",
    withPasskey: "Inloggen met passkey",
    passkeyHint: "Gebruik een passkey op dit apparaat, of kies er een van een ander apparaat.",
    or: "of",
    email: "E-mailadres",
    emailPlaceholder: "jij@voorbeeld.nl",
    sending: "Versturen…",
    send: "Stuur inloglink",
    storesTitle: "Wat een account bewaart",
    stores:
      "Je e-mailadres, wanneer je inlogde, en de grootte en data van wat je verstuurt. Nooit je bestanden, hun namen of de sleutel die ze opent.",
    storesLink: "Alles wat het bewaart",
  },
  verify: {
    seoTitle: "Je wordt ingelogd - Tessil",
    failedTitle: "Deze link werkte niet",
    failedTagline: "Inloglinks zijn eenmalig en 15 minuten geldig.",
    title: "Je wordt ingelogd",
    tagline: "Een moment, we controleren je inloglink.",
    freshTitle: "Vraag een nieuwe link aan",
    fresh:
      "Deze link is al gebruikt, verlopen of onvolledig. Vraag een nieuwe aan en open die op hetzelfde apparaat waarop je hem aanvroeg.",
    back: "Terug naar inloggen",
    checking: "Je link wordt gecontroleerd",
  },
  code: {
    seoTitle: "Je inlogcode - Tessil",
    title: "Je inlogcode",
    tagline:
      "Het lijkt erop dat je de link op een ander apparaat opende. Typ deze code op het apparaat waar je begon met inloggen. Hier loggen we je niet in.",
    expired: "verlopen",
    left: (m: number, s: number) => (m === 0 ? `nog ${s} s` : `nog ${m} min ${s.toString().padStart(2, "0")} s`),
    noneTitle: "Geen code om te tonen",
    none: "Deze pagina werkt alleen vanuit een inloglink in een e-mail. Ga terug naar je andere apparaat en vraag een nieuwe link aan.",
    back: "Terug naar inloggen",
    expiredTitle: "Deze code is verlopen",
    expiredBody: "Inlogcodes zijn 15 minuten geldig. Begin opnieuw op het apparaat waar je begon.",
    newLink: "Vraag een nieuwe link aan",
    sixDigits: "Code van zes cijfers",
    codeLabel: "Inlogcode",
    copied: "Gekopieerd",
    copy: "Code kopiëren",
    nextTitle: "Wat je nu doet",
    next:
      "Ga terug naar het apparaat waar je begon met inloggen en vul deze code in. Dit tabblad sluiten kan geen kwaad: de code blijft geldig op het andere apparaat tot hij is gebruikt of verloopt.",
  },
};

export const signinMessages: Record<Locale, typeof en> = { en, nl };
