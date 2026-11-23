// The vault: setting it up (/setup/vault) and its settings. See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  strength: {
    hint: (min: number) => `At least ${min} characters, and not easy to guess`,
    checking: "Checking…",
    scores: ["Very weak", "Weak", "Fair", "Strong", "Very strong"],
    more: (n: number) => (n === 1 ? "1 more character" : `${n} more characters`),
    ok: "OK",
    noMatch: "Passwords don't match yet.",
  },

  phrase: {
    hidden: "Phrase is hidden. Reveal it when you're ready to write it down.",
    reveal: "Reveal",
    copied: "Copied",
    copy: "Copy",
    download: "Download .txt",
    hide: "Hide",
    notYet: "Not yet",
    file: (phrase: string) =>
      "Tessil recovery phrase\n" +
      "Keep this somewhere safe. If you forget your vault password, this\n" +
      "is the only way to recover access to your files.\n\n" +
      phrase +
      "\n",
  },

  settings: {
    holdTitle: "Stay unlocked on this device",
    holdBody:
      "How long your vault stays open in this browser before it asks again. Anyone using this device while it is open can see the names and links of what you sent, so pick a short time on a shared or work computer.",
    holdLabel: "Stay unlocked for",
    days: (d: number) => (d === 1 ? "1 day" : `${d} days`),
    openUntil: (when: string) =>
      `Open now, until ${when}. Locking it from the account menu closes it at once.`,
    locked: "Locked now. The choice applies the next time you unlock it here.",
    changeTitle: "Change vault password",
    addTitle: "Add a vault password",
    changeBody:
      "Your recovery phrase and any passkeys keep working after this. Forgot the password? Use your recovery phrase below to set a new one.",
    addBody:
      "Your vault opens with a passkey and your recovery phrase. A password is optional: it gives you another way in on a device without your passkey.",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmNew: "Confirm new password",
    sameAsCurrent: "That's the same as your current password.",
    changeFailed: "Couldn't change password",
    changeFailedBody: "Couldn't change your password.",
    updatedTitle: "Password updated",
    updatedBody: "Your new password is now in effect on every device. The old one no longer works.",
    updating: "Updating password…",
    update: "Update password",
    add: "Add password",
    phraseTitle: "Recovery phrase",
    phraseBody:
      "Regenerating retires the old 12-word phrase immediately. Use this if you think the previous phrase was seen by someone else.",
    confirmPassword: "Confirm your password",
    regenFailed: "Couldn't regenerate phrase",
    regenFailedBody: "Couldn't regenerate the phrase.",
    generating: "Generating…",
    generate: "Generate a new phrase",
    saveNewTitle: "Save the new phrase before leaving this page",
    saveNewBody:
      "The old phrase no longer works. If you lose this one and forget your password, your vault is unrecoverable.",
    savedNew: "I've saved the new phrase",
    revealFirst: "Reveal the phrase first: we need you to look at it before confirming.",
    modalTitle: "Have you saved the new phrase?",
    modalBody:
      "The old phrase is already retired. Without this new one, a forgotten password means losing access to your vault.",
    modalCheck:
      "I've written down or stored the new 12-word recovery phrase somewhere I can get back to. I understand Tessil can't recover it for me.",
    done: "Done",
  },

  setup: {
    seoTitle: "Set up your vault - Tessil",
    title: "Set up your vault",
    phraseTitle: "Save your recovery phrase",
    taglinePhrasePasskey:
      "Write these 12 words down somewhere safe. They're the only way back in if you lose your passkey.",
    taglinePhrasePassword:
      "Write these 12 words down somewhere safe. They're the only way back in if you forget your password.",
    taglinePassword: "Pick a long password you'll remember: we can't reset it.",
    taglineMethod: "A vault keeps the names and links of what you send, encrypted so only you can read them.",
    dismissed: "The passkey prompt was dismissed. Try again, or use a password.",
    cannotProtect:
      "This passkey can't protect a vault. Use a password instead; you can still sign in with the passkey.",
    passkeyFailed: "Couldn't use a passkey here. Use a password instead.",
    setupFailedBody: "Couldn't set up the vault. Try again.",
    saveFailed: "Couldn't save the vault. Try again.",
    waitingPasskey: "Waiting for your passkey…",
    withPasskey: "Protect it with a passkey",
    passkeyNote:
      "Your fingerprint, face or device PIN opens the vault. No password to remember. You may be asked twice: once to create the passkey, once to use it.",
    or: "or",
    usePassword: "Use a password instead",
    notNow: "Not now",
    later: "you can send without a vault and set one up later.",
    vaultPassword: "Vault password",
    confirmPassword: "Confirm password",
    setupFailed: "Setup failed",
    noResetTitle: "Pick wisely: there's no reset link.",
    noResetBody:
      "Your password never leaves this browser. We can't email you a reset because we never see it. If you forget it, the recovery phrase on the next screen is your only way back in.",
    settingUp: "Setting up your vault…",
    continue: "Continue",
    saveTitle: "Save this phrase before continuing",
    saveBody:
      "We won't show it again. Anyone with these 12 words can unlock your vault: keep them somewhere only you can reach.",
    saved: "I've saved my recovery phrase",
    revealFirst: "Reveal the phrase first: we need you to look at it before you continue.",
    modalTitle: "Have you saved your recovery phrase?",
    modalBody:
      "We won't show it again. Without it, a forgotten password means losing access to every file in your vault.",
    modalCheck:
      "I've written down or stored my 12-word recovery phrase somewhere I can get back to. I understand Tessil can't recover it for me.",
    saving: "Saving…",
    toTransfers: "Continue to your transfers",
  },
};

const nl: typeof en = {
  strength: {
    hint: (min: number) => `Minstens ${min} tekens, en niet makkelijk te raden`,
    checking: "Controleren…",
    scores: ["Heel zwak", "Zwak", "Redelijk", "Sterk", "Heel sterk"],
    more: (n: number) => (n === 1 ? "nog 1 teken" : `nog ${n} tekens`),
    ok: "OK",
    noMatch: "De wachtwoorden komen nog niet overeen.",
  },

  phrase: {
    hidden: "De zin is verborgen. Toon hem als je klaar bent om hem op te schrijven.",
    reveal: "Tonen",
    copied: "Gekopieerd",
    copy: "Kopiëren",
    download: "Download .txt",
    hide: "Verbergen",
    notYet: "Nog niet",
    file: (phrase: string) =>
      "Tessil-herstelzin\n" +
      "Bewaar deze op een veilige plek. Vergeet je je kluiswachtwoord, dan is dit\n" +
      "de enige manier om weer bij je bestanden te komen.\n\n" +
      phrase +
      "\n",
  },

  settings: {
    holdTitle: "Ontgrendeld blijven op dit apparaat",
    holdBody:
      "Hoe lang je kluis in deze browser open blijft voordat hij er weer om vraagt. Wie dit apparaat gebruikt terwijl hij open is, ziet de namen en links van wat je verstuurde. Kies dus een korte tijd op een gedeelde of werkcomputer.",
    holdLabel: "Ontgrendeld blijven",
    days: (d: number) => (d === 1 ? "1 dag" : `${d} dagen`),
    openUntil: (when: string) =>
      `Nu open, tot ${when}. Vergrendelen via het accountmenu sluit hem meteen.`,
    locked: "Nu vergrendeld. De keuze geldt de volgende keer dat je hem hier ontgrendelt.",
    changeTitle: "Kluiswachtwoord wijzigen",
    addTitle: "Kluiswachtwoord toevoegen",
    changeBody:
      "Je herstelzin en passkeys blijven hierna werken. Wachtwoord vergeten? Stel met je herstelzin hieronder een nieuw in.",
    addBody:
      "Je kluis opent met een passkey en je herstelzin. Een wachtwoord is optioneel: het geeft je nog een manier om erin te komen op een apparaat zonder je passkey.",
    currentPassword: "Huidig wachtwoord",
    newPassword: "Nieuw wachtwoord",
    confirmNew: "Herhaal nieuw wachtwoord",
    sameAsCurrent: "Dat is hetzelfde als je huidige wachtwoord.",
    changeFailed: "Wachtwoord niet gewijzigd",
    changeFailedBody: "Je wachtwoord kon niet worden gewijzigd.",
    updatedTitle: "Wachtwoord gewijzigd",
    updatedBody: "Je nieuwe wachtwoord geldt nu op elk apparaat. Het oude werkt niet meer.",
    updating: "Wachtwoord wijzigen…",
    update: "Wachtwoord wijzigen",
    add: "Wachtwoord toevoegen",
    phraseTitle: "Herstelzin",
    phraseBody:
      "Een nieuwe zin maakt de oude zin van 12 woorden meteen ongeldig. Doe dit als je denkt dat iemand anders de vorige heeft gezien.",
    confirmPassword: "Bevestig je wachtwoord",
    regenFailed: "Geen nieuwe zin gemaakt",
    regenFailedBody: "Er kon geen nieuwe zin worden gemaakt.",
    generating: "Maken…",
    generate: "Maak een nieuwe zin",
    saveNewTitle: "Bewaar de nieuwe zin voordat je deze pagina verlaat",
    saveNewBody:
      "De oude zin werkt niet meer. Raak je deze kwijt en vergeet je je wachtwoord, dan is je kluis niet meer te openen.",
    savedNew: "Ik heb de nieuwe zin bewaard",
    revealFirst: "Toon de zin eerst: we willen dat je hem gezien hebt voordat je bevestigt.",
    modalTitle: "Heb je de nieuwe zin bewaard?",
    modalBody:
      "De oude zin is al ongeldig. Zonder deze nieuwe betekent een vergeten wachtwoord dat je niet meer in je kluis komt.",
    modalCheck:
      "Ik heb de nieuwe herstelzin van 12 woorden opgeschreven of opgeslagen op een plek waar ik weer bij kan. Ik begrijp dat Tessil hem niet voor me kan herstellen.",
    done: "Klaar",
  },

  setup: {
    seoTitle: "Je kluis instellen - Tessil",
    title: "Je kluis instellen",
    phraseTitle: "Bewaar je herstelzin",
    taglinePhrasePasskey:
      "Schrijf deze 12 woorden op en bewaar ze veilig. Ze zijn de enige weg terug als je je passkey kwijtraakt.",
    taglinePhrasePassword:
      "Schrijf deze 12 woorden op en bewaar ze veilig. Ze zijn de enige weg terug als je je wachtwoord vergeet.",
    taglinePassword: "Kies een lang wachtwoord dat je onthoudt: wij kunnen het niet resetten.",
    taglineMethod:
      "Een kluis bewaart de namen en links van wat je verstuurt, versleuteld zodat alleen jij ze kunt lezen.",
    dismissed: "De passkey-vraag is weggeklikt. Probeer het opnieuw, of gebruik een wachtwoord.",
    cannotProtect:
      "Deze passkey kan geen kluis beveiligen. Gebruik een wachtwoord; inloggen met de passkey blijft werken.",
    passkeyFailed: "Een passkey werkt hier niet. Gebruik een wachtwoord.",
    setupFailedBody: "De kluis kon niet worden ingesteld. Probeer het opnieuw.",
    saveFailed: "De kluis kon niet worden opgeslagen. Probeer het opnieuw.",
    waitingPasskey: "Wachten op je passkey…",
    withPasskey: "Beveilig hem met een passkey",
    passkeyNote:
      "Je vingerafdruk, gezicht of apparaatpincode opent de kluis. Geen wachtwoord om te onthouden. Misschien wordt het twee keer gevraagd: een keer om de passkey te maken, een keer om hem te gebruiken.",
    or: "of",
    usePassword: "Gebruik een wachtwoord",
    notNow: "Niet nu",
    later: "je kunt zonder kluis versturen en er later een instellen.",
    vaultPassword: "Kluiswachtwoord",
    confirmPassword: "Herhaal wachtwoord",
    setupFailed: "Instellen mislukt",
    noResetTitle: "Kies goed: er is geen resetlink.",
    noResetBody:
      "Je wachtwoord verlaat deze browser nooit. We kunnen je geen reset mailen, want we zien het nooit. Vergeet je het, dan is de herstelzin op het volgende scherm de enige weg terug.",
    settingUp: "Je kluis wordt ingesteld…",
    continue: "Doorgaan",
    saveTitle: "Bewaar deze zin voordat je verdergaat",
    saveBody:
      "We tonen hem niet nog eens. Iedereen met deze 12 woorden kan je kluis openen: bewaar ze waar alleen jij erbij kunt.",
    saved: "Ik heb mijn herstelzin bewaard",
    revealFirst: "Toon de zin eerst: we willen dat je hem gezien hebt voordat je verdergaat.",
    modalTitle: "Heb je je herstelzin bewaard?",
    modalBody:
      "We tonen hem niet nog eens. Zonder de zin betekent een vergeten wachtwoord dat je bij geen enkel bestand in je kluis meer kunt.",
    modalCheck:
      "Ik heb mijn herstelzin van 12 woorden opgeschreven of opgeslagen op een plek waar ik weer bij kan. Ik begrijp dat Tessil hem niet voor me kan herstellen.",
    saving: "Opslaan…",
    toTransfers: "Door naar je transfers",
  },
};

export const vaultMessages: Record<Locale, typeof en> = { en, nl };
