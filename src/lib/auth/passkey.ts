// Passkey ceremony orchestration. Thin wrappers around
// `@simplewebauthn/browser` plus our API client. Audit doc 27.
//
// The browser library handles the WebAuthn JSON <-> binary conversion;
// our job is to plumb its output to the server unchanged. The only
// extra responsibility here is normalising user-facing error messages
// (cancellation vs. real failure vs. browser unsupported).

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

/**
 * Enroll a new passkey for the signed-in user. Caller is responsible for
 * being authenticated (the API gate is server-side; this helper does not
 * check). Returns the new authenticator summary on success.
 */
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

/**
 * Sign in with a passkey. Returns when the server has set the session
 * cookie; caller should refresh local auth state.
 *
 * `mediation` controls the browser UI:
 *  - `"required"` (default) is the explicit "Sign in with passkey" button.
 *  - `"conditional"` is autofill UI on the email input; this call resolves
 *    only when the user picks a credential from the autofill list, and
 *    silently no-ops if the browser can't fulfil it.
 */
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

/**
 * Probe whether the browser supports conditional UI (autofill). Returns
 * `false` on browsers without WebAuthn entirely.
 */
export async function conditionalUiAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  // `isConditionalMediationAvailable` is a static method on
  // PublicKeyCredential in browsers that support it. Older browsers won't
  // have it — surface as false.
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
  // The browser library normalises some failures into DOMException-style
  // names. NotAllowedError covers both user cancel and origin mismatch;
  // we lean toward "cancelled" as the friendliest default, since origin
  // mismatch would be a deploy bug.
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
