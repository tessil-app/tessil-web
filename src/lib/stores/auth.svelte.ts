// Reactive session state. Populated by +layout.ts on initial load and updated
// after login/logout actions.

import { api, type MeResponse } from "$lib/api/client";
import { clearVaultCache } from "$lib/vault/client";

type User = NonNullable<MeResponse["user"]>;

class AuthState {
  user = $state<User | null>(null);
  loaded = $state(false);

  isAuthenticated = $derived(this.user !== null);

  setUser(user: User | null) {
    this.user = user;
    this.loaded = true;
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
