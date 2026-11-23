// The comparisons list's text. See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  seoTitle: "Tessil compared with other tools for sending and receiving files",
  description:
    "How Tessil compares to WeTransfer, Proton Drive, Zivver, Dropbox file requests, Google Forms, Typeform and others for private, end-to-end encrypted file transfer, portals and forms.",
  title: "How Tessil compares",
  tagline:
    "Tessil encrypts in your browser before anything is uploaded, and the key never reaches our servers. Here is how that stacks up against the tools people use today.",
  groups: {
    send: "Sending files",
    portal: "Receiving files",
    form: "Forms",
  },
  read: "Read the comparison",
  newBefore: "New to Tessil?",
  send: "Send a file",
  newMiddle: ", no account needed, or read the",
  security: "security overview",
};

const nl: typeof en = {
  seoTitle: "Tessil vergeleken met andere tools om bestanden te versturen en te ontvangen",
  description:
    "Zo verhoudt Tessil zich tot WeTransfer, Zivver, Dropbox-bestandsverzoeken, Google Forms, Typeform en anderen voor privé, end-to-end versleuteld bestanden versturen, portalen en formulieren.",
  title: "Hoe Tessil zich verhoudt",
  tagline:
    "Tessil versleutelt in je browser voordat er iets wordt geüpload, en de sleutel komt nooit op onze servers. Zo verhoudt dat zich tot de tools die mensen nu gebruiken.",
  groups: {
    send: "Bestanden versturen",
    portal: "Bestanden ontvangen",
    form: "Formulieren",
  },
  read: "Lees de vergelijking",
  newBefore: "Nieuw bij Tessil?",
  send: "Verstuur een bestand",
  newMiddle: ", zonder account, of lees het",
  security: "beveiligingsoverzicht",
};

export const compareIndexMessages: Record<Locale, typeof en> = { en, nl };
