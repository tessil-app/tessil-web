<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
</script>

<svelte:head>
  <title>Terms of Service - Tessil</title>
  <meta
    name="description"
    content="Tessil terms of service: usage, limits, acceptable use, legal compliance. End-to-end encrypted file transfer."
  />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="Terms of Service - Tessil" />
  <meta
    property="og:description"
    content="Terms of service for using Tessil end-to-end encrypted file transfer."
  />
</svelte:head>

<PageLayout width="3xl">
  <PageHeader
    title="Terms of Service"
    tagline="End-to-end encrypted file transfer."
  />

    <Frame.Root>
      <Frame.Panel>
        <div class="space-y-6">
          <p class="text-sm text-muted-foreground">Last updated: May 6, 2026</p>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p class="text-muted-foreground">
              By using Tessil ("the Service"), you agree to these terms. If you
              don't agree, don't use the Service.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p class="text-muted-foreground">
              Tessil is an end-to-end encrypted file transfer service with
              temporary share links.
            </p>
            <p class="text-muted-foreground">
              Tessil is free to use. It works without an account; signing in adds
              a dashboard and longer-lived transfers. There is no paid plan at
              this time.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">3. Acceptable Use</h2>
            <p class="text-muted-foreground">You agree NOT to use the Service to:</p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Upload, share, or distribute illegal content</li>
              <li>Share copyrighted material without authorization</li>
              <li>Distribute malware, viruses, or harmful code</li>
              <li>Share content that exploits or harms minors</li>
              <li>Harass, abuse, or threaten others</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Attempt to circumvent rate limits or abuse the Service</li>
              <li>Use automated systems to upload content at scale</li>
              <li>Resell or commercially exploit the Service without permission</li>
            </ul>
            <p class="text-muted-foreground">
              We reserve the right to terminate access to users who violate these terms.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">4. User Responsibilities</h2>
            <p class="text-muted-foreground">You are solely responsible for:</p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>The content you upload and share</li>
              <li>Keeping your share links secure</li>
              <li>Ensuring you have the right to share the content</li>
              <li>Complying with all applicable laws in your jurisdiction</li>
            </ul>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">5. Service Limitations</h2>
            <p class="text-muted-foreground">
              Per-file size, monthly volume, and expiry length are limited to keep
              the service fast and prevent abuse. Signed-in accounts get somewhat
              higher limits than anonymous use. Fair-usage limits apply to everyone.
            </p>
            <p class="text-muted-foreground">
              We may modify these limits when needed to keep the service available.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">6. Privacy & Encryption</h2>
            <p class="text-muted-foreground">
              Tessil uses end-to-end encryption. Files are encrypted in your
              browser before upload. We don't have the encryption keys:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>We cannot view, access, or recover your files</li>
              <li>If you lose the share link, the files cannot be recovered</li>
              <li>We cannot comply with requests to provide file contents (as we don't have access)</li>
            </ul>
            <p class="text-muted-foreground">
              For more information, please see our <a href="/privacy" class="text-primary hover:underline">Privacy Policy</a>.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">7. Illegal Content & Abuse Reporting</h2>
            <p class="text-muted-foreground">
              Tessil has zero tolerance for illegal content, including but not limited to child sexual
              abuse material (CSAM), terrorism-related content, or any content that violates applicable laws.
            </p>
            <p class="text-muted-foreground">
              End-to-end encryption stops us from viewing file contents. We can
              still act on reports:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Anyone can report abuse via our <a href="/abuse" class="text-primary hover:underline">abuse reporting page</a></li>
              <li>Upon receiving a valid report, we will immediately delete the reported transfer and all associated data</li>
              <li>We will preserve any available metadata (such as IP addresses and timestamps) for law enforcement when legally required</li>
              <li>We cooperate fully with law enforcement investigations in accordance with applicable law</li>
            </ul>
            <p class="text-muted-foreground">
              For urgent matters involving child safety, please contact your local law enforcement
              immediately in addition to reporting to us at
              <a href="mailto:abuse@tessil.app" class="text-primary hover:underline">abuse@tessil.app</a>.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">8. Law Enforcement & Legal Compliance</h2>
            <p class="text-muted-foreground">
              We comply with the EU Digital Services Act and applicable Dutch law. Specifically:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>We will act expeditiously upon receiving notice of illegal content</li>
              <li>We will cooperate with law enforcement authorities when presented with valid legal orders</li>
              <li>We may preserve and disclose available metadata (IP addresses, timestamps, file sizes) in response to lawful requests</li>
              <li>We will delete transfers identified as containing illegal content</li>
            </ul>
            <p class="text-muted-foreground">
              Due to our zero-knowledge architecture, we do not have access to encryption keys or file contents.
              Available metadata is limited to what is described in our <a href="/privacy" class="text-primary hover:underline">Privacy Policy</a>.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">9. Disclaimer of Warranties</h2>
            <p class="text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Implied warranties of merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
              <li>Availability, reliability, or accuracy</li>
            </ul>
            <p class="text-muted-foreground">
              We do not guarantee that the Service will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">10. Limitation of Liability</h2>
            <p class="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TESSIL AND ITS OPERATORS SHALL NOT BE LIABLE FOR:
            </p>
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of data, profits, or business opportunities</li>
              <li>Any damages arising from your use or inability to use the Service</li>
              <li>Any content uploaded or shared by users</li>
              <li>Unauthorized access to or alteration of your transmissions or data</li>
            </ul>
            <p class="text-muted-foreground">
              This limitation applies regardless of the legal theory (contract, tort, or otherwise).
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">11. Indemnification</h2>
            <p class="text-muted-foreground">
              You agree to indemnify and hold harmless Tessil, its operators, and affiliates from any claims,
              damages, losses, or expenses (including legal fees) arising from your use of the Service or
              violation of these Terms.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">12. Service Modifications</h2>
            <p class="text-muted-foreground">
              We reserve the right to modify, suspend, or discontinue the Service (or any part thereof)
              at any time, with or without notice. We shall not be liable to you or any third party for
              any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">13. Governing Law</h2>
            <p class="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the Netherlands,
              without regard to its conflict of law provisions. Any disputes shall be subject to the
              exclusive jurisdiction of the courts in the Netherlands.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">14. Changes to Terms</h2>
            <p class="text-muted-foreground">
              We may update these Terms from time to time. Continued use of the Service after changes
              constitutes acceptance of the new Terms. We encourage you to review this page periodically.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">15. Contact</h2>
            <p class="text-muted-foreground">
              Questions about these Terms:
            </p>
            <p class="text-muted-foreground">
              <a href="mailto:legal@tessil.app" class="text-primary hover:underline">legal@tessil.app</a>
            </p>
          </section>
        </div>
      </Frame.Panel>
    </Frame.Root>

  <SiteFooter current="terms" />
</PageLayout>
