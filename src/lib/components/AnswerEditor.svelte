<!--
	Answer Editor Component
	=======================

	Dynamic answer editor that changes based on question type.

	QUESTION TYPES:
	- fill_in_blanks: Blanks with expected answers (un QCM est une case choix, ADR 0033)

	PROPS:
	- questionType: QuestionType
	- blanks: TemplateBlank[] (bindable, for fill-in-blanks)
	- statement: énoncé effectif de la variation (bindable, texte à trous) : ses
	  blocs ```choix deviennent des cartes « Case N : choix » qui le réécrivent ;
	  « Ajouter une case choix » et « Vrai / Faux » y ajoutent un bloc en fin
	  (chantier figure-et-choix, PR 1b) ; ses blocs ```figure-de-travail, des
	  cartes en lecture seule « Figure de travail — non notée » (lot 2)
	- statementShared: l'énoncé est le partagé (la variation n'a pas le sien) :
	  cartes en lecture seule (on coche seulement) et pas d'ajout de case choix,
	  sinon les réponses des autres variations se décaleraient
-->

<script lang="ts">
	import { untrack } from 'svelte';
	import type { QuestionType, TemplateBlank } from '$lib/questions/types';
	import type { TemplateMarkdown } from '$lib/ubumark';
	import { templateMarkdown } from '$lib/ubumark';
	import {
		appendChoiceCase,
		statementCaseKinds,
		type ChoiceCaseDraft,
		withBlockCases
	} from '$lib/questions/choice-case-editor';
	import { readWorkFigureCases, type WorkFigureCase } from '$lib/questions/work-figure-editor';
	import ChoiceCaseEditor from './ChoiceCaseEditor.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Plus, Trash2 } from '@lucide/svelte';

	interface Props {
		questionType: QuestionType;
		blanks?: TemplateBlank[];
		statement?: TemplateMarkdown;
		statementShared?: boolean;
		/** Amorcer un trou vide quand il n'y en a pas */
		seedEmpty?: boolean;
	}

	// Constantes
	/** Préréglage « Vrai / Faux » (V7) : une case choix à deux choix, jamais mélangée (Q106) */
	const TRUE_FALSE_CONTENTS = ['Vrai', 'Faux'];
	/** Blocs ajoutés en fin d'énoncé par l'éditeur de cases */
	const NEW_CHOICE_CASE: ChoiceCaseDraft = { multiple: false, shuffle: true, choices: ['', ''] };
	const TRUE_FALSE_CASE: ChoiceCaseDraft = {
		multiple: false,
		shuffle: false,
		choices: TRUE_FALSE_CONTENTS
	};

	let {
		questionType,
		blanks = $bindable([]),
		statement = $bindable(),
		statementShared = false,
		seedEmpty = true
	}: Props = $props();

	// Genre de chaque case de l'énoncé (ordre du générateur) : une case choix a sa carte
	let caseKinds = $derived(statement === undefined ? [] : statementCaseKinds(statement));
	// Cases des blocs omises de `blanks[]` (permis au générateur, et cas d'un énoncé
	// collé dans un formulaire parti d'une entrée) : remises à leur rang, réponse vide,
	// pour que chaque carte soit celle de sa case — sinon la carte de la figure prend
	// l'entrée que le générateur donne au choix (« aucune bonne réponse »). Seulement
	// après une modification de l'énoncé : ouvrir un modèle ne le marque pas modifié.
	const openingStatement = untrack(() => statement);
	$effect(() => {
		if (questionType !== 'fill_in_blanks' || statement === undefined) return;
		if (statement === openingStatement) return;
		const aligned = withBlockCases(blanks, statement, () => ({ expectedAnswer: '' }));
		if (!aligned) return;
		blanks = aligned;
	});

	// Figures de travail de l'énoncé : cartes en lecture seule, jamais notées
	let workFigures = $derived(
		statement === undefined ? new Map<number, WorkFigureCase>() : readWorkFigureCases(statement)
	);

	// Initialize fields based on question type
	$effect(() => {
		if (!seedEmpty) return;
		if (questionType === 'fill_in_blanks' && (!blanks || blanks.length === 0)) {
			blanks = [{ expectedAnswer: '' }];
		}
	});

	// Fill-in-blanks: Add blank
	function addBlank() {
		blanks = [...blanks, { expectedAnswer: '' }];
	}

	// Fill-in-blanks: Remove blank
	function removeBlank(index: number) {
		blanks = blanks.filter((_, i) => i !== index);
	}

	// Rang d'une case choix parmi les blocs choix de l'énoncé
	function choiceOrdinal(caseIndex: number): number {
		return caseKinds.slice(0, caseIndex).filter((kind) => kind === 'choice').length;
	}

	// Case choix ajoutée en fin d'énoncé : elle est la dernière case, la liste
	// des cases est complétée jusqu'à elle
	function addChoiceCase(draft: ChoiceCaseDraft) {
		if (statement === undefined) return;
		statement = templateMarkdown(appendChoiceCase(statement, draft));
		const count = statementCaseKinds(statement).length;
		const missing = Math.max(0, count - blanks.length);
		blanks = [...blanks, ...Array.from({ length: missing }, () => ({ expectedAnswer: '' }))];
		// Liste plus longue que les cases (trou retiré du texte) : la nouvelle case
		// n'hérite pas de la réponse d'un ancien trou
		blanks[count - 1] = { expectedAnswer: '' };
	}
</script>

<div class="space-y-4">
	<!-- Fill in Blanks -->
	{#if questionType === 'fill_in_blanks'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Texte à trous</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if blanks}
					{#each blanks as blank, index (index)}
						{@const workFigure = workFigures.get(index)}
						{#if workFigure}
							<!-- Figure de travail : jamais notée, se modifie dans l'énoncé -->
							<div
								class="space-y-1 rounded-md border bg-muted/30 p-3"
								data-testid="carte-figure-de-travail"
							>
								<p class="text-sm font-medium">Figure de travail — non notée</p>
								<p class="text-xs text-muted-foreground">
									Outil : {workFigure.tool}. L'élève peut y tracer pour vérifier ; rien n'est noté.
									Elle se modifie dans l'énoncé.
								</p>
								{#each workFigure.errors as message (message)}
									<p class="text-xs text-destructive">{message}</p>
								{/each}
							</div>
						{:else if statement !== undefined && caseKinds[index] === 'choice'}
							<ChoiceCaseEditor
								bind:statement
								ordinal={choiceOrdinal(index)}
								caseNumber={index + 1}
								bind:expectedAnswer={blank.expectedAnswer}
								editable={!statementShared}
							/>
						{:else}
							<div class="flex gap-3">
								<div class="flex-1 space-y-2">
									<Label for="blank-answer-{index}">
										Trou #{index + 1} — Réponse attendue
									</Label>
									<Input
										id="blank-answer-{index}"
										bind:value={blank.expectedAnswer}
										class="font-mono"
									/>
								</div>
								<Button
									variant="destructive"
									size="icon"
									onclick={() => removeBlank(index)}
									disabled={blanks.length === 1}
									class="mt-8"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						{/if}
					{/each}
				{/if}

				<Button onclick={addBlank} class="w-full gap-2" variant="outline">
					<Plus class="h-4 w-4" />
					Ajouter un trou
				</Button>

				{#if statement !== undefined && statementShared}
					<p class="text-xs text-muted-foreground">
						Énoncé partagé : les cases choix s'ajoutent dans l'énoncé partagé.
					</p>
				{:else if statement !== undefined}
					<div class="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							type="button"
							class="gap-2"
							onclick={() => addChoiceCase(NEW_CHOICE_CASE)}
						>
							<Plus class="h-4 w-4" />
							Ajouter une case choix
						</Button>
						<Button
							variant="outline"
							size="sm"
							type="button"
							onclick={() => addChoiceCase(TRUE_FALSE_CASE)}
						>
							Vrai / Faux
						</Button>
					</div>
				{/if}

				<p class="text-xs text-muted-foreground">
					Les trous sont positionnels par index dans l'énoncé
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
