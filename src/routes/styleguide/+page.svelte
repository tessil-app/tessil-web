<script lang="ts">
  // Every shared building block in one place, with the rule for when to
  // use it. New screens are assembled from what is shown here.

  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import DetailItem from "$lib/components/DetailItem.svelte";
  import DetailList from "$lib/components/DetailList.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import DrawerSection from "$lib/components/DrawerSection.svelte";
  import FilterChips from "$lib/components/FilterChips.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import * as Frame from "$lib/components/frame";
  import IconButton from "$lib/components/IconButton.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import SearchField from "$lib/components/SearchField.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import * as Table from "$lib/components/table";
  import TextInput from "$lib/components/TextInput.svelte";
  import IconDownloadRegular from "phosphor-icons-svelte/IconDownloadRegular.svelte";
  import IconTrashRegular from "phosphor-icons-svelte/IconTrashRegular.svelte";

  type Filter = "all" | "open" | "done";

  const people = [
    { id: "a", name: "Fam. de Vries", ref: "B18E-B1E6", files: 2, done: false },
    { id: "b", name: "S. Bakker", ref: "003C-04B4", files: 4, done: true },
    { id: "c", name: "M. Visser", ref: "A2EC-83C8", files: 1, done: false },
  ];

  let query = $state("");
  let filter = $state<Filter>("all");
  let openId = $state<string | null>(null);
  let modalOpen = $state(false);
  let text = $state("");

  const rows = $derived(
    people.filter(
      (p) =>
        (filter === "all" || (filter === "done") === p.done) &&
        p.name.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );
  const opened = $derived(people.find((p) => p.id === openId) ?? null);
</script>

<Seo title="Components - Tessil" robots="noindex" />

{#snippet section(title: string, rule: string)}
  <div class="space-y-1">
    <h2 class="text-lg font-semibold text-foreground">{title}</h2>
    <p class="text-sm text-muted-foreground">{rule}</p>
  </div>
{/snippet}

<PageLayout width="5xl">
  <PageHeader
    title="Components"
    tagline="The shared building blocks. Not linked from the site."
    align="left"
  />

  <div class="space-y-12">
    <section class="space-y-4">
      {@render section(
        "Page header",
        "Every page starts with one. The way back sits above the title, the state next to it, the buttons beside it and below it on a phone.",
      )}
      <div class="rounded-lg border border-dashed border-border p-4">
        <PageHeader
          title="Belastingaangifte 2025"
          tagline="One line on what this page is for."
          back={{ href: "/styleguide", label: "All portals" }}
          align="left"
          class="mb-0"
        >
          {#snippet badge()}
            <Badge tone="success">Accepting files</Badge>
          {/snippet}
          {#snippet actions()}
            <Button variant="secondary" fullWidth={false}>Secondary</Button>
            <Button fullWidth={false}>Primary</Button>
          {/snippet}
        </PageHeader>
      </div>
    </section>

    <section class="space-y-4">
      {@render section(
        "Buttons",
        "One primary per view. Secondary for other actions, ghost for cancel, destructive for delete.",
      )}
      <div class="flex flex-wrap items-center gap-3">
        <Button fullWidth={false}>Primary</Button>
        <Button fullWidth={false} variant="secondary">Secondary</Button>
        <Button fullWidth={false} variant="ghost">Ghost</Button>
        <Button fullWidth={false} variant="destructive">Destructive</Button>
        <Button fullWidth={false} disabled>Disabled</Button>
        <Button fullWidth={false} disabled>
          <Spinner aria-hidden="true" />
          Working…
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-1 rounded-lg bg-card p-3">
        <IconButton label="Download"><IconDownloadRegular class="size-4" /></IconButton>
        <IconButton label="Delete" tone="destructive"><IconTrashRegular class="size-4" /></IconButton>
        <IconButton label="Unavailable" disabled><IconDownloadRegular class="size-4" /></IconButton>
        <span class="pl-2 text-sm text-muted-foreground">
          Icon buttons: for row actions. The label is read aloud and shown on hover.
        </span>
      </div>
    </section>

    <section class="space-y-4">
      {@render section("Badges", "A state, never an action. One per row.")}
      <div class="flex flex-wrap items-center gap-2">
        <Badge tone="success">Accepting files</Badge>
        <Badge tone="warning">2 of 3</Badge>
        <Badge tone="muted">Switched off</Badge>
        <Badge tone="info">New</Badge>
        <Badge tone="destructive">Failed</Badge>
      </div>
    </section>

    <section class="space-y-4">
      {@render section("Alerts", "Something happened that the person must read. Placed above what it is about.")}
      <div class="space-y-2">
        <Alert tone="info">Your vault is locked. Unlock it to see names.</Alert>
        <Alert tone="success">Saved. The link stays the same.</Alert>
        <Alert tone="warning">1 deposit could not be opened and is not shown.</Alert>
        <Alert tone="destructive">Couldn't delete these files.</Alert>
      </div>
    </section>

    <section class="space-y-4">
      {@render section("Fields", "A label above every field. Search and filters sit in one row above a list.")}
      <div class="grid gap-4 sm:grid-cols-2">
        <TextInput id="sg-text" label="Name" placeholder="For example: Documents 2025" bind:value={text} />
        <TextInput id="sg-error" label="With an error" value="x" error="Use at least 3 characters." />
      </div>
    </section>

    <section class="space-y-4">
      {@render section(
        "Table",
        "For any list of more than a few things. A row opens its details; quick actions sit on the right. On a phone the row stacks and the actions move into the details.",
      )}
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchField bind:value={query} label="Search" placeholder="Search by name" class="sm:w-80" />
        <FilterChips
          label="Show"
          value={filter}
          onChange={(v) => (filter = v)}
          options={[
            { value: "all", label: "All", count: people.length },
            { value: "open", label: "Incomplete", count: people.filter((p) => !p.done).length },
            { value: "done", label: "Complete", count: people.filter((p) => p.done).length },
          ]}
        />
      </div>
      {#if rows.length === 0}
        <div class="rounded-lg bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing matches.
        </div>
      {:else}
        <Table.Root cols="grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]" actions="sm">
          {#snippet header()}
            <div>Name</div>
            <div>Files</div>
            <div>Status</div>
          {/snippet}
          {#each rows as person (person.id)}
            <Table.Row onclick={() => (openId = person.id)}>
              {#snippet cells()}
                <div class="min-w-0">
                  <div class="truncate font-medium text-foreground">{person.name}</div>
                  <div class="text-xs text-muted-foreground font-mono">{person.ref}</div>
                </div>
                <div class="text-muted-foreground">{person.files}</div>
                <div>
                  <Badge tone={person.done ? "success" : "warning"}>
                    {person.done ? "Complete" : "Incomplete"}
                  </Badge>
                </div>
              {/snippet}
              {#snippet stacked()}
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-medium text-foreground">{person.name}</p>
                    <p class="text-xs text-muted-foreground">{person.files} files</p>
                  </div>
                  <Badge tone={person.done ? "success" : "warning"}>
                    {person.done ? "Complete" : "Incomplete"}
                  </Badge>
                </div>
              {/snippet}
              {#snippet actions()}
                <IconButton label="Download {person.name}"><IconDownloadRegular class="size-4" /></IconButton>
                <IconButton label="Delete {person.name}" tone="destructive" onclick={() => (modalOpen = true)}>
                  <IconTrashRegular class="size-4" />
                </IconButton>
              {/snippet}
            </Table.Row>
          {/each}
        </Table.Root>
      {/if}
    </section>

    <section class="space-y-4">
      {@render section(
        "Drawer and modal",
        "A drawer shows or edits one thing from a list. A modal asks one question, usually before something that can't be undone.",
      )}
      <div class="flex flex-wrap gap-3">
        <Button fullWidth={false} variant="secondary" onclick={() => (openId = "a")}>Open drawer</Button>
        <Button fullWidth={false} variant="secondary" onclick={() => (modalOpen = true)}>Open modal</Button>
      </div>
    </section>

    <section class="space-y-4">
      {@render section("Empty state", "Says what belongs here and offers the one way to start.")}
      <EmptyState title="Nothing has been sent yet">
        <p>Share the link. Files appear here as soon as someone sends them.</p>
        {#snippet actions()}
          <Button fullWidth={false}>Copy link</Button>
        {/snippet}
      </EmptyState>
    </section>

    <section class="space-y-4">
      {@render section("Progress", "A bar when the amount is known, a spinner when it is not.")}
      <div class="space-y-3 rounded-lg bg-card p-4">
        <ProgressBar progress={42} />
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner aria-hidden="true" />
          Loading…
        </div>
      </div>
    </section>
  </div>
</PageLayout>

<Drawer open={opened !== null} title={opened?.name ?? ""} onClose={() => (openId = null)}>
  {#if opened}
    <div class="space-y-3">
      <DrawerSection>
        <DetailList>
          <DetailItem label="Reference"><span class="font-mono">{opened.ref}</span></DetailItem>
          <DetailItem label="Files">{opened.files}</DetailItem>
        </DetailList>
      </DrawerSection>
      <DrawerSection
        title="A section"
        description="Each group of related things gets its own card with a small heading."
      >
        {#snippet aside()}
          <Badge tone={opened.done ? "success" : "warning"}>{opened.done ? "Complete" : "Incomplete"}</Badge>
        {/snippet}
      </DrawerSection>
      <DrawerSection
        title="Delete"
        description="Things that can't be undone go last, in a section of their own."
        tone="danger"
      >
        <Button variant="destructive" fullWidth={false} onclick={() => (modalOpen = true)}>Delete</Button>
      </DrawerSection>
    </div>
  {/if}
  {#snippet footer()}
    <Button type="button" variant="destructive" fullWidth={false} onclick={() => (modalOpen = true)}>
      Delete
    </Button>
    <Button type="button" fullWidth={false} onclick={() => (openId = null)}>Done</Button>
  {/snippet}
</Drawer>

<Modal
  open={modalOpen}
  title="Delete these files?"
  description="This can't be undone."
  onClose={() => (modalOpen = false)}
>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (modalOpen = false)}>
      Keep them
    </Button>
    <Button type="button" fullWidth={false} onclick={() => (modalOpen = false)}>Delete files</Button>
  {/snippet}
</Modal>
