<script lang="ts">
  // The real form editor, for anyone, with nothing saved on our side.
  // "Create form" keeps the form in this browser and leads to a plan; the
  // new-form page picks it up from there.

  import { goto } from "$app/navigation";
  import FormEditor from "$lib/components/form/FormEditor.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { FORM_QUESTIONS_PRO } from "$lib/form/questions";
  import { keepTryout, readTryout } from "$lib/form/tryout";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { DEFAULT_LOCALE } from "$lib/i18n/locale";
  import { formsAppMessages } from "$lib/i18n/messages/formsApp";
  import { hrefFor } from "$lib/i18n/paths";
  import { untrack } from "svelte";
  import type { PortalSettings } from "$lib/portal/keys";
  import { auth } from "$lib/stores/auth.svelte";

  const kept = readTryout();

  // The reader's language: the editor's own words, and the example form.
  const locale = $derived(appLocale());
  const start = untrack(() => appLocale());
  const x = formsAppMessages[start].tryout;

  const initial: PortalSettings = {
    title: kept?.title ?? x.title,
    lang: kept?.lang ?? start,
    checklist: [],
    message: kept?.message ?? x.message,
    thanks: kept?.thanks ?? x.thanks,
    fieldLabel: "",
    logo: null,
    twoWay: false,
    returns: [],
    questions: kept?.questions ?? [
      { id: "try001", type: "short", label: x.name, required: true },
      { id: "try002", type: "choice", label: x.who, options: [...x.whoOptions], required: true },
      { id: "try003", type: "long", label: x.help, hint: x.helpHint },
      { id: "try004", type: "date", label: x.start },
      { id: "try005", type: "file", label: x.id, hint: x.idHint },
    ],
    closesAt: null,
    notifyOnDelivery: false,
    hasPassword: false,
    newPassword: "",
  };

  async function create(settings: PortalSettings) {
    keepTryout({
      title: settings.title,
      lang: settings.lang ?? DEFAULT_LOCALE,
      message: settings.message,
      thanks: settings.thanks,
      questions: settings.questions ?? [],
    });
    await goto(auth.user ? "/dashboard/forms/new" : `${hrefFor("/pricing", locale)}?kept=form`);
  }
</script>

<Seo title={formsAppMessages[locale].tryout.seoTitle} robots="noindex" />

<FormEditor
  {initial}
  mode="create"
  onSave={create}
  cancelHref={hrefFor("/forms", locale)}
  questionLimit={FORM_QUESTIONS_PRO}
  uiLocale={locale}
/>
