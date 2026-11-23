<!--
	Erreurs prévues d'une case (chantier idees-format, idée 3, PR 6)
	=================================================================

	Sous une case à écriture mathématique : « si l'élève répond … , lui écrire … ».
	Trois champs par erreur : réponse fausse (variables permises, comme la réponse
	attendue), message à l'élève, nom court pour le prof (facultatif). La case
	garde ses erreurs dans `errors` ; liste vide → `undefined` (le modèle reste tel
	qu'avant), nom court vide → absent (Zod refuse une chaîne vide).

	Idée 4 : avec au moins une erreur prévue, « Jamais en QCM » interdit que la case
	se réponde en QCM quand une série le demande (`neverChoice`, clé retirée si
	décochée ou s'il ne reste aucune erreur prévue).

	PROPS:
	- errors: ExpectedError[] | undefined (bindable)
	- neverChoice: boolean | undefined (bindable)
	- caseNumber: numéro de la case (1, 2, …), pour les identifiants des champs
-->

<script lang="ts">
	import type { ExpectedError } from '#lib/questions/types.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Plus, Trash2 } from '@lucide/svelte';
	import MyCheckbox from './MyCheckbox.svelte';

	interface Props {
		errors?: ExpectedError[];
		neverChoice?: boolean;
		caseNumber: number;
	}

	let { errors = $bindable(), neverChoice = $bindable(), caseNumber }: Props = $props();

	// Constantes
	/** Plafond du schéma (`EXPECTED_ERRORS_MAX`) */
	const ERRORS_MAX = 10;
	/** Plafonds du schéma (`EXPECTED_ERROR_TEXT_MAX`, `EXPECTED_ERROR_LABEL_MAX`) */
	const TEXT_MAX = 500;
	const LABEL_MAX = 80;

	// Functions
	function addError() {
		errors = [...(errors ?? []), { answer: '', message: '' }];
	}

	function removeError(index: number) {
		const rest = (errors ?? []).filter((_, i) => i !== index);
		errors = rest.length > 0 ? rest : undefined;
		// Sans erreur prévue, pas de QCM possible : le veto n'a plus de sens
		if (rest.length === 0) neverChoice = undefined;
	}

	// Décochée → clé retirée (le modèle reste tel qu'avant)
	function setNeverChoice(value: boolean) {
		neverChoice = value ? true : undefined;
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
					maxlength={TEXT_MAX}
					value={error.answer}
					oninput={(event) => setField(index, 'answer', event.currentTarget.value)}
				/>
			</div>
			<div class="space-y-1">
				<Label for="{id}-message">Lui écrire</Label>
				<Input
					id="{id}-message"
					placeholder="Tu as soustrait au lieu d'additionner."
					maxlength={TEXT_MAX}
					value={error.message}
					oninput={(event) => setField(index, 'message', event.currentTarget.value)}
				/>
			</div>
			<div class="space-y-1">
				<Label for="{id}-nom">Nom court (pour vous, facultatif)</Label>
				<Input
					id="{id}-nom"
					placeholder="Soustraction au lieu d'addition"
					maxlength={LABEL_MAX}
					value={error.label ?? ''}
					oninput={(event) => setLabel(index, event.currentTarget.value)}
				/>
			</div>
			{#if error.answer.trim() === '' || error.message.trim() === ''}
				<p class="text-xs text-destructive">
					Réponse et message à remplir, sinon le modèle ne s'enregistre pas.
				</p>
			{/if}
		</div>
	{/each}

	{#if (errors?.length ?? 0) > 0}
		<div class="space-y-1">
			<MyCheckbox checked={neverChoice === true} onchange={setNeverChoice} label="Jamais en QCM" />
			<p class="text-xs text-muted-foreground">
				En série, cette case peut se répondre en choisissant parmi la bonne réponse et ces erreurs.
				Cochez pour l'interdire.
			</p>
		</div>
	{/if}

	{#if (errors?.length ?? 0) < ERRORS_MAX}
		<Button variant="ghost" size="sm" type="button" class="gap-2" onclick={addError}>
			<Plus class="h-4 w-4" />
			Ajouter une erreur prévue
		</Button>
	{/if}
</div>
