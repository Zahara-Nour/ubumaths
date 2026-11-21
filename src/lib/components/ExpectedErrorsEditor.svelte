<!--
	Erreurs prévues d'une case (chantier idees-format, idée 3, PR 6)
	=================================================================

	Sous une case à écriture mathématique : « si l'élève répond … , lui écrire … ».
	Trois champs par erreur : réponse fausse (variables permises, comme la réponse
	attendue), message à l'élève, nom court pour le prof (facultatif). La case
	garde ses erreurs dans `errors` ; liste vide → `undefined` (le modèle reste tel
	qu'avant), nom court vide → absent (Zod refuse une chaîne vide).

	PROPS:
	- errors: ExpectedError[] | undefined (bindable)
	- caseNumber: numéro de la case (1, 2, …), pour les identifiants des champs
-->

<script lang="ts">
	import type { ExpectedError } from '#lib/questions/types.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Plus, Trash2 } from '@lucide/svelte';

	interface Props {
		errors?: ExpectedError[];
		caseNumber: number;
	}

	let { errors = $bindable(), caseNumber }: Props = $props();

	// Constantes
	/** Plafond du schéma (`EXPECTED_ERRORS_MAX`) */
	const ERRORS_MAX = 10;

	// Functions
	function addError() {
		errors = [...(errors ?? []), { answer: '', message: '' }];
	}

	function removeError(index: number) {
		const rest = (errors ?? []).filter((_, i) => i !== index);
		errors = rest.length > 0 ? rest : undefined;
	}

	function setField(index: number, field: 'answer' | 'message', value: string) {
		errors = (errors ?? []).map((error, i) => (i === index ? { ...error, [field]: value } : error));
	}

	// Nom court vide → clé retirée, pas de chaîne vide
	function setLabel(index: number, value: string) {
		errors = (errors ?? []).map((error, i) => {
			if (i !== index) return error;
			const { label: _label, ...rest } = error;
			return value.trim() === '' ? rest : { ...rest, label: value };
		});
	}
</script>

<div class="space-y-2" data-testid="erreurs-prevues-{caseNumber}">
	{#each errors ?? [] as error, index (index)}
		{@const id = `erreur-${caseNumber}-${index + 1}`}
		<div class="space-y-2 rounded-md border border-dashed p-3" data-testid="erreur-prevue">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium">Erreur prévue {index + 1}</p>
				<Button
					variant="ghost"
					size="icon"
					type="button"
					aria-label="Retirer l'erreur prévue {index + 1}"
					onclick={() => removeError(index)}
				>
					<Trash2 class="h-4 w-4" />
				</Button>
			</div>
			<div class="space-y-1">
				<Label for="{id}-reponse">Si l'élève répond</Label>
				<Input
					id="{id}-reponse"
					class="font-mono"
					placeholder={'{{eval:a-b}}'}
					value={error.answer}
					oninput={(event) => setField(index, 'answer', event.currentTarget.value)}
				/>
			</div>
			<div class="space-y-1">
				<Label for="{id}-message">Lui écrire</Label>
				<Input
					id="{id}-message"
					placeholder="Tu as soustrait au lieu d'additionner."
					value={error.message}
					oninput={(event) => setField(index, 'message', event.currentTarget.value)}
				/>
			</div>
			<div class="space-y-1">
				<Label for="{id}-nom">Nom court (pour vous, facultatif)</Label>
				<Input
					id="{id}-nom"
					placeholder="Soustraction au lieu d'addition"
					value={error.label ?? ''}
					oninput={(event) => setLabel(index, event.currentTarget.value)}
				/>
			</div>
		</div>
	{/each}

	{#if (errors?.length ?? 0) < ERRORS_MAX}
		<Button variant="ghost" size="sm" type="button" class="gap-2" onclick={addError}>
			<Plus class="h-4 w-4" />
			Ajouter une erreur prévue
		</Button>
	{/if}
</div>
