// What to tell the user when the vault did not open.

import { appLocale } from "$lib/i18n/app.svelte";
import type { Locale } from "$lib/i18n/locale";
import type { VaultAccessFailure } from "./client";

const MESSAGES: Record<Locale, Record<VaultAccessFailure, string>> = {
  en: {
    wrong_password: "That password didn't unlock the vault.",
    wrong_phrase: "That recovery phrase doesn't match. Check spelling and word order.",
    not_setup: "Your vault isn't set up yet.",
    no_password: "This vault has no password. Use a passkey or your recovery phrase.",
    cancelled: "The passkey prompt was dismissed, or that passkey isn't on this device.",
    no_prf:
      "That passkey can't do this. If you added it a while ago, remove it and add it again. Some password managers don't support it at all.",
    none_enrolled: "No passkey is set up to unlock this vault.",
    wrong_passkey: "That passkey didn't open the vault.",
    unsupported: "This browser can't use a passkey here.",
    malformed: "We couldn't read your vault. Try again.",
  },
  nl: {
    wrong_password: "Met dat wachtwoord ging de kluis niet open.",
    wrong_phrase: "Die herstelzin klopt niet. Controleer de spelling en de volgorde van de woorden.",
    not_setup: "Je kluis is nog niet ingesteld.",
    no_password: "Deze kluis heeft geen wachtwoord. Gebruik een passkey of je herstelzin.",
    cancelled: "De vraag om een passkey werd gesloten, of die passkey staat niet op dit apparaat.",
    no_prf:
      "Die passkey kan dit niet. Heb je hem al een tijd geleden toegevoegd, verwijder hem dan en voeg hem opnieuw toe. Sommige wachtwoordbeheerders ondersteunen dit helemaal niet.",
    none_enrolled: "Er is geen passkey ingesteld om deze kluis te openen.",
    wrong_passkey: "Met die passkey ging de kluis niet open.",
    unsupported: "Deze browser kan hier geen passkey gebruiken.",
    malformed: "We konden je kluis niet lezen. Probeer het opnieuw.",
  },
};

export function vaultFailureMessage(reason: VaultAccessFailure, locale: Locale = appLocale()): string {
  return MESSAGES[locale][reason];
}
