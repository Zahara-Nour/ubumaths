<!--
	StyleSelector Component
	=======================

	Le choix du style d'une fiche à sa création (ADR 0028, lot 3b) : les styles
	de Chiphre, puis ceux du prof. Pas d'option « Aucun » : une fiche a toujours
	un style, « Fiche élève » par défaut (D7). Aperçu du gabarit (code Typst,
	données d'exemple) pour un style de Chiphre.

	Usage:
	```svelte
	<StyleSelector bind:value={styleId} styles={data.styles} />
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import { FileText, Eye, Sparkles } from '@lucide/svelte';
	import { renderTemplate, SAMPLE_PREVIEW_DATA } from '$lib/typst/templates';
	import {
		DEFAULT_STYLE_ID,
		isBuiltInStyle,
		resolveTemplate,
		type StyleOption
	} from '$lib/typst/templates/styles';

	// Props
	interface Props {
		value: string;
		styles: StyleOption[];
	}

	let { value = $bindable(DEFAULT_STYLE_ID), styles }: Props = $props();

	// Local state
	let showPreviewDialog = $state(false);

	let selectOptions = $derived(
		styles.map((s) => ({ value: s.id, label: s.name, description: s.description ?? undefined }))
	);

	let selectedStyle = $derived(styles.find((s) => s.id === value) ?? null);

	// Aperçu : le Typst d'un style de Chiphre est dans le code
	let previewContent = $derived(
		isBuiltInStyle(value)
			? renderTemplate(resolveTemplate(value, 'worksheet').content, SAMPLE_PREVIEW_DATA)
			: null
	);

	function handleSelectChange(newValue: string) {
		value = newValue || DEFAULT_STYLE_ID;
	}
</script>

<div class="space-y-3">
	<div class="flex gap-2">
		<div class="flex-1">
			<MySelect
				type="single"
				items={selectOptions}
				{value}
				onchange={handleSelectChange}
				placeholder="Style"
				triggerAriaLabel="Choisir le style"
			/>
		</div>
		{#if previewContent}
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (showPreviewDialog = true)}
				title="Aperçu du style"
			>
				<Eye class="h-4 w-4" />
			</Button>
		{/if}
	</div>

	{#if selectedStyle}
		<Card.Root class="bg-muted/50">
			<Card.Content class="flex items-start gap-3 p-3">
				<FileText class="mt-0.5 h-5 w-5 text-muted-foreground" />
				<div class="flex-1 space-y-1">
					<div class="flex items-center gap-2">
						<span class="font-medium">{selectedStyle.name}</span>
						{#if selectedStyle.id === DEFAULT_STYLE_ID}
							<Badge variant="secondary" class="text-xs">
								<Sparkles class="mr-1 h-3 w-3" />
								Par défaut
							</Badge>
						{/if}
					</div>
					{#if selectedStyle.description}
						<p class="text-sm text-muted-foreground">{selectedStyle.description}</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<Dialog.Root bind:open={showPreviewDialog}>
	<Dialog.Content class="max-h-[90vh] max-w-4xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{selectedStyle?.name ?? 'Aperçu du style'}</Dialog.Title>
			{#if selectedStyle?.description}
				<Dialog.Description>{selectedStyle.description}</Dialog.Description>
			{/if}
		</Dialog.Header>

		{#if previewContent}
			<div class="space-y-4 py-4">
				<div class="rounded-lg border bg-white p-4 dark:bg-zinc-950">
					<pre
						class="font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">{previewContent}</pre>
				</div>
				<div class="rounded-lg border bg-muted/50 p-3">
					<p class="text-sm text-muted-foreground">
						Ceci est un aperçu avec des données d’exemple. Le rendu final utilisera les données
						réelles de votre fiche.
					</p>
				</div>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showPreviewDialog = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
