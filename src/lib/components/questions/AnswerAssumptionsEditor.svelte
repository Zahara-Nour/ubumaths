<!--
	Hypothèses de l'énoncé (ADR 0012)
	=================================

	Lignes « variable + hypothèse » du modèle entier (« Soit x > 0 »,
	« n entier naturel »). Les lignes sont liées au parent (`bind:rows`), qui
	les convertit en `options.answerAssumptions` par `validateAssumptionRows`.

	Catégorie Suites sans hypothèse sur n : PROPOSITION « n ∈ ℕ », jamais
	appliquée d'office — l'auteur clique.
-->

<script lang="ts">
	import {
		ANSWER_ASSUMPTION_KINDS,
		ANSWER_ASSUMPTION_LABELS,
		MAX_ANSWER_ASSUMPTIONS,
		isSequenceCategory,
		validateAssumptionRows,
		type AnswerAssumptionRow
	} from '$lib/questions/answer-assumptions';
	import type { AnswerAssumptionKind } from '$lib/math';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import MySelect from '../MySelect.svelte';
	import { Plus, Trash2 } from '@lucide/svelte';

	interface Props {
		rows: AnswerAssumptionRow[];
		/** Variables tirées du modèle : une hypothèse ne peut pas les viser */
		drawnNames: string[];
		theme: string;
		domain: string;
	}

	let { rows = $bindable(), drawnNames, theme, domain }: Props = $props();

	const KIND_ITEMS = ANSWER_ASSUMPTION_KINDS.map((kind) => ({
		value: kind,
		label: ANSWER_ASSUMPTION_LABELS[kind]
	}));

	let rowErrors = $derived(validateAssumptionRows(rows, drawnNames).errors);

	// Proposition « n ∈ ℕ » : Suites, n ni déjà décrit, ni tiré
	let proposeNatural = $derived(
		isSequenceCategory(theme, domain) &&
			!rows.some((row) => row.name.trim() === 'n') &&
			!drawnNames.includes('n')
	);

	function isAssumptionKind(value: string): value is AnswerAssumptionKind {
		return (ANSWER_ASSUMPTION_KINDS as readonly string[]).includes(value);
	}

	function handleAdd() {
		rows = [...rows, { name: '', kind: 'positive' }];
	}

	function handleAddNatural() {
		rows = [...rows, { name: 'n', kind: 'natural' }];
	}

	function handleRemove(index: number) {
		rows = rows.filter((_, i) => i !== index);
	}

	function handleNameInput(index: number, value: string) {
		rows[index].name = value;
	}

	function handleKindChange(index: number, value: string) {
		if (isAssumptionKind(value)) rows[index].kind = value;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Hypothèses de l'énoncé</Card.Title>
		<Card.Description>
			« Soit x &gt; 0 » : la correction compare les réponses sur ce domaine seulement. Une hypothèse
			vise une variable libre de la réponse (x, n), jamais une variable tirée.
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-3">
		{#each rows as row, index (index)}
			<div class="space-y-1">
				<div class="flex items-center gap-2">
					<Input
						class="w-28"
						value={row.name}
						placeholder="x"
						maxlength={10}
						aria-label="Variable de l'hypothèse {index + 1}"
						aria-invalid={rowErrors[index] ? 'true' : undefined}
						data-assumption-name
						oninput={(event) => handleNameInput(index, event.currentTarget.value)}
					/>
					<div class="w-52">
						<MySelect
							type="single"
							value={row.kind}
							items={KIND_ITEMS}
							onValueChange={(value) => handleKindChange(index, value)}
						/>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Retirer l'hypothèse {index + 1}"
						onclick={() => handleRemove(index)}
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
				{#if rowErrors[index]}
					<p class="text-xs text-destructive" role="alert">{rowErrors[index]}</p>
				{/if}
			</div>
		{/each}

		{#if proposeNatural}
			<div
				class="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-2 text-sm"
			>
				<span>Suite : l'indice est-il un entier naturel, <strong>n ∈ ℕ</strong> ?</span>
				<Button type="button" variant="outline" size="sm" onclick={handleAddNatural}
					>Ajouter n ∈ ℕ</Button
				>
			</div>
		{/if}

		<Button
			type="button"
			variant="outline"
			size="sm"
			onclick={handleAdd}
			disabled={rows.length >= MAX_ANSWER_ASSUMPTIONS}
		>
			<Plus class="mr-1 h-4 w-4" />
			Ajouter une hypothèse
		</Button>
	</Card.Content>
</Card.Root>
