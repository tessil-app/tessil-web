// The form pages after sign-in (/dashboard/forms/*). Words shared with the
// portal pages come from portalsApp.ts. See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  list: {
    seoTitle: "Forms - Tessil",
    title: "Forms",
    tagline: "Questions people answer through a link. Only you can read the answers.",
    newForm: "New form",
    errors: {
      load: "Couldn't load your forms.",
      update: "Couldn't update the form.",
      notSealed:
        "These keys were not sealed by the person who shared the form, so they were refused. Ask them to remove you and invite you again.",
      leave: "Couldn't leave the form.",
      delete: "Couldn't delete the form.",
      cantOpen: "This form could not be opened.",
      templateLimit: "You have as many templates as an account can keep. Delete one when you create a form.",
      templatePaid: "Templates come with the plans that have forms.",
      templateSave: "Couldn't save the template. Try again.",
    },
    templateSaved: (name: string) =>
      `Saved "${name}" as a template. You can pick it the next time you create a form.`,
    needsVault: "Forms need a vault. It holds the keys that open what people answer, so only you can read it.",
    vaultLocked: "Your vault is locked. Form names and links are encrypted, so unlock to see them or to create a form.",
    paidTitle: "Forms are part of the paid plans",
    paidBody:
      "A form is a link where people answer your questions and can add documents, encrypted in their browser so only you can read the answers.",
    emptyTitle: "No forms yet",
    emptyBody: "Create one, share its link, and the answers people send appear here.",
    createFirst: "Create your first form",
    from: (who: string) => `Form from ${who}`,
    locked: "Locked form",
    unreadable: "Unreadable form",
    unreadableNote: (owner: boolean) =>
      `Its keys did not open with your vault. It can only be ${owner ? "deleted" : "left"}.`,
    responses: (n: number) => (n === 1 ? "1 response" : `${n} responses`),
    open: "Open",
    colForm: "Form",
    colResponses: "Responses",
    colLast: "Last response",
    moreFor: (name: string | null) => `More for ${name ?? "this form"}`,
    saveAsTemplate: "Save as template",
    onPlan: (n: number, max: number) => `${n} of ${max} forms on your plan.`,
    deleteTitle: "Delete this form?",
    deleteBody: "The link stops working and every response, with its files, is deleted. This can't be undone.",
    deleteForm: "Delete form",
    templateTitle: "Save as a template",
    templateBody:
      "Keeps this form's questions, texts and language to start new forms from. Responses, the link, the logo and the password are not part of it. It is encrypted like the form itself.",
    templateName: "Name of the template",
    saving: "Saving…",
    saveTemplate: "Save template",
    acceptTitle: "Accept this form?",
    acceptBody: (who: string | null) =>
      `${who ?? "Someone"} shared a form with you. You will be able to read, download and delete the responses people send to it.`,
    declineTitle: "Decline this form?",
    leaveTitle: "Leave this form?",
    leaveBody: "You will no longer see it or the responses sent to it. Its owner can invite you again.",
  },
  responses: {
    seoTitle: (name: string | null) => `${name ?? "Form"} - Tessil`,
    allForms: "All forms",
    lockedBody: "The answers to this form are opened with a key kept in your vault.",
    notFound: "Form not found",
    cantOpen: "This form can't be opened",
    notFoundBody: "It may have been deleted, or you may not have access to it.",
    taglineMember: "Shared with you. Responses are deleted automatically, so export or save what you need to keep.",
    taglineOwner: "Responses are deleted automatically, so export or save what you need to keep.",
    open: "Open",
    editForm: "Edit form",
    readyInvite: (email: string) => `${email} has signed in and is ready. Give them access to share this form.`,
    unreadable: (n: number) =>
      n === 1
        ? "1 response could not be opened with this form's key and is not shown."
        : `${n} responses could not be opened with this form's key and are not shown.`,
    emptyTitle: "No responses yet",
    emptyBody: "Share the form's link. Answers appear here as soon as someone sends them.",
    view: "View",
    tabResponses: "Responses",
    tabSummary: "Summary",
    loadingAll: (n: number) => `Loading every response: ${n} so far…`,
    newestOnly: (n: number) => `Older responses are not loaded, so this counts the newest ${n} only.`,
    unreadAnswers: (n: number) =>
      n === 1
        ? "The answers of 1 response could not be opened, so it counts as not answered here. Reload the page to try again."
        : `The answers of ${n} responses could not be opened, so they count as not answered here. Reload the page to try again.`,
    search: "Search responses",
    searchPlaceholder: "Search answers, reference or file name",
    exporting: "Exporting…",
    exportCsv: "Export CSV",
    answered: "Answered",
    showAll: "Show all responses again",
    yes: "Yes",
    no: "No",
    noMatch: "Nothing matches. Search looks at every answer, the reference and file names.",
    answersUnreadable: "Answers could not be opened",
    colResponse: "Response",
    none: "None",
    downloadFilesOf: (ref: string) => `Download the files of ${ref}`,
    showing: (n: number, total: number, more: boolean) =>
      `Showing ${n} of ${total} ${total === 1 ? "response" : "responses"}${
        more ? ". Older ones are not loaded yet, so search does not cover them. The export does." : "."
      }`,
    exportNote: (n: number) =>
      `${n === 1 ? "1 response has" : `${n} responses have`} an empty row in this export, because the answers could not be opened. Reload the page and export again to retry.`,
    deleteTitle: "Delete this response?",
    deleteBody: "Its answers and files are removed for everyone with access to this form. This can't be undone.",
    deleteResponse: "Delete response",
    errors: {
      load: "Couldn't load this form.",
      loadAll: "Couldn't load every response. Try again.",
      loadEvery: "Couldn't load every response.",
      export: "Couldn't make the export.",
      delete: "Couldn't delete this response.",
    },
  },
  drawer: {
    response: "Response",
    files: "Files",
    answers: "Answers",
    wordingDiffers: "Wording differs",
    nowAsks: (asked: string) =>
      `The form now asks: "${asked}". The wording above came with the response, from the sender's browser.`,
    noFile: "No file",
    notAnswered: "Not answered",
    unreadable: "The answers could not be opened. Reload the page to try again.",
    noAnswers: "No answers came with this response.",
    otherFiles: "Other files",
    recordBody:
      "A text file with the reference, every answer, the file names and the deletion date. The person who answered has the same reference on their confirmation.",
    downloadAll: (n: number) => `Download all ${n} files`,
    downloadFile: "Download file",
  },

  summary: {
    noLonger: "No longer asked",
    answered: (n: number, total: number, files: number) =>
      `${n} of ${total} answered${files > 0 ? `, ${files === 1 ? "1 file" : `${files} files`}` : ""}`,
    optionAria: (label: string, n: number, total: number) => `${label}: ${n} of ${total}. Show these responses`,
    removed: "removed",
    several: "People could pick several, so these add up to more than 100%.",
    newest: (n: number) => `The newest ${n}. Every answer is in the responses and the export.`,
  },

  csv: { reference: "Reference", received: "Received" },
};

const nl: typeof en = {
  list: {
    seoTitle: "Formulieren - Tessil",
    title: "Formulieren",
    tagline: "Vragen die mensen via een link beantwoorden. Alleen jij kunt de antwoorden lezen.",
    newForm: "Nieuw formulier",
    errors: {
      load: "Je formulieren konden niet worden geladen.",
      update: "Het formulier kon niet worden bijgewerkt.",
      notSealed:
        "Deze sleutels zijn niet verzegeld door degene die het formulier deelde, dus ze zijn geweigerd. Vraag of diegene je verwijdert en opnieuw uitnodigt.",
      leave: "Het formulier kon niet worden verlaten.",
      delete: "Het formulier kon niet worden verwijderd.",
      cantOpen: "Dit formulier kon niet worden geopend.",
      templateLimit:
        "Je hebt zoveel sjablonen als een account kan bewaren. Verwijder er een als je een formulier maakt.",
      templatePaid: "Sjablonen horen bij de abonnementen met formulieren.",
      templateSave: "Het sjabloon kon niet worden opgeslagen. Probeer het opnieuw.",
    },
    templateSaved: (name: string) =>
      `"${name}" is als sjabloon opgeslagen. Je kunt het kiezen als je weer een formulier maakt.`,
    needsVault:
      "Formulieren hebben een kluis nodig. Daarin zitten de sleutels die openen wat mensen antwoorden, zodat alleen jij het kunt lezen.",
    vaultLocked:
      "Je kluis is vergrendeld. Namen en links van formulieren zijn versleuteld: ontgrendel om ze te zien of om een formulier te maken.",
    paidTitle: "Formulieren horen bij de betaalde abonnementen",
    paidBody:
      "Een formulier is een link waar mensen je vragen beantwoorden en documenten kunnen toevoegen, versleuteld in hun browser zodat alleen jij de antwoorden kunt lezen.",
    emptyTitle: "Nog geen formulieren",
    emptyBody: "Maak er een, deel de link, en de antwoorden die mensen sturen verschijnen hier.",
    createFirst: "Maak je eerste formulier",
    from: (who: string) => `Formulier van ${who}`,
    locked: "Vergrendeld formulier",
    unreadable: "Onleesbaar formulier",
    unreadableNote: (owner: boolean) =>
      `De sleutels gingen niet open met je kluis. Je kunt het alleen ${owner ? "verwijderen" : "verlaten"}.`,
    responses: (n: number) => (n === 1 ? "1 inzending" : `${n} inzendingen`),
    open: "Open",
    colForm: "Formulier",
    colResponses: "Inzendingen",
    colLast: "Laatste inzending",
    moreFor: (name: string | null) => `Meer voor ${name ?? "dit formulier"}`,
    saveAsTemplate: "Opslaan als sjabloon",
    onPlan: (n: number, max: number) => `${n} van ${max} formulieren op je abonnement.`,
    deleteTitle: "Dit formulier verwijderen?",
    deleteBody:
      "De link stopt en elke inzending wordt met de bestanden verwijderd. Dit kan niet ongedaan worden gemaakt.",
    deleteForm: "Formulier verwijderen",
    templateTitle: "Opslaan als sjabloon",
    templateBody:
      "Bewaart de vragen, teksten en taal van dit formulier om nieuwe formulieren mee te beginnen. Antwoorden, de link, het logo en het wachtwoord horen er niet bij. Het is versleuteld zoals het formulier zelf.",
    templateName: "Naam van het sjabloon",
    saving: "Opslaan…",
    saveTemplate: "Sjabloon opslaan",
    acceptTitle: "Dit formulier accepteren?",
    acceptBody: (who: string | null) =>
      `${who ?? "Iemand"} heeft een formulier met je gedeeld. Je kunt de antwoorden die mensen sturen lezen, downloaden en verwijderen.`,
    declineTitle: "Dit formulier afwijzen?",
    leaveTitle: "Dit formulier verlaten?",
    leaveBody: "Je ziet het niet meer, en ook de antwoorden niet. De eigenaar kan je opnieuw uitnodigen.",
  },
  responses: {
    seoTitle: (name: string | null) => `${name ?? "Formulier"} - Tessil`,
    allForms: "Alle formulieren",
    lockedBody: "De antwoorden op dit formulier worden geopend met een sleutel uit je kluis.",
    notFound: "Formulier niet gevonden",
    cantOpen: "Dit formulier kan niet worden geopend",
    notFoundBody: "Misschien is het verwijderd, of heb je er geen toegang toe.",
    taglineMember:
      "Met je gedeeld. Inzendingen worden vanzelf verwijderd, dus exporteer of bewaar wat je wilt houden.",
    taglineOwner: "Inzendingen worden vanzelf verwijderd, dus exporteer of bewaar wat je wilt houden.",
    open: "Open",
    editForm: "Formulier bewerken",
    readyInvite: (email: string) => `${email} is ingelogd en klaar. Geef toegang om dit formulier te delen.`,
    unreadable: (n: number) =>
      n === 1
        ? "1 inzending kon niet worden geopend met de sleutel van dit formulier en wordt niet getoond."
        : `${n} inzendingen konden niet worden geopend met de sleutel van dit formulier en worden niet getoond.`,
    emptyTitle: "Nog geen inzendingen",
    emptyBody: "Deel de link van het formulier. Antwoorden verschijnen hier zodra iemand ze stuurt.",
    view: "Weergave",
    tabResponses: "Inzendingen",
    tabSummary: "Overzicht",
    loadingAll: (n: number) => `Alle inzendingen laden: ${n} tot nu toe…`,
    newestOnly: (n: number) => `Oudere inzendingen zijn niet geladen, dus dit telt alleen de nieuwste ${n}.`,
    unreadAnswers: (n: number) =>
      n === 1
        ? "De antwoorden van 1 inzending konden niet worden geopend, dus die telt hier als niet beantwoord. Laad de pagina opnieuw om het nog eens te proberen."
        : `De antwoorden van ${n} inzendingen konden niet worden geopend, dus die tellen hier als niet beantwoord. Laad de pagina opnieuw om het nog eens te proberen.`,
    search: "Inzendingen zoeken",
    searchPlaceholder: "Zoek in antwoorden, kenmerk of bestandsnaam",
    exporting: "Exporteren…",
    exportCsv: "CSV exporteren",
    answered: "Antwoord",
    showAll: "Weer alle inzendingen tonen",
    yes: "Ja",
    no: "Nee",
    noMatch: "Niets gevonden. Zoeken kijkt naar elk antwoord, het kenmerk en bestandsnamen.",
    answersUnreadable: "Antwoorden konden niet worden geopend",
    colResponse: "Inzending",
    none: "Geen",
    downloadFilesOf: (ref: string) => `Bestanden van ${ref} downloaden`,
    showing: (n: number, total: number, more: boolean) =>
      `${n} van ${total} ${total === 1 ? "inzending" : "inzendingen"} getoond${
        more ? ". Oudere zijn nog niet geladen, dus zoeken dekt ze niet. De export wel." : "."
      }`,
    exportNote: (n: number) =>
      `${n === 1 ? "1 inzending heeft" : `${n} inzendingen hebben`} een lege regel in deze export, omdat de antwoorden niet konden worden geopend. Laad de pagina opnieuw en exporteer nog eens.`,
    deleteTitle: "Deze inzending verwijderen?",
    deleteBody:
      "De antwoorden en bestanden verdwijnen voor iedereen met toegang tot dit formulier. Dit kan niet ongedaan worden gemaakt.",
    deleteResponse: "Inzending verwijderen",
    errors: {
      load: "Dit formulier kon niet worden geladen.",
      loadAll: "Niet alle inzendingen konden worden geladen. Probeer het opnieuw.",
      loadEvery: "Niet alle inzendingen konden worden geladen.",
      export: "De export kon niet worden gemaakt.",
      delete: "Deze inzending kon niet worden verwijderd.",
    },
  },
  drawer: {
    response: "Inzending",
    files: "Bestanden",
    answers: "Antwoorden",
    wordingDiffers: "Andere formulering",
    nowAsks: (asked: string) =>
      `Het formulier vraagt nu: "${asked}". De formulering hierboven kwam mee met de inzending, uit de browser van de afzender.`,
    noFile: "Geen bestand",
    notAnswered: "Niet beantwoord",
    unreadable: "De antwoorden konden niet worden geopend. Laad de pagina opnieuw om het nog eens te proberen.",
    noAnswers: "Bij deze inzending zaten geen antwoorden.",
    otherFiles: "Andere bestanden",
    recordBody:
      "Een tekstbestand met het kenmerk, elk antwoord, de bestandsnamen en de verwijderdatum. Wie het formulier invulde, heeft hetzelfde kenmerk op de bevestiging.",
    downloadAll: (n: number) => `Alle ${n} bestanden downloaden`,
    downloadFile: "Bestand downloaden",
  },

  summary: {
    noLonger: "Niet meer gevraagd",
    answered: (n: number, total: number, files: number) =>
      `${n} van ${total} beantwoord${files > 0 ? `, ${files === 1 ? "1 bestand" : `${files} bestanden`}` : ""}`,
    optionAria: (label: string, n: number, total: number) => `${label}: ${n} van ${total}. Toon deze inzendingen`,
    removed: "verwijderd",
    several: "Mensen konden er meerdere kiezen, dus samen is dit meer dan 100%.",
    newest: (n: number) => `De nieuwste ${n}. Elk antwoord staat bij de inzendingen en in de export.`,
  },

  csv: { reference: "Kenmerk", received: "Ontvangen" },
};

export const formsAppMessages: Record<Locale, typeof en> = { en, nl };
