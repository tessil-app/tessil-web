// Reactive session state. Populated by +layout.ts on initial load and updated
// after login/logout actions.

import { api, type MeResponse } from "$lib/api/client";
import { clearVaultCache } from "$lib/vault/client";

type User = NonNullable<MeResponse["user"]>;

class AuthState {
  user = $state<User | null>(null);
  loaded = $state(false);

  isAuthenticated = $derived(this.user !== null);
  // Per ADR-0004: a signed-in user without a vault must complete /setup/vault
  // before reaching the dashboard. Reading this $derived from the layout
  // guard keeps the redirect logic in one place.
  needsVaultSetup = $derived(
    this.user !== null && this.user.vaultSetupCompletedAt === null,
  );

  setUser(user: User | null) {
    this.user = user;
    this.loaded = true;
  }

  /** Local update after vault setup completes — avoids a full /me refresh. */
  markVaultSetupComplete(at: string) {
    if (this.user) {
      this.user = { ...this.user, vaultSetupCompletedAt: at };
    }
  }

  async refresh(): Promise<void> {
    try {
      const { user } = await api.getMe();
      this.user = user;
    } catch {
      this.user = null;
    } finally {
      this.loaded = true;
    }
  }

  async logout(): Promise<void> {
    try {
      await api.logout();
    } finally {
      // Sign-out must drop the vault key from memory (D-116) — otherwise
      // the next signed-in user on the same tab inherits the prior K_vault.
      clearVaultCache();
      this.user = null;
    }
  }
}

export const auth = new AuthState();
