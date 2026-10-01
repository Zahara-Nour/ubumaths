<!--
	@component QuestionPreviewTabs

	Aperçu PROF d'une instance de question : un onglet par rendu élève réel
	(décision Q61, 2026-10-01), avec les MÊMES composants et props que les écrans :
	- « Flash-card » : FlashSeries / ReviewSession (`FlashCard`, non interactive, retournable)
	- « Entraînement » : TestInteractive (`QuestionCard` interactive), puis la carte
	  de correction de fin de série (TestResults → `CorrectionCard`)
	- « En classe » : ClassroomSeries (projection sans retournement ; verso = tuile
	  de la grille des corrections, `startFlipped`)

	Contexte AUTEUR posé pour tout le sous-arbre : un bloc mal écrit affiche son
	message détaillé (Q48). Les composants élèves gardent leur défaut.
-->

<script lang="ts" module>
	export type PreviewTab = 'flashcard' | 'training' | 'classroom';
</script>

<script lang="ts">
	// Imports
	import type { QuestionInstance } from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { AnswerData } from '$lib/types/question-display';
	import type { TestAnswerResult } from '$lib/types/test';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte';
	import CorrectionCard from '$lib/components/questions/CorrectionCard.svelte';
	import { TILE_CARD_HEIGHT } from '$lib/components/questions/tile-card';
	import { provideAuthoringErrors } from '$lib/components/markdown/authoring-errors';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { RotateCcw } from '@lucide/svelte';

	// Types
	interface Props {
		instance: QuestionInstance;
		/** Onglet choisi ; absent : celui par défaut selon le type de question */
		tab?: PreviewTab;
	}

	let { instance, tab = $bindable() }: Props = $props();

	// Page de prof : messages d'erreur d'auteur détaillés pour tous les rendus imbriqués
	provideAuthoringErrors(() => true);

	// Variables
	// Carte de cours : rien à saisir, la flash-card est son rendu naturel
	const defaultTab = $derived<PreviewTab>(
		getQuestionType(instance) === 'course_card' ? 'flashcard' : 'training'
	);
	const activeTab = $derived(tab ?? defaultTab);

	// Entraînement : réponse validée (null = saisie en cours), compteur pour recommencer
	let trainingAnswer = $state<AnswerData | null>(null);
	let attempt = $state(0);

	// Même construction que TestInteractive.completeTest() pour une question
	const answerResult = $derived<TestAnswerResult | null>(
		trainingAnswer
			? {
					index: 0,
					instance,
					userAnswer: trainingAnswer,
					isCorrect: trainingAnswer.isCorrect || false,
					timeSpent: trainingAnswer.timeSpent,
					attempts: trainingAnswer.attempts
				}
			: null
	);

	// En classe : recto (projection) ou verso (grille des corrections)
	let classroomBack = $state(false);

	// Functions
	function handleTabChange(value: string) {
		tab = value as PreviewTab;
	}

	function handleAnswerSubmit(answer: AnswerData) {
		trainingAnswer = answer;
	}

	function restartTraining() {
		trainingAnswer = null;
		attempt += 1;
	}
</script>

<Tabs.Root value={activeTab} onValueChange={handleTabChange} class="space-y-4">
	<Tabs.List class="grid w-full grid-cols-3">
		<Tabs.Trigger value="flashcard">Flash-card</Tabs.Trigger>
		<Tabs.Trigger value="training">Entraînement</Tabs.Trigger>
		<Tabs.Trigger value="classroom">En classe</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="flashcard" class="space-y-2">
		<p class="text-sm text-muted-foreground">
			Série en flash-cards et révisions : l'élève retourne la carte pour voir la correction.
		</p>
		<FlashCard {instance} interactive={false} size="lg" />
	</Tabs.Content>

	<Tabs.Content value="training" class="space-y-2">
		{#if answerResult}
			<div class="flex flex-wrap items-center justify-between gap-2">
				<p class="text-sm text-muted-foreground">
					Carte de correction telle qu'affichée en fin de série.
				</p>
				<Button variant="outline" size="sm" onclick={restartTraining}>
					<RotateCcw class="mr-2 h-4 w-4" aria-hidden="true" />
					Recommencer
				</Button>
			</div>
			<CorrectionCard {answerResult} questionNumber={1} size="md" />
		{:else}
			<p class="text-sm text-muted-foreground">
				Série en entraînement : l'élève saisit sa réponse puis valide.
			</p>
			{#key attempt}
				<QuestionCard interactive={true} {instance} onAnswerSubmit={handleAnswerSubmit} size="lg" />
			{/key}
		{/if}
	</Tabs.Content>

	<Tabs.Content value="classroom" class="space-y-2">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<p class="text-sm text-muted-foreground">
				{#if classroomBack}
					Grille des corrections de fin de séance (verso).
				{:else}
					Projection en classe : la carte ne se retourne pas.
				{/if}
			</p>
			<Button variant="outline" size="sm" onclick={() => (classroomBack = !classroomBack)}>
				{classroomBack ? 'Voir le recto' : 'Voir le verso'}
			</Button>
		</div>
		{#if classroomBack}
			<div class="max-w-md">
				<FlashCard
					{instance}
					interactive={false}
					size="sm"
					flippable={false}
					startFlipped
					height={TILE_CARD_HEIGHT}
				/>
			</div>
		{:else}
			<FlashCard {instance} interactive={false} size="lg" flippable={false} />
		{/if}
	</Tabs.Content>
</Tabs.Root>
