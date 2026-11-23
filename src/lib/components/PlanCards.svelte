<script lang="ts">
  // The three plans side by side. `compact` is the short form for the
  // homepage; the full form lists what each includes and can start a purchase.

  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { plansFor, priceLabel, priceUnit, type Cycle, type PlanId } from "$lib/config/plans";
  import { type Locale } from "$lib/i18n/locale";
import { hrefFor } from "$lib/i18n/paths";
  import { cn } from "$lib/utils";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";

  interface Props {
    cycle?: Cycle;
    compact?: boolean;
    /** The signed-in account's plan, if any. */
    current?: string | null;
    /** Whether that plan is paid for through a subscription. Null while unknown. */
    billed?: boolean | null;
    /** The plan a purchase is being started for. */
    busy?: PlanId | null;
    onChoose?: (plan: "pro" | "max") => void;
    onManage?: () => void;
    locale?: Locale;
  }

  let { cycle = "monthly", compact = false, current = null, billed = null, busy = null, onChoose, onManage, locale = "en" }: Props =
    $props();

  const plans = $derived(plansFor(locale));
  const t = $derived(
    locale === "nl"
      ? {
          yours: "Jouw abonnement",
          popular: "Meest gekozen",
          start: "Begin met versturen",
          granted: "Aan je account gegeven. Er wordt niets in rekening gebracht.",
          manage: "Beheer je abonnement",
          change: "Wijzig abonnement",
          wait: "Een moment…",
          get: (name: string) => `Kies ${name}`,
        }
      : {
          yours: "Your plan",
          popular: "Most people",
          start: "Start sending",
          granted: "Given to your account. Nothing is billed.",
          manage: "Manage your plan",
          change: "Change plan",
          wait: "One moment…",
          get: (name: string) => `Get ${name}`,
        },
  );

  const onPaidPlan = $derived(current === "pro" || current === "max");
  // A plan set by hand has no subscription to manage.
  const granted = $derived(onPaidPlan && billed === false);
</script>

<div class="grid gap-4 md:grid-cols-3">
  {#each plans as plan (plan.id)}
    {@const featured = plan.id === "pro"}
    <div
      class={cn(
        "flex flex-col rounded-2xl bg-card p-6 sm:p-7",
        featured ? "border-2 border-primary" : "border border-border",
      )}
    >
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold text-foreground">{plan.name}</h3>
        {#if current === plan.id}
          <Badge tone="success">{t.yours}</Badge>
        {:else if featured}
          <Badge tone="info">{t.popular}</Badge>
        {/if}
      </div>
      <p class="mt-1 text-sm text-muted-foreground">{plan.pitch}</p>

      <p class="mt-5 flex items-baseline gap-2">
        <span class="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl" style="letter-spacing: -0.03em">
          {priceLabel(plan, cycle)}
        </span>
        <span class="text-sm text-muted-foreground">{priceUnit(plan, cycle, locale)}</span>
      </p>

      {#if !compact}
        <div class="mt-6">
          {#if plan.id === "free"}
            <Button href={hrefFor("/", locale)} variant="secondary">{t.start}</Button>
          {:else if granted && current === plan.id}
            <p class="flex min-h-10 items-center text-sm text-muted-foreground">
              {t.granted}
            </p>
          {:else if onPaidPlan && !granted}
            <Button variant="secondary" onclick={onManage} disabled={busy !== null || billed === null}>
              {current === plan.id ? t.manage : t.change}
            </Button>
          {:else}
            <Button
              variant={featured ? "primary" : "secondary"}
              onclick={() => onChoose?.(plan.id as "pro" | "max")}
              disabled={busy !== null}
            >
              {#if busy === plan.id}
                <Spinner aria-hidden="true" />
                {t.wait}
              {:else}
                {t.get(plan.name)}
              {/if}
            </Button>
          {/if}
        </div>

        <div class="mt-7 space-y-3 border-t border-border pt-6">
          {#if plan.lead}
            <p class="text-sm font-medium text-foreground">{plan.lead}</p>
          {/if}
          <ul class="space-y-2.5">
            {#each plan.features as feature (feature)}
              <li class="flex items-start gap-2.5 text-sm text-foreground">
                <IconCheckRegular class="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            {/each}
          </ul>
        </div>
      {:else}
        <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
          {plan.features.slice(0, 2).join(". ")}.
        </p>
      {/if}
    </div>
  {/each}
</div>
