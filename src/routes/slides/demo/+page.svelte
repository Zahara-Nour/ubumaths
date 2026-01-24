<script lang="ts">
	import {
		Deck,
		Slide,
		AnnotatableSlide,
		UbuMarkSlide,
		QuestionSlide,
		WhiteboardSlide,
		type SlideChangedEvent
	} from '$lib/slides';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { AnswerData } from '$lib/types/question-display';
	import type { Page } from '$lib/whiteboard/types/document';

	let currentSlide = $state({ h: 0, v: 0 });

	function handleSlideChanged(event: SlideChangedEvent) {
		currentSlide = { h: event.h, v: event.v };
	}

	function handleAnswer(data: AnswerData) {
		console.log('Answer submitted:', data);
	}

	// Example UbuMark content with math
	const mathSlideContent = `
## Formules mathematiques

La formule quadratique : $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

Integrale definie : $\\int_0^1 x^2 \\, dx = \\frac{1}{3}$
`;

	const listSlideContent = `
## Liste avec fragments

- Premier point {.fragment}
- Deuxieme point {.fragment}
- Troisieme point {.fragment}
`;

	const variablesSlideContent = `
## Exercice parametre

Calculer la somme : $5 + 3 = ?$

**Reponse** : $8$
`;

	// Example Question Instance (QCM)
	const qcmQuestion: QuestionInstance = {
		templateId: 'demo-qcm',
		type: 'multiple_choice',
		statement: 'Quel est le resultat de $2^3$ ?',
		solution: '8',
		grades: ['6'],
		theme: 'Calcul',
		domain: 'Puissances',
		level: 1,
		generatedAt: new Date().toISOString(),
		shuffledChoices: [
			{ content: '$6$', originalIndex: 0 },
			{ content: '$8$', originalIndex: 1 },
			{ content: '$9$', originalIndex: 2 },
			{ content: '$16$', originalIndex: 3 }
		],
		choices: [
			{ content: '$6$', isCorrect: false },
			{ content: '$8$', isCorrect: true },
			{ content: '$9$', isCorrect: false },
			{ content: '$16$', isCorrect: false }
		],
		correction: {
			steps: ['$2^3 = 2 \\times 2 \\times 2 = 8$']
		}
	};

	// Example numerical question
	const numericalQuestion: QuestionInstance = {
		templateId: 'demo-numerical',
		type: 'numerical_exact',
		statement: 'Calculer $\\frac{3}{4} + \\frac{1}{4}$',
		solution: '1',
		grades: ['6'],
		theme: 'Calcul',
		domain: 'Fractions',
		level: 1,
		generatedAt: new Date().toISOString(),
		correction: {
			steps: [
				'Les fractions ont le meme denominateur',
				'$\\frac{3}{4} + \\frac{1}{4} = \\frac{3+1}{4} = \\frac{4}{4} = 1$'
			]
		}
	};

	// Example whiteboard page with some content
	const whiteboardPage: Page = {
		id: 'demo-page',
		width: 1024,
		height: 768,
		background: {
			type: 'plain',
			style: 'grid',
			color: '#ffffff',
			gridSpacing: 20,
			gridOpacity: 0.2
		},
		elements: [
			// A rectangle
			{
				id: 'shape-1',
				type: 'shape',
				shapeType: 'rectangle',
				start: { x: 100, y: 100 },
				end: { x: 300, y: 200 },
				color: '#3b82f6',
				strokeWidth: 3,
				opacity: 1,
				fillMode: 'solid',
				fill: '#dbeafe',
				roughness: 1
			},
			// A circle
			{
				id: 'shape-2',
				type: 'shape',
				shapeType: 'circle',
				start: { x: 400, y: 100 },
				end: { x: 550, y: 250 },
				color: '#10b981',
				strokeWidth: 3,
				opacity: 1,
				fillMode: 'hachure',
				fill: '#d1fae5',
				roughness: 1
			},
			// An arrow
			{
				id: 'shape-3',
				type: 'shape',
				shapeType: 'arrow',
				start: { x: 200, y: 350 },
				end: { x: 450, y: 350 },
				color: '#ef4444',
				strokeWidth: 3,
				opacity: 1,
				roughness: 1
			},
			// A line
			{
				id: 'shape-4',
				type: 'shape',
				shapeType: 'line',
				start: { x: 600, y: 150 },
				end: { x: 900, y: 350 },
				color: '#8b5cf6',
				strokeWidth: 2,
				opacity: 1,
				strokeStyle: 'dashed',
				roughness: 1
			}
		]
	};
</script>

<svelte:head>
	<title>UbuSlides Demo</title>
</svelte:head>

<div class="deck-container">
	<Deck onslidechanged={handleSlideChanged}>
		<!-- Slide 1: Title -->
		<Slide background="#1a1a2e">
			<h1>UbuSlides</h1>
			<p>Systeme de presentation pour UbuMaths</p>
			<p class="fragment">Construit avec Svelte 5 + UbuMark</p>
		</Slide>

		<!-- Slide 2: Features (with annotations) -->
		<AnnotatableSlide transition="fade">
			{#snippet content()}
				<h2>Fonctionnalites</h2>
				<ul>
					<li class="fragment">Navigation clavier et tactile</li>
					<li class="fragment">Transitions fluides</li>
					<li class="fragment">Fragments pour reveler le contenu</li>
					<li class="fragment">Support formules mathematiques</li>
					<li class="fragment">Annotations professeur sur toutes les slides!</li>
				</ul>
			{/snippet}
		</AnnotatableSlide>

		<!-- Slide 3: UbuMark with math formulas -->
		<UbuMarkSlide content={mathSlideContent} background="#0f3460" transition="fade" />

		<!-- Slide 4: UbuMark with fragments -->
		<UbuMarkSlide content={listSlideContent} background="#16213e" />

		<!-- Slide 5: UbuMark with variables -->
		<UbuMarkSlide content={variablesSlideContent} variables={{ a: 5, b: 3 }} background="#1a1a2e" />

		<!-- Slide 6: Question QCM -->
		<QuestionSlide instance={qcmQuestion} background="#1e3a5f" onanswer={handleAnswer} />

		<!-- Slide 7: Question Numerique -->
		<QuestionSlide instance={numericalQuestion} background="#2d1b4e" onanswer={handleAnswer} />

		<!-- Slide 8: Whiteboard -->
		<WhiteboardSlide page={whiteboardPage} background="#1a1a2e" />

		<!-- Slide 9: Vertical slides -->
		<Slide background="#16213e">
			{#snippet vertical()}
				<Slide>
					<h2>Slides verticaux</h2>
					<p>Descendez pour voir plus</p>
				</Slide>
				<Slide>
					<h3>Sous-slide 1</h3>
					<p>Contenu organise hierarchiquement</p>
				</Slide>
				<Slide>
					<h3>Sous-slide 2</h3>
					<p>Parfait pour les details</p>
				</Slide>
			{/snippet}
			<h2>Navigation 2D</h2>
			<p>Horizontal et vertical</p>
		</Slide>

		<!-- Slide 10: End -->
		<Slide transition="zoom" background="#e94560">
			<h2>Fin de la demo</h2>
			<p>Slide {currentSlide.h + 1}</p>
		</Slide>
	</Deck>
</div>

<style>
	.deck-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #000;
		/* Base font-size pour slides (peut être reset par Tailwind) */
		font-size: 42px;
	}

	/* Les styles doivent être globaux pour atteindre le contenu des slides */
	.deck-container :global(h1) {
		font-size: 2.5em !important;
		margin-bottom: 0.5em;
	}

	.deck-container :global(h2) {
		font-size: 1.8em !important;
		margin-bottom: 0.5em;
	}

	.deck-container :global(h3) {
		font-size: 1.4em !important;
	}

	.deck-container :global(p) {
		font-size: 1em !important;
	}

	.deck-container :global(ul) {
		text-align: left;
		display: inline-block;
	}

	.deck-container :global(li) {
		margin: 0.5em 0;
		font-size: 0.9em !important;
	}

	.deck-container :global(.math-placeholder) {
		margin-top: 1em;
		padding: 1em;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}

	.deck-container :global(code) {
		font-size: 1.2em;
		color: #ffd700;
	}
</style>
