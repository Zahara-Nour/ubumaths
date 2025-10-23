<!--
	CustomCardEditor Component
	==========================

	Create or edit custom SRS flashcards with rich content.

	Features:
	- Front and back content editors using FormRichTextEditor
	- Preview mode
	- Validation
	- Save/Cancel actions

	Props:
	- initialFrontContent: Initial front content (for editing)
	- initialBackContent: Initial back content (for editing)
	- onSave: Callback with ContentField arrays for front and back
	- onCancel: Callback when cancelled
-->

<script lang="ts">
	import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import MathDisplay from '$lib/components/MathDisplay.svelte';
	import { Eye, Save, X } from 'lucide-svelte';
	import type { ContentField } from '$lib/questions/types';

	interface Props {
		initialFrontContent?: ContentField[];
		initialBackContent?: ContentField[];
		onSave: (frontContent: ContentField[], backContent: ContentField[]) => Promise<void>;
		onCancel?: () => void;
	}

	let { initialFrontContent = [], initialBackContent = [], onSave, onCancel }: Props = $props();

	// State
	let frontHTML = $state(contentFieldsToHTML(initialFrontContent));
	let backHTML = $state(contentFieldsToHTML(initialBackContent));
	let isSaving = $state(false);
	let activeTab = $state('edit');

	// Validation
	const canSave = $derived(frontHTML.trim().length > 0 && backHTML.trim().length > 0);

	/**
	 * Convert ContentField array to HTML string
	 */
	function contentFieldsToHTML(fields: ContentField[]): string {
		if (!fields || fields.length === 0) return '';

		return fields
			.map((field) => {
				if (field.type === 'text') {
					return field.content;
				} else if (field.type === 'image') {
					return `<img src="${field.url}" alt="${field.alt || ''}" />`;
				}
				return '';
			})
			.join('\n');
	}

	/**
	 * Convert HTML string to ContentField array
	 */
	function HTMLToContentFields(html: string): ContentField[] {
		if (!html || html.trim().length === 0) {
			return [{ type: 'text', content: '' }];
		}

		// For simplicity, treat entire HTML as a single text content field
		// The HTML can contain math-inline and other rich content
		return [{ type: 'text', content: html }];
	}

	/**
	 * Handle save
	 */
	async function handleSave() {
		if (!canSave || isSaving) return;

		isSaving = true;

		try {
			const frontContent = HTMLToContentFields(frontHTML);
			const backContent = HTMLToContentFields(backHTML);

			await onSave(frontContent, backContent);
		} catch (error) {
			console.error('Error saving card:', error);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="custom-card-editor w-full">
	<Tabs bind:value={activeTab} class="w-full">
		<TabsList class="mb-4 grid w-full grid-cols-2">
			<TabsTrigger value="edit">Édition</TabsTrigger>
			<TabsTrigger value="preview">Aperçu</TabsTrigger>
		</TabsList>

		<!-- Edit Mode -->
		<TabsContent value="edit" class="space-y-6">
			<!-- Front Content -->
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<h3 class="text-lg font-semibold">Recto de la carte</h3>
					<span class="text-sm text-muted-foreground">(Question / Concept)</span>
				</div>
				<FormRichTextEditor
					bind:value={frontHTML}
					placeholder="Entrez la question ou le concept à réviser..."
				/>
			</div>

			<!-- Back Content -->
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<h3 class="text-lg font-semibold">Verso de la carte</h3>
					<span class="text-sm text-muted-foreground">(Réponse / Explication)</span>
				</div>
				<FormRichTextEditor
					bind:value={backHTML}
					placeholder="Entrez la réponse ou l'explication détaillée..."
				/>
			</div>
		</TabsContent>

		<!-- Preview Mode -->
		<TabsContent value="preview" class="space-y-6">
			<div class="grid gap-6 md:grid-cols-2">
				<!-- Front Preview -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Recto</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if frontHTML.trim().length > 0}
							<div class="preview-content">
								<MathDisplay text={frontHTML} />
							</div>
						{:else}
							<div class="text-center text-sm text-muted-foreground">Le recto est vide</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Back Preview -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Verso</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if backHTML.trim().length > 0}
							<div class="preview-content">
								<MathDisplay text={backHTML} />
							</div>
						{:else}
							<div class="text-center text-sm text-muted-foreground">Le verso est vide</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</TabsContent>
	</Tabs>

	<!-- Actions -->
	<div class="mt-6 flex items-center justify-between gap-3">
		<div class="flex gap-2">
			{#if onCancel}
				<Button onclick={onCancel} variant="outline" disabled={isSaving}>
					<X class="mr-2 h-4 w-4" />
					Annuler
				</Button>
			{/if}
		</div>

		<div class="flex gap-2">
			<Button
				onclick={() => (activeTab = 'preview')}
				variant="outline"
				disabled={!canSave || activeTab === 'preview'}
			>
				<Eye class="mr-2 h-4 w-4" />
				Aperçu
			</Button>
			<Button onclick={handleSave} disabled={!canSave || isSaving}>
				<Save class="mr-2 h-4 w-4" />
				{isSaving ? 'Enregistrement...' : 'Enregistrer'}
			</Button>
		</div>
	</div>

	<!-- Validation Message -->
	{#if !canSave}
		<div
			class="mt-4 rounded-lg border border-orange-600 bg-orange-100 p-3 text-sm text-orange-900 dark:bg-orange-950 dark:text-orange-200"
		>
			<p>Le recto et le verso doivent contenir du contenu pour créer la carte.</p>
		</div>
	{/if}
</div>

<style>
	.custom-card-editor {
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.preview-content {
		min-height: 100px;
		padding: 1rem;
		border-radius: 0.5rem;
		background: hsl(var(--muted) / 0.3);
	}
</style>
