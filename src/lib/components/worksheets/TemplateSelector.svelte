<!--
	TemplateSelector Component
	==========================

	A component to select a template for worksheet PDF generation.
	Shows available templates with preview option.

	Usage:
	```svelte
	<TemplateSelector
		bind:value={selectedTemplateId}
		templates={availableTemplates}
	/>
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import { FileText, Eye, Globe, Lock, Sparkles, X } from 'lucide-svelte';
	import type { WorksheetTemplateRow } from '$lib/types/worksheets';
	import {
		DEFAULT_TEMPLATES,
		renderTemplate,
		SAMPLE_PREVIEW_DATA
	} from '$lib/worksheets/default-templates';

	// Props
	interface Props {
		value: string | null;
		templates?: WorksheetTemplateRow[];
		onchange?: (templateId: string | null) => void;
	}

	let { value = $bindable(null), templates = [], onchange }: Props = $props();

	// Local state
	let showPreviewDialog = $state(false);
	let previewTemplateId = $state<string | null>(null);

	// Combined templates (defaults + user templates)
	let selectOptions = $derived([
		{ value: '', label: 'Aucun template (defaut)' },
		...DEFAULT_TEMPLATES.map((t) => ({
			value: `default:${t.id}`,
			label: `${t.name} (par defaut)`,
			description: t.description
		})),
		...templates.map((t) => ({
			value: t.id,
			label: t.name,
			description: t.description || undefined
		}))
	]);

	// Get template details for preview
	let previewTemplate = $derived.by(() => {
		if (!previewTemplateId) return null;

		// Check if it's a default template
		if (previewTemplateId.startsWith('default:')) {
			const defaultId = previewTemplateId.replace('default:', '');
			return DEFAULT_TEMPLATES.find((t) => t.id === defaultId) || null;
		}

		// Check user templates
		return templates.find((t) => t.id === previewTemplateId) || null;
	});

	// Get current selected template for display
	let selectedTemplate = $derived.by(() => {
		if (!value) return null;

		if (value.startsWith('default:')) {
			const defaultId = value.replace('default:', '');
			const template = DEFAULT_TEMPLATES.find((t) => t.id === defaultId);
			if (template) {
				return {
					id: value,
					name: template.name,
					description: template.description,
					isDefault: true,
					isPublic: true
				};
			}
		}

		const userTemplate = templates.find((t) => t.id === value);
		if (userTemplate) {
			return {
				id: userTemplate.id,
				name: userTemplate.name,
				description: userTemplate.description,
				isDefault: false,
				isPublic: userTemplate.is_public
			};
		}

		return null;
	});

	/**
	 * Handle select change
	 */
	function handleSelectChange(newValue: string) {
		value = newValue || null;
		onchange?.(value);
	}

	/**
	 * Open preview dialog
	 */
	function openPreview(templateId: string) {
		previewTemplateId = templateId;
		showPreviewDialog = true;
	}

	/**
	 * Clear selection
	 */
	function clearSelection() {
		value = null;
		onchange?.(null);
	}
</script>

<div class="space-y-3">
	<!-- Select dropdown -->
	<div class="flex gap-2">
		<div class="flex-1">
			<MySelect
				items={selectOptions}
				value={value || ''}
				onchange={handleSelectChange}
				placeholder="Selectionner un template..."
			/>
		</div>
		{#if value}
			<Button
				variant="ghost"
				size="icon"
				onclick={() => openPreview(value!)}
				title="Apercu du template"
			>
				<Eye class="h-4 w-4" />
			</Button>
			<Button variant="ghost" size="icon" onclick={clearSelection} title="Retirer le template">
				<X class="h-4 w-4" />
			</Button>
		{/if}
	</div>

	<!-- Selected template info -->
	{#if selectedTemplate}
		<Card.Root class="bg-muted/50">
			<Card.Content class="flex items-start gap-3 p-3">
				<FileText class="mt-0.5 h-5 w-5 text-muted-foreground" />
				<div class="flex-1 space-y-1">
					<div class="flex items-center gap-2">
						<span class="font-medium">{selectedTemplate.name}</span>
						{#if selectedTemplate.isDefault}
							<Badge variant="secondary" class="text-xs">
								<Sparkles class="mr-1 h-3 w-3" />
								Par defaut
							</Badge>
						{:else if selectedTemplate.isPublic}
							<Badge variant="outline" class="text-xs">
								<Globe class="mr-1 h-3 w-3" />
								Public
							</Badge>
						{:else}
							<Badge variant="outline" class="text-xs">
								<Lock class="mr-1 h-3 w-3" />
								Prive
							</Badge>
						{/if}
					</div>
					{#if selectedTemplate.description}
						<p class="text-sm text-muted-foreground">{selectedTemplate.description}</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Quick access to default templates -->
	{#if !value}
		<div class="flex flex-wrap gap-2">
			<span class="text-sm text-muted-foreground">Templates rapides:</span>
			{#each DEFAULT_TEMPLATES.slice(0, 4) as template (template.id)}
				<Button
					variant="outline"
					size="sm"
					onclick={() => handleSelectChange(`default:${template.id}`)}
					class="h-7 text-xs"
				>
					{template.name}
				</Button>
			{/each}
		</div>
	{/if}
</div>

<!-- Preview dialog -->
<Dialog.Root bind:open={showPreviewDialog}>
	<Dialog.Content class="max-h-[90vh] max-w-4xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>
				{previewTemplate?.name || 'Apercu du template'}
			</Dialog.Title>
			{#if previewTemplate?.description}
				<Dialog.Description>
					{previewTemplate.description}
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		{#if previewTemplate}
			<div class="space-y-4 py-4">
				<!-- Preview with sample data -->
				<div class="rounded-lg border bg-white p-4 dark:bg-zinc-950">
					<pre
						class="font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">{renderTemplate(
							previewTemplate.template_content,
							SAMPLE_PREVIEW_DATA
						)}</pre>
				</div>

				<!-- Template info -->
				<div class="rounded-lg border bg-muted/50 p-3">
					<p class="text-sm text-muted-foreground">
						Ceci est un apercu avec des donnees exemple. Le rendu final utilisera les donnees
						reelles de votre feuille.
					</p>
				</div>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showPreviewDialog = false)}>Fermer</Button>
			<Button
				onclick={() => {
					if (previewTemplateId) {
						handleSelectChange(previewTemplateId);
					}
					showPreviewDialog = false;
				}}
			>
				Utiliser ce template
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
