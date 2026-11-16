<!--
	Corrections côte à côte (`/dev/corrections`, admin seul — garde : `reservedAreasHandle`)
	=====================================================================================

	Chantier corrections-modeles (docs/wip/corrections-modeles-progress.md) : pour une sélection
	de modèles réels, les rendus élèves de la correction avec les MÊMES composants que les écrans :
	- « Flash-cards / révision » : `FlashCard` non interactive, retournable (FlashSeries, ReviewSession) ;
	- « Saisie » : `FlashCard` interactive, retournée après « Valider » (TypingSeries) ;
	- « Fin de série » : `CorrectionCard` (Contrôle blanc, Course aux nombres, contrôle) avec la
	  réponse donnée dans la colonne Saisie.
	Les instances viennent de `/api/questions/generate/[id]`, graine fixe (reproductible).
-->
<script lang="ts">
	// Imports
	import { onMount } from 'svelte';
	import type { QuestionInstance } from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { AnswerData } from '$lib/types/question-display';
	import type { TestAnswerResult } from '$lib/types/test';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import CorrectionCard from '$lib/components/questions/CorrectionCard.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import { Button } from '$lib/components/ui/button';
	import { RotateCcw } from '@lucide/svelte';

	// Types
	interface Sample {
		id: string;
		label: string;
		note: string;
	}

	interface LoadedSample extends Sample {
		instance: QuestionInstance | null;
		error: string | null;
	}

	// Constantes
	const SEED = 4242;

	/** Modèles choisis le 2026-11-16 (base locale = copie de la prod) */
	const SAMPLES: Sample[] = [
		{
			id: '3ba51eb3-dfe9-4cfb-847b-a0e130231c21',
			label: 'Calcul sans correction écrite',
			note: 'CE1 — un des 51 publiés sans correction'
		},
		{
			id: '79a9aaa1-5b7a-44fd-b97d-fdfedfc62ffd',
			label: 'Calcul, correction courte',
			note: '5e — une étape'
		},
		{
			id: '2ab49a6f-2fc4-4583-9cbb-46ace580c019',
			label: 'Équation, correction longue',
			note: '3e — calcul aligné sur plusieurs lignes'
		},
		{
			id: 'e7b37987-fcb4-42e1-b133-b3b83ba55865',
			label: 'Correction avec raisonnement et courbe',
			note: '2de — Résoudre x³ = k'
		},
		{
			id: '207d451a-7aba-4824-8bf0-8c70a33a8ad0',
			label: 'Plusieurs cases',
			note: '4e — deux cases'
		},
		{ id: '4a86db27-ae09-4095-97a6-e29eb29927eb', label: 'Case choix (QCM)', note: '6e' },
		{
			id: '102fd5f2-5120-4aac-9217-2c383e4420e4',
			label: 'Question de cours en QCM',
			note: '1re spé — brouillon cours-suites'
		},
		{
			id: '20ecab00-054c-4b8a-a68e-55755edafc03',
			label: 'Carte de cours (brouillon)',
			note: '1re spé — sans case, auto-évaluée'
		},
		{
			id: '318ea542-65cb-4040-9b46-1d5803d9dee5',
			label: 'Carte de cours (publiée)',
			note: '1re spé'
		},
		{
			id: '03bf0d26-9b40-4908-827e-b679a6eebfaf',
			label: 'Figure à compléter',
			note: '6e — bissectrice'
		},
		{
			id: '00910e5b-7a51-4c30-a489-115883738058',
			label: 'Placer sur une droite graduée',
			note: 'CM1'
		},
		{
			id: '0113c53d-ee4a-4da9-9327-537461ffdc85',
			label: 'Tableau à compléter',
			note: '1re spé — variations'
		},
		{
			id: 'aa8e1716-c6e1-4247-8d7e-4c77ff910b5c',
			label: 'Étapes à ranger',
			note: 'Tle spé — démonstration'
		},
		{ id: '19d80fc9-0d50-4dee-9ae8-b2ac4a42dece', label: 'Monnaie à construire', note: 'CE1' }
	];

	// Variables
	let samples = $state<LoadedSample[]>(SAMPLES.map((s) => ({ ...s, instance: null, error: null })));
	/** Réponse validée dans la colonne Saisie, par modèle */
	let answers = $state<Record<string, AnswerData | null>>({});
	/** Compteur par modèle pour recommencer la saisie */
	let attempts = $state<Record<string, number>>({});

	// Functions
	async function loadSample(sample: Sample): Promise<LoadedSample> {
		try {
			const response = await fetch(`/api/questions/generate/${sample.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ seed: SEED })
			});
			const result: unknown = await response.json();
			if (
				response.ok &&
				typeof result === 'object' &&
				result !== null &&
				'instance' in result &&
				result.instance
			) {
				return { ...sample, instance: result.instance as QuestionInstance, error: null };
			}
			return { ...sample, instance: null, error: `Génération en échec (${response.status})` };
		} catch {
			return { ...sample, instance: null, error: 'Erreur réseau' };
		}
	}

	function answerResultOf(instance: QuestionInstance, answer: AnswerData): TestAnswerResult {
		// Même construction que TestInteractive.completeTest() pour une question
		return {
			index: 0,
			instance,
			userAnswer: answer,
			isCorrect: answer.isCorrect || false,
			timeSpent: answer.timeSpent,
			attempts: answer.attempts
		};
	}

	function handleAnswer(id: string, answer: AnswerData) {
		answers[id] = answer;
	}

	function restart(id: string) {
		answers[id] = null;
		attempts[id] = (attempts[id] ?? 0) + 1;
	}

	// Chargement unique à l'ouverture de la page
	onMount(async () => {
		samples = await Promise.all(SAMPLES.map(loadSample));
	});
</script>

<svelte:head>
	<title>Corrections côte à côte</title>
</svelte:head>

<main class="mx-auto max-w-[110rem] space-y-8 px-4 py-6">
	<BackLink href="/dev" label="Retour aux pages de dev" />
	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Corrections côte à côte</h1>
		<p class="text-sm text-muted-foreground">
			Mêmes composants que les écrans élèves. Réponds (juste, faux ou vide) dans la colonne « Saisie
			» : la carte de fin de série se remplit avec ta réponse. Graine {SEED}.
		</p>
	</header>

	{#each samples as sample (sample.id)}
		{@const instance = sample.instance}
		<section class="space-y-3 border-t pt-6">
			<div>
				<h2 class="text-lg font-semibold">{sample.label}</h2>
				<p class="text-sm text-muted-foreground">
					{sample.note}{#if instance}
						— {instance.title ?? ''}{/if}
				</p>
			</div>

			{#if sample.error}
				<p class="text-sm text-destructive">{sample.error}</p>
			{:else if !instance}
				<p class="text-sm text-muted-foreground">Chargement…</p>
			{:else}
				{@const isCourseCard = getQuestionType(instance) === 'course_card'}
				{@const answer = answers[sample.id] ?? null}
				<div class="grid gap-6 lg:grid-cols-3">
					<div class="space-y-2">
						<h3 class="text-sm font-medium">Flash-cards / révision</h3>
						<FlashCard {instance} interactive={false} size="md" />
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between gap-2">
							<h3 class="text-sm font-medium">Saisie</h3>
							{#if answer}
								<Button variant="outline" size="sm" onclick={() => restart(sample.id)}>
									<RotateCcw class="mr-2 h-4 w-4" aria-hidden="true" />
									Recommencer
								</Button>
							{/if}
						</div>
						{#if isCourseCard}
							<FlashCard {instance} interactive={false} size="md" />
						{:else}
							{#key attempts[sample.id] ?? 0}
								<FlashCard
									{instance}
									interactive
									flipOnSubmit
									flippable={answer !== null}
									size="md"
									onAnswerSubmit={(a) => handleAnswer(sample.id, a)}
								/>
							{/key}
						{/if}
					</div>

					<div class="space-y-2">
						<h3 class="text-sm font-medium">Fin de série (Contrôle blanc, contrôle)</h3>
						{#if isCourseCard}
							<p class="text-sm text-muted-foreground">
								Carte de cours : retirée du Contrôle blanc, de la Course aux nombres et des
								contrôles.
							</p>
						{:else if answer}
							<CorrectionCard answerResult={answerResultOf(instance, answer)} size="md" />
						{:else}
							<p class="text-sm text-muted-foreground">Réponds dans la colonne « Saisie ».</p>
						{/if}
					</div>
				</div>
			{/if}
		</section>
	{/each}
</main>
