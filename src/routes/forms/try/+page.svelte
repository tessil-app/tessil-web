<script lang="ts">
  // The real form editor, for anyone, with nothing saved on our side.
  // "Create form" keeps the form in this browser and leads to a plan; the
  // new-form page picks it up from there.

  import { goto } from "$app/navigation";
  import FormEditor from "$lib/components/form/FormEditor.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { keepTryout, readTryout } from "$lib/form/tryout";
  import { DEFAULT_LOCALE } from "$lib/i18n/locale";
  import type { PortalSettings } from "$lib/portal/keys";
  import { auth } from "$lib/stores/auth.svelte";

  const kept = readTryout();

  const initial: PortalSettings = {
    title: kept?.title ?? "New client intake",
    lang: DEFAULT_LOCALE,
    checklist: [],
    message: kept?.message ?? "A few questions before our first call. It takes about two minutes.",
    thanks: kept?.thanks ?? "Thank you. We will be in touch within two working days.",
    fieldLabel: "",
    logo: null,
    twoWay: false,
    returns: [],
    questions: kept?.questions ?? [
      { id: "try001", type: "short", label: "Your name", required: true },
      { id: "try002", type: "choice", label: "Are you here for yourself or a business?", options: ["Myself", "A business"], required: true },
      { id: "try003", type: "long", label: "What can we help you with?", hint: "A few lines is enough." },
      { id: "try004", type: "date", label: "When would you like to start?" },
      { id: "try005", type: "file", label: "A copy of your ID", hint: "A photo is fine." },
    ],
    closesAt: null,
    notifyOnDelivery: false,
    hasPassword: false,
    newPassword: "",
  };

  async function create(settings: PortalSettings) {
    keepTryout({
      title: settings.title,
      message: settings.message,
      thanks: settings.thanks,
      questions: settings.questions ?? [],
    });
    await goto(auth.user ? "/dashboard/forms/new" : "/pricing");
  }
</script>

<Seo title="Try the form editor - Tessil" robots="noindex" />

<FormEditor {initial} mode="create" onSave={create} cancelHref="/forms" questionLimit={10} />
