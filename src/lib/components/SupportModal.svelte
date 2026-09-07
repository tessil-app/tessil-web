<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import {
    SUPPORT_EMAIL,
    SUPPORT_POLAR_MONTHLY_URL,
    SUPPORT_POLAR_ONETIME_URL,
  } from "$lib/config/support";

  interface Props {
    open: boolean;
    /** Fires on dismiss and on click-through; both count as "don't ask again". */
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();
</script>

<Modal
  {open}
  {onClose}
  title="Keep Tessil alive"
  description="Free, no ads, no trackers, and no company behind it."
>
  <p>
    Servers, storage and the domain come out of one person's pocket. A couple of
    euros a month, or once, covers a real part of that.
  </p>
  <p class="text-muted-foreground">
    It unlocks nothing. No badge, no extra features, no different treatment,
    because a privacy tool that treats paying users better has started measuring
    who pays.
  </p>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
    <Button
      href={SUPPORT_POLAR_MONTHLY_URL}
      target="_blank"
      rel="noopener noreferrer"
      onclick={onClose}
    >
      A few euros a month
    </Button>
    <Button
      variant="secondary"
      href={SUPPORT_POLAR_ONETIME_URL}
      target="_blank"
      rel="noopener noreferrer"
      onclick={onClose}
    >
      One-time instead
    </Button>
  </div>

  <p class="text-xs text-muted-foreground leading-relaxed">
    <strong class="font-medium text-foreground">Use your Tessil account email</strong>
    at checkout if you have an account. Nothing depends on it today; it is just
    the only thing that ties a contribution to an account later.
  </p>

  <p class="text-xs text-muted-foreground leading-relaxed">
    <strong class="font-medium text-foreground">Cancelling is one click</strong>
    in Polar's customer portal, linked in every receipt. No notice period, no
    retention offer. Stuck? Mail
    <a
      href="mailto:{SUPPORT_EMAIL}"
      class="text-primary underline underline-offset-2">{SUPPORT_EMAIL}</a
    >. Detail on the
    <a href="/pricing#cancel" class="text-primary underline underline-offset-2"
      >pricing page</a
    >.
  </p>

  {#snippet footer()}
    <Button variant="ghost" fullWidth={false} onclick={onClose}>Not now</Button>
  {/snippet}
</Modal>
