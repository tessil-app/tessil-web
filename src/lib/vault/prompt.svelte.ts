// Lets any page ask for the vault unlock dialog, which lives in the root
// layout. Pages request; the layout opens.

class UnlockPrompt {
  requested = $state(false);

  request(): void {
    this.requested = true;
  }
}

export const unlockPrompt = new UnlockPrompt();
