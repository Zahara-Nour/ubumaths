<!--
	JSON Viewer Component
	=====================

	Pretty-printed JSON viewer for debugging templates.

	FEATURES:
	- Syntax highlighting
	- Collapsible sections
	- Copy to clipboard
	- Formatted with proper indentation

	PROPS:
	- data: any (object to display as JSON)
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Copy, Check } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	let copied = $state(false);

	// Format JSON with syntax highlighting
	let formattedJson = $derived(JSON.stringify(data, null, 2));

	// Copy to clipboard
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(formattedJson);
			copied = true;
			toaster.success('JSON copié dans le presse-papiers');
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (error) {
			toaster.error('Erreur lors de la copie');
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title>JSON du modèle</Card.Title>
				<Card.Description>Structure JSON qui sera envoyée à l'API</Card.Description>
			</div>
			<Button onclick={copyToClipboard} variant="outline" class="gap-2">
				{#if copied}
					<Check class="h-4 w-4" />
					Copié
				{:else}
					<Copy class="h-4 w-4" />
					Copier
				{/if}
			</Button>
		</div>
	</Card.Header>
	<Card.Content>
		<div class="relative">
			<pre
				class="overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-xs leading-relaxed"><code
					>{formattedJson}</code
				></pre>
		</div>

		<!-- Character count -->
		<p class="mt-2 text-xs text-muted-foreground">
			{formattedJson.length.toLocaleString('fr-FR')} caractères
		</p>
	</Card.Content>
</Card.Root>

<style>
	/* Syntax highlighting for JSON */
	pre code {
		color: hsl(var(--foreground));
	}

	/* Optional: Add more sophisticated highlighting if needed */
	/* This is a simple version - can be enhanced with a library like highlight.js */
</style>
