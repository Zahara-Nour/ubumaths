<!--
	Zone « Essayer » du catalogue des blocs : le prof modifie un bloc, le rendu
	et les messages d'erreur suivent en direct.
-->
<script lang="ts">
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';

	let { initial }: { initial: string } = $props();

	// Valeur de départ seulement : le prof la modifie ensuite
	// svelte-ignore state_referenced_locally
	let text = $state(initial);
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
	<div class="flex flex-col gap-2">
		<label for="essayer-bloc" class="font-medium">Texte du bloc</label>
		<Textarea
			id="essayer-bloc"
			bind:value={text}
			rows={10}
			spellcheck={false}
			class="font-mono text-sm"
		/>
		<div>
			<Button variant="ghost" size="sm" onclick={() => (text = initial)}>Remettre l’exemple</Button>
		</div>
	</div>
	<div class="flex min-h-48 items-center justify-center overflow-x-auto rounded-lg bg-muted/50 p-4">
		<!-- min-w-0 : sans lui, le rendu garde sa largeur de départ et déborde des deux côtés -->
		<div class="min-w-0">
			<MarkdownRenderer content={text} showAuthoringErrors />
		</div>
	</div>
</div>
