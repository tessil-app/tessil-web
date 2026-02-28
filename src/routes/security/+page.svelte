<script lang="ts">
  import * as Frame from "$lib/components/frame";
</script>

<svelte:head>
  <title>Security Overview - JTransfer</title>
  <meta
    name="description"
    content="Security overview for all JTransfer products, including File Share and Image Converter, with threat boundaries and disclosure process."
  />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="Security Overview - JTransfer" />
  <meta
    property="og:description"
    content="Understand how security works across JTransfer File Share and Image Converter."
  />
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
  <div class="max-w-3xl mx-auto px-4 py-12">
    <div class="text-center mb-8">
      <a href="/" class="text-3xl font-bold mb-2 hover:text-primary transition-colors">JTransfer</a>
      <p class="text-muted-foreground">Security Overview</p>
    </div>

    <Frame.Root>
      <Frame.Panel>
        <div class="space-y-6">
          <p class="text-sm text-muted-foreground">Last updated: February 28, 2026</p>

          <section class="space-y-3">
            <h1 class="text-xl font-semibold text-foreground">Security Scope</h1>
            <p class="text-muted-foreground">
              This page covers security for all products currently available on JTransfer:
              <strong>File Share</strong> and <strong>Image Converter</strong>.
              Each feature follows the same core values: privacy by default, minimal
              data exposure, and fast local processing when possible.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Product Security Models</h2>
            <div class="space-y-3">
              <div>
                <h3 class="font-medium text-foreground">File Share</h3>
                <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Files and filenames are encrypted in-browser before upload</li>
                  <li>Encryption key stays in the URL fragment and is not sent to the server</li>
                  <li>Optional password adds server-side access control</li>
                  <li>Transfers expire and are automatically deleted</li>
                </ul>
              </div>
              <div>
                <h3 class="font-medium text-foreground">Image Converter</h3>
                <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Image conversion runs locally in your browser</li>
                  <li>We do not upload source images for conversion</li>
                  <li>Generated files are stored only in your browser session</li>
                </ul>
              </div>
            </div>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">What We Can Access</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Encrypted file blobs and encrypted filenames for File Share</li>
              <li>Transfer metadata for File Share (size, expiration, timestamps)</li>
              <li>Operational metadata needed for abuse handling and rate limiting</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">What We Cannot Access</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Unencrypted File Share contents</li>
              <li>Original filenames in File Share</li>
              <li>Your File Share decryption key</li>
              <li>Image Converter source files on our servers</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Shared Safeguards</h2>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Transport security via HTTPS/TLS</li>
              <li>Client-side cryptography for File Share before network transfer</li>
              <li>Local-only processing for Image Converter</li>
              <li>No account system required for core usage</li>
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
        <a href="/image-converter" class="hover:text-foreground transition-colors">Image Converter</a>
        <span>·</span>
        <a href="/privacy" class="hover:text-foreground transition-colors">Privacy Policy</a>
        <span>·</span>
        <a href="/terms" class="hover:text-foreground transition-colors">Terms of Service</a>
      </div>
    </div>
  </div>
</div>
