<!-- Données structurées (schema.org) d'une page, échappées par toJsonLdScript -->
<script lang="ts">
	import { toJsonLdScript } from './site';

	let { data }: { data: Record<string, unknown> } = $props();

	const script = $derived(toJsonLdScript(data));
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON échappé par toJsonLdScript -->
	{@html script}
</svelte:head>
