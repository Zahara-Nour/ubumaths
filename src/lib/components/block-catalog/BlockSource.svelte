<!--
	Texte d'un bloc d'exemple, avec un bouton « Copier » (catalogue des blocs).
-->
<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';

	let { source }: { source: string } = $props();

	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(source);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			toaster.error('Impossible de copier le bloc');
		}
	}
</script>

<div class="relative">
	<pre class="overflow-x-auto rounded-md bg-muted p-3 pr-24 text-sm">{source}</pre>
	<Button variant="outline" size="sm" class="absolute top-2 right-2" onclick={copy}>
		{#if copied}
			<Check class="size-4" /> Copié
		{:else}
			<Copy class="size-4" /> Copier
		{/if}
	</Button>
</div>
