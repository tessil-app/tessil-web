<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
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
  <PageHeader
    title="Security Overview"
    tagline="How end-to-end encryption works on JTransfer, and how to report a vulnerability."
  />

    <Frame.Root>
      <Frame.Panel>
        <div class="space-y-6">
          <p class="text-sm text-muted-foreground">Last updated: May 13, 2026</p>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">Scope</h2>
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
              <li>Accounts are optional — anonymous transfers are first-class</li>
              <li>No third-party analytics or tracking SDKs</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Optional Accounts</h2>
            <p class="text-muted-foreground">
              You can optionally sign in to manage transfers from a single
              place. Accounts use magic-link email or a device-bound passkey —
              there is no password to remember, lose, or breach.
              <strong>Accounts do not weaken the
              encryption model:</strong> file payloads remain end-to-end
              encrypted whether you are signed in or not, and the encryption
              key still lives only in the URL fragment.
            </p>
            <p class="text-muted-foreground">When you have an account we store:</p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Your email address (for sign-in)</li>
              <li>Your tier (free or paid)</li>
              <li>A hashed session token for as long as you stay signed in</li>
              <li>The IP address and browser at sign-in time, for security context in your sign-in email</li>
              <li>Authentication events (sign-in requests, successes, sign-outs) — kept for 90 days then automatically deleted</li>
            </ul>
            <p class="text-muted-foreground">
              We never store the magic-link token itself or your session cookie
              in plaintext — both are SHA-256 hashed before being written to
              the database. Sign-in links expire after 15 minutes and can only
              be used once.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Sign-in codes and anti-phishing</h2>
            <p class="text-muted-foreground">
              If you open a sign-in link on a different device than the one you
              started signing in on, JTransfer will show you a 6-digit code
              instead of signing you in on the wrong device. You then type that
              code back on the device where you started.
            </p>
            <p class="text-muted-foreground">
              <strong>JTransfer will never ask you to share that code.</strong>
              We will never email, call, message, or otherwise contact you to
              request a sign-in code. If anyone — claiming to be JTransfer
              support, a friend, a delivery service, or anyone else — asks for
              the code, it is a phishing attempt. Do not share it.
            </p>
            <p class="text-muted-foreground">
              The code is shown only on the device that opened the link, never
              in the email itself, and never in any other communication from
              us.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Passkeys</h2>
            <p class="text-muted-foreground">
              If your device supports it, you can add a passkey to your account
              and sign in without an email round-trip. A passkey is a
              cryptographic key pair generated and stored by your device's
              authenticator (Touch ID, Face ID, Windows Hello, a hardware
              security key, or a synced credential from your platform
              password manager).
            </p>
            <p class="text-muted-foreground">
              <strong>Passkeys are bound to this site's domain.</strong> Your
              browser will only release a JTransfer passkey to JTransfer — it
              cannot be used on a look-alike site, even one that copies our
              design pixel-for-pixel. This is enforced by the browser itself
              (the WebAuthn standard), not by us, and it is the main reason
              passkeys resist phishing in a way that passwords and one-time
              codes cannot.
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>The private key never leaves your device (or your platform's secure sync, if you opt in)</li>
              <li>We only store a public key, a credential identifier, and basic device info</li>
              <li>You can add, rename, and remove passkeys from your account settings at any time</li>
              <li>Passkeys do not replace email sign-in — both options stay available, so a lost device doesn't lock you out</li>
            </ul>
            <p class="text-muted-foreground">
              Passkeys do not change the encryption model: file payloads remain
              end-to-end encrypted, and the encryption key still lives only in
              the URL fragment. Signing in with a passkey only authenticates
              you to JTransfer — it does not give us access to your transfers'
              contents.
            </p>
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

  <SiteFooter current="security" />
</PageLayout>
