<!--
	CustomCardEditor Component
	==========================

	Create or edit custom SRS flashcards with markdown content.

	Features:
	- Front and back content editors using MarkdownEditor
	- Live preview with MarkdownRenderer
	- Validation
	- Save/Cancel actions

	Props:
	- initialFrontContent: Initial front content (TemplateMarkdown)
	- initialBackContent: Initial back content (TemplateMarkdown)
	- onSave: Callback with TemplateMarkdown strings for front and back
	- onCancel: Callback when cancelled
-->

<script lang="ts">
	import { MarkdownEditor, MarkdownRenderer } from '$lib/components/markdown';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Eye, Save, X } from 'lucide-svelte';
	import type { TemplateMarkdown } from '$lib/shared/markdown';
	import { templateMarkdown } from '$lib/shared/markdown';

	interface Props {
		initialFrontContent?: TemplateMarkdown;
		initialBackContent?: TemplateMarkdown;
		onSave: (frontContent: TemplateMarkdown, backContent: TemplateMarkdown) => Promise<void>;
		onCancel?: () => void;
	}

	let { initialFrontContent = '', initialBackContent = '', onSave, onCancel }: Props = $props();

	// State
	let frontMarkdown = $state(initialFrontContent || '');
	let backMarkdown = $state(initialBackContent || '');
	let isSaving = $state(false);
	let activeTab = $state('edit');

	// Validation
	const canSave = $derived(frontMarkdown.trim().length > 0 && backMarkdown.trim().length > 0);

	/**
	 * Handle save
	 */
	async function handleSave() {
		if (!canSave || isSaving) return;

		isSaving = true;

		try {
			await onSave(templateMarkdown(frontMarkdown), templateMarkdown(backMarkdown));
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
				<MarkdownEditor
					bind:value={frontMarkdown}
					placeholder="Écrivez le contenu du recto en markdown..."
					rows={6}
				/>
			</div>

			<!-- Back Content -->
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<h3 class="text-lg font-semibold">Verso de la carte</h3>
					<span class="text-sm text-muted-foreground">(Réponse / Explication)</span>
				</div>
				<MarkdownEditor
					bind:value={backMarkdown}
					placeholder="Écrivez le contenu du verso en markdown..."
					rows={6}
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
						{#if frontMarkdown.trim().length > 0}
							<div class="preview-content">
								<MarkdownRenderer content={frontMarkdown} />
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
						{#if backMarkdown.trim().length > 0}
							<div class="preview-content">
								<MarkdownRenderer content={backMarkdown} />
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
