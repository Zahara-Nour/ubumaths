<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import MySelect from '#lib/components/MySelect.svelte';
	import { Clock, Minus, Plus, Trash2 } from '@lucide/svelte';
	import TooShortMark from '#lib/components/series/TooShortMark.svelte';
	import ObservedDelayHint from '#lib/components/series/ObservedDelayHint.svelte';
	import VariationPicker from '#lib/components/series/VariationPicker.svelte';
	import { effectiveDelay, observedSuggestion, tooShortAt } from '#lib/types/duration-signals.ts';
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import { submitAction } from '#lib/utils/form-action.ts';
	import { getGradeSelectItems } from '#lib/utils/grades.ts';
	import { MarkdownRenderer } from '#lib/components/markdown/index.ts';
	import { convertLegacyLatexToMarkdown } from '#lib/utils/latex-syntax-adapter.ts';
	import type { SeriesItem } from '#lib/validation/series.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const gradeItems = getGradeSelectItems();

	// Copie de travail : la page n'écrit qu'à l'enregistrement
	// svelte-ignore state_referenced_locally
	const initial = data.series;
	let title = $state(initial.title);
	let grade = $state(initial.grade);
	let description = $state(initial.description ?? '');
	let items = $state<SeriesItem[]>(initial.items.map((item) => ({ ...item })));
	let isSaving = $state(false);

	// Modèles publiés de la série ; absent = retiré (ADR 0035, Q7)
	let templateById = $derived(new Map(data.templates.map((template) => [template.id, template])));

	let canSave = $derived(title.trim().length > 0 && items.length > 0 && !isSaving);

	function handleQuantity(index: number, delta: number) {
		const next = items[index].quantity + delta;
		if (next < 1 || next > 99) return;
		items[index].quantity = next;
	}

	// Durée observée appliquée à la copie de travail : écrite à l'enregistrement
	function handleApplyDelay(index: number, seconds: number) {
		items[index].delay = seconds;
	}

	// Choix des variations (idées-format, idée 2) : absent = toutes, rien d'enregistré
	function handleVariations(index: number, variations: number[] | undefined) {
		if (variations) items[index].variations = variations;
		else delete items[index].variations;
	}

	// Variations en QCM (idées-format, idée 4) : absent = aucune, rien d'enregistré
	function handleChoiceVariations(index: number, choiceVariations: number[] | undefined) {
		if (choiceVariations) items[index].choiceVariations = choiceVariations;
		else delete items[index].choiceVariations;
	}

	function handleRemove(index: number) {
		items.splice(index, 1);
	}

	function handleBack() {
		goto('/dashboard/teacher/series').then(() => {});
	}

	async function handleSubmit() {
		if (!canSave) return;
		isSaving = true;
		try {
			const formData = new FormData();
			formData.set('title', title.trim());
			formData.set('grade', grade);
			formData.set('description', description.trim());
			formData.set('items', JSON.stringify(items));
			const outcome = await submitAction('', formData);
			if (!outcome.ok) {
				toaster.error(outcome.message);
				return;
			}
			toaster.success('Série enregistrée');
			handleBack();
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Modifier la série | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-8">
		<BackLink href="/dashboard/teacher/series" label="Retour aux séries" />
		<h1 class="text-3xl font-bold tracking-tight">Modifier la série</h1>
	</div>

	<form
		class="space-y-6"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<Card.Root>
			<Card.Content class="space-y-4 pt-6">
				<div class="space-y-2">
					<Label for="title">Titre</Label>
					<Input id="title" bind:value={title} maxlength={200} required />
				</div>
				<div class="space-y-2">
					<Label for="grade">Niveau</Label>
					<MySelect
						type="single"
						bind:value={grade}
						items={gradeItems}
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>
				<div class="space-y-2">
					<Label for="description">Description (facultative)</Label>
					<Textarea id="description" bind:value={description} rows={3} maxlength={2000} />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Questions</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if items.length === 0}
					<p class="text-sm text-destructive">Une série garde au moins un modèle.</p>
				{:else}
					<ul class="divide-y">
						{#each items as item, index (index)}
							{@const template = templateById.get(item.templateId)}
							<li class="flex flex-wrap items-center justify-between gap-2 py-2">
								{#if template}
									<span class="flex items-baseline gap-2 text-sm">
										<MarkdownRenderer content={convertLegacyLatexToMarkdown(template.title)} />
										<span class="text-xs text-muted-foreground">niveau {template.level}</span>
									</span>
								{:else}
									<span class="text-sm text-muted-foreground" data-modele-retire>
										Modèle retiré : il n'est plus publié et sera sauté.
									</span>
								{/if}
								<div class="flex items-center gap-2">
									<!-- Durée par question : en lecture (réglée dans le panier, ou par la durée observée) -->
									<span
										class="flex items-center gap-1 text-sm text-muted-foreground"
										title="Durée par question"
										data-duree
									>
										<Clock class="h-3.5 w-3.5" aria-hidden="true" />
										{effectiveDelay(item.delay)}&nbsp;s
									</span>
									<Button
										type="button"
										size="icon"
										variant="outline"
										aria-label="Une question de moins"
										onclick={() => handleQuantity(index, -1)}
									>
										<Minus class="h-4 w-4" />
									</Button>
									<span class="w-8 text-center text-sm">{item.quantity}</span>
									<Button
										type="button"
										size="icon"
										variant="outline"
										aria-label="Une question de plus"
										onclick={() => handleQuantity(index, 1)}
									>
										<Plus class="h-4 w-4" />
									</Button>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										aria-label="Retirer le modèle"
										onclick={() => handleRemove(index)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
								{#if template}
									<!-- Sa propre ligne, comme les marques de durée -->
									<div class="w-full">
										<VariationPicker
											{template}
											selected={item.variations}
											onchange={(variations) => handleVariations(index, variations)}
											choiceSelected={item.choiceVariations}
											onchoicechange={(choiceVariations) =>
												handleChoiceVariations(index, choiceVariations)}
										/>
									</div>
								{/if}
								<TooShortMark
									timing={tooShortAt(data.durationSignals, item.templateId, item.delay)}
									class="w-full"
								/>
								<ObservedDelayHint
									seconds={observedSuggestion(data.observedDurations, item.templateId, item.delay)}
									onapply={(seconds) => handleApplyDelay(index, seconds)}
									class="w-full"
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<div class="flex justify-end gap-3">
			<Button type="button" variant="outline" onclick={handleBack}>Annuler</Button>
			<Button type="submit" disabled={!canSave}>
				{isSaving ? 'Enregistrement…' : 'Enregistrer'}
			</Button>
		</div>
	</form>
</div>
