<script lang="ts">
  // What an account adds and stores, in plain words, for people deciding
  // whether to make one. Every line here is stated in more detail, and
  // binding, in the privacy policy.

  import ProsePage from "$lib/components/ProsePage.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { PORTALS_ANNOUNCED } from "$lib/config/launch";

  const stored: { what: string; why: string }[] = [
    {
      what: "Your email address",
      why: "To send you a sign-in link. There is no password to store, because there is none.",
    },
    {
      what: "When you signed in",
      why: "With the browser you used and the country and network of the connection. Not your IP address. Kept for 90 days.",
    },
    {
      what: "Your sessions",
      why: "So you stay signed in: up to 30 days without a visit, and never longer than 90 days in all.",
    },
    {
      what: "What you sent, in outline",
      why: "Each transfer's size, dates, download count, and that it is yours. Its files, their names and its title stay encrypted.",
    },
    {
      what: "Your passkeys",
      why: "Their public key and the name you give each one. Never your fingerprint or face: those stay on your device.",
    },
    {
      what: "Your vault, if you make one",
      why: "Only in locked form. It opens in your browser, with your password, your recovery phrase or a passkey, and nowhere else.",
    },
    {
      what: "Your plan",
      why: "Free, or for a paid plan that a subscription exists and when it renews. Your card details go to our payment provider, never to us.",
    },
  ];

  const never = [
    "What is in your files",
    "The names of your files",
    "The titles of your transfers",
    "The key in a link, which is what opens a transfer",
    "Your vault password or recovery phrase",
    ...(PORTALS_ANNOUNCED ? ["The names of your portals and forms, their questions, and what people send or answer"] : []),
  ];
</script>

<Seo
  title="What an account stores - Tessil"
  description="An account on Tessil is optional. Here is everything it stores, what we can never read, and how to delete it all."
  path="/what-we-store"
/>

<ProsePage
  title="What an account stores"
  tagline="An account is optional. This is everything it adds, and what we cannot read either way."
  updated="November 22, 2026"
  current="data"
>
  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">In short</h2>
    <p class="text-muted-foreground">
      You can send files without an account: links then last up to three days. An account
      makes that a week, keeps a list of what you sent, and lets you sign in with a passkey.
      Your files are encrypted in your browser the same way, signed in or not.
    </p>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">What we store with an account</h2>
    <dl class="divide-y divide-border border-y border-border">
      {#each stored as row (row.what)}
        <div class="grid gap-1 py-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6">
          <dt class="font-medium text-foreground">{row.what}</dt>
          <dd class="text-muted-foreground">{row.why}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">What we can never read</h2>
    <p class="text-muted-foreground">
      Not because we promise not to look, but because it reaches us encrypted and the key
      never does:
    </p>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      {#each never as item (item)}
        <li>{item}</li>
      {/each}
    </ul>
    <p class="text-muted-foreground">
      You can check this yourself in a couple of minutes:
      <TextLink href="/verify">verify it</TextLink>.
    </p>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">What we do not do</h2>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li>No ads, analytics or trackers, and no tracking cookies</li>
      <li>No selling or sharing of your data</li>
      <li>No newsletters: we only email you to sign in, or about something you did</li>
    </ul>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">Take it with you, or delete it</h2>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li>
        <strong class="text-foreground">Download it.</strong> Settings, Account, Your data gives
        you everything we hold about you as a file.
      </li>
      <li>
        <strong class="text-foreground">Delete it.</strong> Settings, Account, Delete account
        removes your account, your transfers and your sessions at once. There is no waiting
        period and no way back.
      </li>
    </ul>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">In full</h2>
    <p class="text-muted-foreground">
      This page is a summary. The
      <TextLink href="/privacy">privacy policy</TextLink> is the full and binding version,
      and the <TextLink href="/security">security overview</TextLink> explains how the
      encryption works.
    </p>
  </section>
</ProsePage>
