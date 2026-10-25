<!--
	Vitrine : le diaporama (`/demo/diaporama`)
	==========================================

	13 diapositives pour un visiteur : comment avancer, pile verticale,
	fragments, transitions, développement qui avance tout seul, formules
	ubumark, Python, cercle trigonométrique, figure manipulable, minuteur de
	questions, annotations, tableau blanc, fin. Le banc d'essai complet de
	`$lib/slides` reste sur `/dev/diaporama` (chantier demo-debug, PR 6i).

	Pas d'adresse par diapositive (`hash: false`) : le diaporama vit dans la
	page, dans un cadre ; F ou le bouton le passent en plein écran.
-->
<script lang="ts">
	import { demoSeo } from '$lib/seo/demo-pages';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { Maximize, Minimize } from '@lucide/svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import { TILE_CARD_HEIGHT } from '$lib/components/questions/tile-card';
	import { Button } from '$lib/components/ui/button';
	import { runDsl } from '$lib/geometry-core/dsl';
	import {
		AnnotatableSlide,
		Deck,
		Slide,
		UbuMarkSlide,
		WhiteboardSlide,
		type DeckConfig
	} from '$lib/slides';
	import { demoInstances } from '../questions/questions';
	import ChronoBar from './ChronoBar.svelte';
	import {
		ANNOTATION_MARKDOWN,
		EXPANSION_MARKDOWN,
		EXPANSION_STEP_MS,
		FORMULAS_MARKDOWN,
		PYTHON_MARKDOWN,
		TIMER_QUESTION_SECONDS,
		TRIG_MARKDOWN,
		WHITEBOARD_PAGE,
		eulerFigure,
		pythonDemoUrl
	} from './diaporama';

	// Constantes
	const DARK = '#1e293b';
	const LIGHT = '#f8fafc';

	const DECK_CONFIG: Partial<DeckConfig> = {
		hash: false,
		controls: true,
		progress: true,
		slideNumber: true,
		loop: false
	};

	const NAVIGATION = [
		{ keys: '→ ou Espace', action: 'avancer' },
		{ keys: '←', action: 'revenir' },
		{ keys: '↓ et ↑', action: 'descendre dans une pile, remonter' },
		{ keys: 'F', action: 'plein écran' },
		{ keys: 'Échap', action: 'vue d’ensemble' }
	];

	// Les deux premières questions de `/demo/questions`
	const QUESTIONS = demoInstances().slice(0, 2);

	const FIGURE = eulerFigure();

	// Variables
	const pythonUrl = pythonDemoUrl();
	const builtFigure = $derived(browser ? runDsl(FIGURE.dsl).figure : null);

	let figureBoxWidth = $state(0);
	let figureBoxHeight = $state(0);
	const figureScale = $derived(
		figureBoxWidth > 0 && figureBoxHeight > 0
			? Math.min(1, figureBoxWidth / FIGURE.width, figureBoxHeight / FIGURE.height)
			: 0
	);
</script>

<SeoHead {...demoSeo('/demo/diaporama')} />

<div class="mx-auto max-w-6xl space-y-6 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Le diaporama</h1>
		<div class="text-muted-foreground">
			Le professeur fait cours avec des diapositives écrites dans Chiphre : formules, figures,
			cercle trigonométrique, code Python et questions minutées, avec de quoi écrire par-dessus.
			Cliquez dans le diaporama, puis avancez avec les flèches.
		</div>
	</header>

	<div
		class="diaporama h-[min(80dvh,56.25vw)] min-h-[28rem] w-full overflow-hidden rounded-xl border"
	>
		<!-- Taille du texte (--font-scale) selon la largeur du cadre : voir le style -->
		<div class="diaporama-texte h-full w-full">
			<Deck config={DECK_CONFIG}>
				<!-- 1. Titre et comment avancer -->
				<Slide background={DARK}>
					<h2 class="mb-6 font-bold">Faire cours avec Chiphre</h2>
					<p class="mb-4">Avancez avec les flèches du clavier ou celles en bas à droite :</p>
					<ul class="space-y-2 text-left">
						{#each NAVIGATION as item (item.keys)}
							<li><kbd class="font-semibold">{item.keys}</kbd> : {item.action}</li>
						{/each}
					</ul>
				</Slide>

				<!-- 2. Pile verticale -->
				<Slide background={DARK}>
					{#snippet vertical()}
						<Slide background={DARK}>
							<h2 class="mb-4 font-bold">Un détail, sous la diapositive</h2>
							<p>Une démonstration, un exemple de plus : on y descend si besoin.</p>
						</Slide>
						<Slide background={DARK}>
							<h2 class="mb-4 font-bold">Fin de la pile</h2>
							<p>Remontez avec ↑, ou continuez avec →.</p>
						</Slide>
					{/snippet}
					<h2 class="mb-4 font-bold">Une pile de diapositives</h2>
					<p>Les diapositives s'empilent aussi vers le bas.</p>
					<p class="mt-6 opacity-75">↓ Descendez ↓</p>
				</Slide>

				<!-- 3. Fragments -->
				<Slide background={LIGHT}>
					<h2 class="mb-6 font-bold">Un raisonnement, étape par étape</h2>
					<ul class="space-y-3 text-left">
						<li class="fragment">ABC est rectangle en A, avec AB = 3 et AC = 4.</li>
						<li class="fragment">D'après le théorème de Pythagore, BC² = AB² + AC².</li>
						<li class="fragment">BC² = 9 + 16 = 25, donc BC = 5.</li>
					</ul>
					<p class="mt-6 opacity-75">Chaque appui sur → montre la ligne suivante.</p>
				</Slide>

				<!-- 4. Transitions -->
				<Slide background={DARK} transition="slide">
					{#snippet vertical()}
						<Slide background="#0f3d3e" transition="zoom">
							<h2 class="font-bold">Zoom</h2>
						</Slide>
						<Slide background="#3b1d4a" transition="convex">
							<h2 class="font-bold">Rotation</h2>
						</Slide>
						<Slide background={DARK} transition="fade">
							<h2 class="font-bold">Fondu</h2>
						</Slide>
					{/snippet}
					<h2 class="mb-4 font-bold">Des transitions</h2>
					<p>Glissement, zoom, rotation, fondu : une par diapositive.</p>
					<p class="mt-6 opacity-75">↓ Descendez pour les voir ↓</p>
				</Slide>

				<!-- 5. Développement qui avance tout seul -->
				<UbuMarkSlide
					content={EXPANSION_MARKDOWN}
					background={LIGHT}
					autoSlide={EXPANSION_STEP_MS}
				/>

				<!-- 6. Formules ubumark -->
				<UbuMarkSlide content={FORMULAS_MARKDOWN} background={LIGHT} />

				<!-- 7. Python -->
				<Slide background={LIGHT}>
					<h2 class="mb-4 font-bold">Du code Python</h2>
					<div class="w-full max-w-3xl text-left">
						<MarkdownRenderer content={PYTHON_MARKDOWN} />
					</div>
					<Button href={pythonUrl} target="_blank" rel="noopener" size="lg" class="mt-2">
						Ouvrir dans Python
					</Button>
				</Slide>

				<!-- 8. Cercle trigonométrique -->
				<UbuMarkSlide content={TRIG_MARKDOWN} background={LIGHT} />

				<!-- 9. Figure de géométrie manipulable -->
				<Slide background={LIGHT}>
					<h2 class="mb-1 font-bold">Une figure qui se manipule</h2>
					<p class="mb-2">Déplacez A, B ou C : la droite d'Euler suit.</p>
					<div
						class="flex min-h-0 w-full flex-1 items-center justify-center"
						bind:clientWidth={figureBoxWidth}
						bind:clientHeight={figureBoxHeight}
					>
						{#if builtFigure && figureScale > 0}
							<GeometryCanvas
								figure={builtFigure}
								width={Math.round(FIGURE.width * figureScale)}
								height={Math.round(FIGURE.height * figureScale)}
								pixelsPerUnit={FIGURE.pixelsPerUnit * figureScale}
							/>
						{/if}
					</div>
				</Slide>

				<!-- 10. Minuteur : deux questions minutées, puis la correction -->
				<Slide background={DARK}>
					{#snippet vertical()}
						{#each QUESTIONS as question, index (question.templateId)}
							<Slide background={DARK} autoSlide={TIMER_QUESTION_SECONDS * 1000}>
								<div class="flex w-full flex-col items-center gap-6">
									<h2 class="font-bold">Question {index + 1} / {QUESTIONS.length}</h2>
									<FlashCard instance={question} interactive={false} flippable={false} size="lg" />
									<ChronoBar />
								</div>
							</Slide>
						{/each}
						<Slide background={DARK}>
							<h2 class="mb-4 font-bold">Correction</h2>
							<div class="grid w-full max-w-4xl gap-4 text-left md:grid-cols-2">
								{#each QUESTIONS as question (question.templateId)}
									<FlashCard
										instance={question}
										interactive={false}
										flippable={false}
										startFlipped
										size="sm"
										height={TILE_CARD_HEIGHT}
									/>
								{/each}
							</div>
						</Slide>
					{/snippet}
					<h2 class="mb-4 font-bold">Des questions minutées</h2>
					<p>
						{QUESTIONS.length} questions, {TIMER_QUESTION_SECONDS} secondes chacune : la barre se vide,
						la suivante arrive toute seule, puis la correction.
					</p>
					<p class="mt-6 opacity-75">↓ Descendez pour lancer le minuteur ↓</p>
				</Slide>

				<!-- 11. Annoter par-dessus -->
				<AnnotatableSlide background={LIGHT}>
					{#snippet content()}
						<h2 class="mb-4 font-bold">Écrire par-dessus</h2>
						<p class="mb-6">
							Prenez le crayon dans la barre du bas et entourez, soulignez, complétez :
						</p>
						<div>
							<MarkdownRenderer content={ANNOTATION_MARKDOWN} />
						</div>
					{/snippet}
				</AnnotatableSlide>

				<!-- 12. Tableau blanc -->
				<WhiteboardSlide page={WHITEBOARD_PAGE} background={LIGHT} />

				<!-- 13. Fin -->
				<Slide background={DARK}>
					<h2 class="mb-6 font-bold">À vous de jouer</h2>
					<div class="flex flex-wrap justify-center gap-4">
						<Button href={resolve('/demo')} variant="secondary" size="lg"
							>Les autres démonstrations</Button
						>
						<Button href={resolve('/atelier')} variant="secondary" size="lg"
							>Ouvrir l'Atelier</Button
						>
					</div>
				</Slide>

				{#snippet overlay(deck)}
					<div class="absolute top-3 right-3 z-20">
						<Button
							variant="secondary"
							size="icon"
							aria-label={deck.isFullscreen() ? 'Quitter le plein écran' : 'Plein écran'}
							title={deck.isFullscreen() ? 'Quitter le plein écran (F)' : 'Plein écran (F)'}
							onclick={() => void deck.toggleFullscreen()}
						>
							{#if deck.isFullscreen()}
								<Minimize class="h-5 w-5" />
							{:else}
								<Maximize class="h-5 w-5" />
							{/if}
						</Button>
					</div>
				{/snippet}
			</Deck>
		</div>
	</div>
</div>

<style>
	/* Les titres, paragraphes et listes de <main> suivent --font-scale (app.css) :
	   plus le cadre est large, plus le texte des diapositives grandit */
	.diaporama {
		container-type: inline-size;
	}

	.diaporama-texte {
		--font-scale: 1;
	}

	/* Tableaux et code ne suivent pas --font-scale d'eux-mêmes */
	.diaporama-texte :global(th),
	.diaporama-texte :global(td) {
		font-size: calc(1rem * var(--font-scale));
	}

	.diaporama-texte :global(pre code) {
		font-size: 0.8em;
	}

	@container (min-width: 640px) {
		.diaporama-texte {
			--font-scale: 1.4;
		}
	}

	@container (min-width: 960px) {
		.diaporama-texte {
			--font-scale: 1.8;
		}
	}
</style>
