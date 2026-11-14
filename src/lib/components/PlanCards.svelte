<script lang="ts">
  // The three plans side by side. `compact` is the short form for the
  // homepage; the full form lists what each includes and can start a purchase.

  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { PLANS, priceLabel, priceUnit, type Cycle, type PlanId } from "$lib/config/plans";
  import { cn } from "$lib/utils";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";

  interface Props {
    cycle?: Cycle;
    compact?: boolean;
    /** The signed-in account's plan, if any. */
    current?: string | null;
    /** The plan a purchase is being started for. */
    busy?: PlanId | null;
    onChoose?: (plan: "pro" | "max") => void;
    onManage?: () => void;
  }

  let { cycle = "monthly", compact = false, current = null, busy = null, onChoose, onManage }: Props = $props();

  const onPaidPlan = $derived(current === "pro" || current === "max");
</script>

<div class="grid gap-4 md:grid-cols-3">
  {#each PLANS as plan (plan.id)}
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
          <Badge tone="success">Your plan</Badge>
        {:else if featured}
          <Badge tone="info">Most people</Badge>
        {/if}
      </div>
      <p class="mt-1 text-sm text-muted-foreground">{plan.pitch}</p>

      <p class="mt-5 flex items-baseline gap-2">
        <span class="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl" style="letter-spacing: -0.03em">
          {priceLabel(plan, cycle)}
        </span>
        <span class="text-sm text-muted-foreground">{priceUnit(plan, cycle)}</span>
      </p>

      {#if !compact}
        <div class="mt-6">
          {#if plan.id === "free"}
            <Button href="/" variant="secondary">Start sending</Button>
          {:else if current === plan.id || onPaidPlan}
            <Button variant="secondary" onclick={onManage} disabled={busy !== null}>
              {current === plan.id ? "Manage your plan" : "Change plan"}
            </Button>
          {:else}
            <Button
              variant={featured ? "primary" : "secondary"}
              onclick={() => onChoose?.(plan.id as "pro" | "max")}
              disabled={busy !== null}
            >
              {#if busy === plan.id}
                <Spinner aria-hidden="true" />
                One moment…
              {:else}
                Get {plan.name}
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
