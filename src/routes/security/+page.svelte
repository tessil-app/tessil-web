<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import PageLayout from "$lib/components/PageLayout.svelte";
</script>

<svelte:head>
  <title>Security Overview - JTransfer</title>
  <meta
    name="description"
    content="Security overview for JTransfer end-to-end encrypted file transfer, including threat boundaries and disclosure process."
  />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="Security Overview - JTransfer" />
  <meta
    property="og:description"
    content="How end-to-end encryption works on JTransfer, what we can and cannot access, and how to report a vulnerability."
  />
</svelte:head>

<PageLayout width="3xl">
  <div class="text-center mb-8">
      <a href="/" class="text-3xl font-bold mb-2 hover:text-primary transition-colors">JTransfer</a>
      <p class="text-muted-foreground">Security Overview</p>
    </div>

    <Frame.Root>
      <Frame.Panel>
        <div class="space-y-6">
          <p class="text-sm text-muted-foreground">Last updated: May 6, 2026</p>

          <section class="space-y-3">
            <h1 class="text-xl font-semibold text-foreground">Scope</h1>
            <p class="text-muted-foreground">
              JTransfer is a single-product service: end-to-end encrypted file transfer.
              This page describes the security model behind that service — what we can
              and cannot access, how keys are handled, and how to report a vulnerability.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Encryption Model</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Files and filenames are encrypted in your browser with AES-256-GCM before upload</li>
              <li>The encryption key is generated client-side and lives in the URL fragment (after <code>#</code>)</li>
              <li>The fragment is not transmitted to our servers; it stays in your browser</li>
              <li>An optional transfer password adds server-side access control independent of the encryption key</li>
              <li>Transfers expire and are automatically deleted after the selected window</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Sharing Links Securely</h2>
            <p class="text-muted-foreground">
              The decryption key for a transfer is embedded in the URL fragment
              (the part after <code>#</code>). The fragment is never sent to our servers —
              it only exists in your browser.
            </p>
            <p class="text-muted-foreground">
              However, the full URL (including the fragment) may be saved to browser
              history, browser sync, and bookmarks. Anyone with access to your browser
              can retrieve a shared link and decrypt the files unless a password is set.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Share links only through trusted, private channels (e.g. Signal, encrypted email)</li>
              <li>Use a transfer password for sensitive files — this adds a second factor beyond the link</li>
              <li>Use a private/incognito window if you do not want the link saved to browser history</li>
              <li>Set the shortest expiry that works for your recipient</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">What We Can Access</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Encrypted file blobs and encrypted filenames</li>
              <li>Transfer metadata (size, expiration, timestamps)</li>
              <li>Operational metadata needed for abuse handling and rate limiting</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">What We Cannot Access</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Unencrypted file contents</li>
              <li>Original filenames</li>
              <li>Your decryption key</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Safeguards</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Transport security via HTTPS/TLS</li>
              <li>Client-side cryptography before network transfer</li>
              <li>No account system required for core usage</li>
              <li>No third-party analytics or tracking SDKs</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Responsible Disclosure</h2>
            <p class="text-muted-foreground">
              If you find a security vulnerability, report it privately first so we
              can fix it before public disclosure.
            </p>
            <p class="text-muted-foreground">
              Contact:
              <a
                href="mailto:security@jimmyverburgt.com"
                class="text-primary hover:underline"
              >security@jimmyverburgt.com</a>
            </p>
            <p class="text-sm text-muted-foreground">
              Include reproduction steps, affected URLs, and impact. We aim to
              acknowledge reports within 72 hours.
            </p>
          </section>
        </div>
      </Frame.Panel>
    </Frame.Root>

    <div class="mt-8 text-center text-sm text-muted-foreground">
      <div class="flex items-center justify-center gap-3">
        <a href="/" class="hover:text-foreground transition-colors">Home</a>
        <span>·</span>
        <a href="/privacy" class="hover:text-foreground transition-colors">Privacy Policy</a>
        <span>·</span>
        <a href="/terms" class="hover:text-foreground transition-colors">Terms of Service</a>
      </div>
    </div>
</PageLayout>
