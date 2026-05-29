// Thin wrappers around @simplewebauthn/browser + API. Normalises ceremony errors for the UI.

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { api } from "$lib/api/client";

export class PasskeyError extends Error {
  constructor(
    message: string,
    public readonly kind: PasskeyErrorKind,
  ) {
    super(message);
    this.name = "PasskeyError";
  }
}

export type PasskeyErrorKind =
  | "unsupported"
  | "cancelled"
  | "ceremony_failed"
  | "server_rejected";

export function isPasskeySupported(): boolean {
  if (typeof window === "undefined") return false;
  return browserSupportsWebAuthn();
}

export async function enrollPasskey(nickname: string | null) {
  if (!isPasskeySupported()) {
    throw new PasskeyError(
      "Your browser doesn't support passkeys.",
      "unsupported",
    );
  }

  const { options, challengeId } = await api
    .passkeyRegisterBegin()
    .catch((err) => {
      throw new PasskeyError(
        err instanceof Error ? err.message : "Couldn't start enrollment.",
        "server_rejected",
      );
    });

  let response;
  try {
    response = await startRegistration({
      optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
    });
  } catch (err) {
    throw mapCeremonyError(err);
  }

  return api
    .passkeyRegisterFinish(challengeId, response, nickname)
    .catch((err) => {
      throw new PasskeyError(
        err instanceof Error ? err.message : "Couldn't save your passkey.",
        "server_rejected",
      );
    });
}

/** `conditional` is autofill UI; `required` is the explicit button. */
export async function signInWithPasskey(
  mediation: "required" | "conditional" = "required",
) {
  if (!isPasskeySupported()) {
    throw new PasskeyError(
      "Your browser doesn't support passkeys.",
      "unsupported",
    );
  }

  const { options, challengeId } = await api
    .passkeyLoginBegin()
    .catch((err) => {
      throw new PasskeyError(
        err instanceof Error ? err.message : "Couldn't start sign-in.",
        "server_rejected",
      );
    });

  let response;
  try {
    response = await startAuthentication({
      optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
      useBrowserAutofill: mediation === "conditional",
    });
  } catch (err) {
    throw mapCeremonyError(err);
  }

  await api.passkeyLoginFinish(challengeId, response).catch((err) => {
    throw new PasskeyError(
      err instanceof Error ? err.message : "Couldn't verify your passkey.",
      "server_rejected",
    );
  });
}

export async function conditionalUiAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  const PK = (globalThis as { PublicKeyCredential?: { isConditionalMediationAvailable?: () => Promise<boolean> } })
    .PublicKeyCredential;
  if (!PK?.isConditionalMediationAvailable) return false;
  try {
    return await PK.isConditionalMediationAvailable();
  } catch {
    return false;
  }
}

function mapCeremonyError(err: unknown): PasskeyError {
  // NotAllowedError ambiguously covers cancel and origin mismatch; favour cancel UX.
  const name =
    typeof err === "object" && err !== null && "name" in err
      ? String((err as { name: unknown }).name)
      : "";
  if (
    name === "NotAllowedError" ||
    name === "AbortError" ||
    name === "TimeoutError"
  ) {
    return new PasskeyError("Sign-in was cancelled.", "cancelled");
  }
  const msg = err instanceof Error ? err.message : "Passkey sign-in failed.";
  return new PasskeyError(msg, "ceremony_failed");
}
