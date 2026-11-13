// What to tell the user when the vault did not open.

import type { VaultAccessFailure } from "./client";

export function vaultFailureMessage(reason: VaultAccessFailure): string {
  switch (reason) {
    case "wrong_password":
      return "That password didn't unlock the vault.";
    case "wrong_phrase":
      return "That recovery phrase doesn't match. Check spelling and word order.";
    case "not_setup":
      return "Your vault isn't set up yet.";
    case "no_password":
      return "This vault has no password. Use a passkey or your recovery phrase.";
    case "cancelled":
      return "The passkey prompt was dismissed, or that passkey isn't on this device.";
    case "no_prf":
      return "That passkey can't do this. If you added it a while ago, remove it and add it again. Some password managers don't support it at all.";
    case "none_enrolled":
      return "No passkey is set up to unlock this vault.";
    case "wrong_passkey":
      return "That passkey didn't open the vault.";
    case "unsupported":
      return "This browser can't use a passkey here.";
    default:
      return "We couldn't read your vault. Try again.";
  }
}
