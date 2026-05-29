import { api, type MeResponse } from "$lib/api/client";
import { clearVaultCache } from "$lib/vault/client";

type User = NonNullable<MeResponse["user"]>;

class AuthState {
  user = $state<User | null>(null);
  loaded = $state(false);

  isAuthenticated = $derived(this.user !== null);
  needsVaultSetup = $derived(
    this.user !== null && this.user.vaultSetupCompletedAt === null,
  );

  setUser(user: User | null) {
    this.user = user;
    this.loaded = true;
  }

  /** Local update; avoids a full /me refresh after vault setup. */
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
      // Drop K_vault so the next user on this tab doesn't inherit it.
      clearVaultCache();
      this.user = null;
    }
  }
}

export const auth = new AuthState();
