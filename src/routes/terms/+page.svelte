<script lang="ts">
  import * as Frame from "$lib/components/frame";
</script>

<svelte:head>
  <title>Terms of Service - JTransfer</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
  <div class="max-w-3xl mx-auto px-4 py-12">
    <div class="text-center mb-8">
      <a href="/" class="text-3xl font-bold mb-2 hover:text-primary transition-colors">JTransfer</a>
      <p class="text-muted-foreground">Terms of Service</p>
    </div>

    <Frame.Root>
      <Frame.Panel>
        <div class="prose prose-invert max-w-none space-y-6">
          <p class="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p class="text-muted-foreground">
              By accessing or using JTransfer ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p class="text-muted-foreground">
              JTransfer is a free, end-to-end encrypted file sharing service that allows users to temporarily
              share files with others. Files are encrypted in your browser before upload and automatically
              deleted after 1 or 3 days.
            </p>
            <p class="text-muted-foreground">
              The Service is provided free of charge. Optional donations via Ko-fi are welcomed but do not
              grant any additional rights, features, or guarantees. Donations are non-refundable and processed
              entirely by Ko-fi under their own terms and privacy policy.
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
            <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Maximum file size: 1 GB per file</li>
              <li>Maximum total upload: 1 GB per transfer</li>
              <li>File retention: 1 or 3 days (automatically deleted)</li>
              <li>Fair usage limits apply to prevent abuse</li>
            </ul>
            <p class="text-muted-foreground">
              We reserve the right to modify these limits at any time to ensure service availability.
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-foreground">6. Privacy & Encryption</h2>
            <p class="text-muted-foreground">
              JTransfer uses end-to-end encryption. Files are encrypted in your browser before upload,
              and we do not have access to the encryption keys. This means:
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
              JTransfer has zero tolerance for illegal content, including but not limited to child sexual
              abuse material (CSAM), terrorism-related content, or any content that violates applicable laws.
            </p>
            <p class="text-muted-foreground">
              While our end-to-end encryption prevents us from viewing file contents, we provide
              mechanisms to act on reported content:
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
              <a href="mailto:abuse@jimmyverburgt.com" class="text-primary hover:underline">abuse@jimmyverburgt.com</a>.
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
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, JTRANSFER AND ITS OPERATORS SHALL NOT BE LIABLE FOR:
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
              You agree to indemnify and hold harmless JTransfer, its operators, and affiliates from any claims,
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
              If you have any questions about these Terms, please contact us at:
            </p>
            <p class="text-muted-foreground">
              Email: <a href="mailto:legal@jimmyverburgt.com" class="text-primary hover:underline">legal@jimmyverburgt.com</a>
            </p>
          </section>
        </div>
      </Frame.Panel>
    </Frame.Root>

    <div class="mt-8 text-center">
      <a href="/" class="text-sm text-muted-foreground hover:text-foreground">
        Back to JTransfer
      </a>
    </div>
  </div>
</div>
