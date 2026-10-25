<!--
	Vitrine : les questions (`/demo/questions`)
	===========================================

	Une même série de 4 questions sous ses cinq formes, en onglets : les vrais
	composants d'Automaths, avec des questions écrites dans la page. Rien n'est
	enregistré ; les révisions espacées sont simulées (chantier demo-debug, PR 6g).
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import ClassroomSeries from '$lib/components/test/ClassroomSeries.svelte';
	import TestInteractive from '$lib/components/test/TestInteractive.svelte';
	import FlashSeries from '$lib/components/test/FlashSeries.svelte';
	import TestCourse from '$lib/components/test/TestCourse.svelte';
	import type { TestSession } from '$lib/types/test';
	import SpacedReviewDemo from './SpacedReviewDemo.svelte';
	import { COURSE_TIME_LIMIT_SECONDS, demoClassroomItems, demoInstances } from './questions';

	// Types
	type Form = 'classroom' | 'interactive' | 'flash' | 'course' | 'review';

	interface FormTab {
		value: Form;
		label: string;
		who: string;
	}

	// Constantes
	const FORMS: FormTab[] = [
		{
			value: 'classroom',
			label: 'En classe',
			who: 'Le professeur projette la série : une question à la fois, avec un minuteur, puis la grille des questions et celle des corrections pour la reprise.'
		},
		{
			value: 'interactive',
			label: 'Entraînement',
			who: 'L’élève, seul, répond question par question ; la correction et le score arrivent à la fin.'
		},
		{
			value: 'flash',
			label: 'Flash-cards',
			who: 'L’élève, seul, retourne chaque carte et dit s’il avait trouvé. Pas de chrono : on revoit ensuite celles qui ont résisté.'
		},
		{
			value: 'course',
			label: 'Course aux nombres',
			who: 'Toutes les questions à la fois et un temps global : en classe ou à la maison, pour gagner en vitesse.'
		},
		{
			value: 'review',
			label: 'Révisions espacées',
			who: 'Chaque jour, l’élève connecté retrouve les cartes à revoir ; sa note fixe la date du prochain passage. Ici, simulée sur les 4 questions.'
		}
	];

	// Variables
	// Un compteur par forme : « Recommencer » remonte le composant à neuf
	let runs = $state<Record<Form, number>>({
		classroom: 0,
		interactive: 0,
		flash: 0,
		course: 0,
		review: 0
	});
	let courseSession = $state<TestSession>(newCourseSession());

	// Functions
	function newCourseSession(): TestSession {
		return {
			mode: 'course',
			categories: [],
			instances: demoInstances(),
			userAnswers: new Map(),
			startTime: Date.now(),
			timeLimit: COURSE_TIME_LIMIT_SECONDS,
			currentQuestionIndex: 0,
			isPaused: false
		};
	}

	function restart(form: Form) {
		if (form === 'course') courseSession = newCourseSession();
		runs[form] += 1;
	}

	// Les boutons « Retour au panier » des formes mènent au vrai panier
	function toCart() {
		goto(resolve('/automaths/panier'));
	}

	// Rien n'est enregistré sur la vitrine : la forme affiche son résultat elle-même
	function ignoreResult() {}
</script>

<svelte:head>
	<title>Les questions — Chiphre</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-5xl space-y-8 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Une série, cinq formes</h1>
		<div class="text-muted-foreground">
			Dans Chiphre, une série de questions se joue de cinq façons, selon le moment : projetée en
			classe, en entraînement, en flash-cards, en course aux nombres ou en révisions espacées. Voici
			la même série de 4 questions sous chacune de ces formes. Rien n'est enregistré sur cette page.
		</div>
	</header>

	<Tabs.Root value="classroom" class="space-y-6">
		<Tabs.List class="flex w-full flex-wrap justify-start">
			{#each FORMS as form (form.value)}
				<Tabs.Trigger value={form.value}>{form.label}</Tabs.Trigger>
			{/each}
		</Tabs.List>

		{#each FORMS as form (form.value)}
			<Tabs.Content value={form.value} class="space-y-6">
				<p class="text-muted-foreground">{form.who}</p>

				{#key runs[form.value]}
					{#if form.value === 'classroom'}
						<ClassroomSeries
							items={demoClassroomItems()}
							onBack={toCart}
							onRestart={() => restart('classroom')}
						/>
					{:else if form.value === 'interactive'}
						<TestInteractive
							items={demoClassroomItems()}
							isLoggedIn={false}
							loginNote={false}
							onComplete={ignoreResult}
							onRestart={() => restart('interactive')}
							onBack={toCart}
						/>
					{:else if form.value === 'flash'}
						<FlashSeries
							instances={demoInstances()}
							isLoggedIn={false}
							loginNote={false}
							onComplete={ignoreResult}
							onRestart={() => restart('flash')}
							onBack={toCart}
						/>
					{:else if form.value === 'course'}
						<TestCourse session={courseSession} onComplete={ignoreResult} onBack={toCart} />
					{:else}
						<SpacedReviewDemo />
					{/if}
				{/key}
			</Tabs.Content>
		{/each}
	</Tabs.Root>

	<p>
		<a href={resolve('/automaths')} class="font-medium text-primary underline underline-offset-4">
			Composer sa propre série dans Automaths
		</a>
	</p>
</div>
