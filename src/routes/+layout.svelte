<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { ModeWatcher, setMode } from "mode-watcher";
  import "../app.css";
  let { children } = $props();

  setMode("light");
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>JTransfer - Secure File Sharing</title>
</svelte:head>
<ModeWatcher />
{@render children()}
