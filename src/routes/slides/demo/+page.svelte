<script lang="ts">
	import {
		Deck,
		Slide,
		AnnotatableSlide,
		UbuMarkSlide,
		QuestionSlide,
		WhiteboardSlide,
		Code,
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

	// UbuMark content examples
	const markdownExample = `
## Support Markdown

Ecrivez du contenu en **Markdown** avec UbuMark.

- Listes a puces
- Formules $E = mc^2$
- Et plus encore...
`;

	const mathExample = `
## Formules Mathematiques

La formule quadratique :

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

Integrale definie : $\\int_0^1 x^2 \\, dx = \\frac{1}{3}$
`;

	// Example QCM Question
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

	// Example whiteboard page
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
			}
		]
	};
</script>

<svelte:head>
	<title>UbuSlides Demo</title>
</svelte:head>

<div class="deck-container">
	<Deck onslidechanged={handleSlideChanged}>
		<!-- ============================================ -->
		<!-- INTRO -->
		<!-- ============================================ -->

		<Slide background="#1a1a2e">
			<h1>UbuSlides</h1>
			<h3>Systeme de presentation pour UbuMaths</h3>
			<p>
				<small
					>Inspire de <a href="https://revealjs.com">reveal.js</a> - Construit avec Svelte 5</small
				>
			</p>
		</Slide>

		<Slide background="#1a1a2e">
			<h2>Bienvenue</h2>
			<p>
				UbuSlides permet de creer des presentations interactives avec support mathematique integre.
			</p>
		</Slide>

		<!-- ============================================ -->
		<!-- VERTICAL SLIDES -->
		<!-- ============================================ -->

		<Slide background="#2d3436">
			{#snippet vertical()}
				<Slide>
					<h2>Slides Verticaux</h2>
					<p>Les slides peuvent etre imbriquees.</p>
					<p>Utilisez les fleches <strong>haut/bas</strong> pour naviguer.</p>
					<br />
					<p style="font-size: 0.6em; opacity: 0.7;">↓ Descendez ↓</p>
				</Slide>
				<Slide>
					<h2>Niveau 1</h2>
					<p>
						Les slides verticaux sont utiles pour ajouter des details sous une slide principale.
					</p>
				</Slide>
				<Slide>
					<h2>Niveau 2</h2>
					<p>C'est tout, remontons !</p>
					<p style="font-size: 0.6em; opacity: 0.7;">↑ ou → pour continuer</p>
				</Slide>
			{/snippet}
			<h2>Navigation 2D</h2>
			<p>Horizontal et vertical</p>
		</Slide>

		<!-- ============================================ -->
		<!-- TRANSITIONS -->
		<!-- ============================================ -->

		<Slide transition="fade" background="#0f3460">
			<h2>Styles de Transition</h2>
			<p>Plusieurs transitions disponibles :</p>
			<p style="font-size: 0.8em;">
				<strong>None</strong> -
				<strong>Fade</strong> -
				<strong>Slide</strong> -
				<strong>Convex</strong> -
				<strong>Concave</strong> -
				<strong>Zoom</strong>
			</p>
		</Slide>

		<Slide transition="slide" background="#1e3a5f">
			<h2>Transition: Slide</h2>
			<p>Glissement horizontal</p>
		</Slide>

		<Slide transition="convex" background="#2d3436">
			<h2>Transition: Convex</h2>
			<p>Rotation 3D vers l'exterieur</p>
		</Slide>

		<Slide transition="concave" background="#1e272e">
			<h2>Transition: Concave</h2>
			<p>Rotation 3D vers l'interieur</p>
		</Slide>

		<Slide transition="zoom" background="#4a1942">
			<h2>Transition: Zoom</h2>
			<p>Effet de zoom avant/arriere</p>
		</Slide>

		<!-- ============================================ -->
		<!-- FRAGMENTS -->
		<!-- ============================================ -->

		<Slide background="#16213e">
			{#snippet vertical()}
				<Slide>
					<h2>Fragments</h2>
					<p>Appuyez sur la fleche suivante...</p>
					<p class="fragment">... pour reveler progressivement...</p>
					<p>
						<span class="fragment">... une</span>
						<span class="fragment">slide</span>
						<span class="fragment">fragmentee.</span>
					</p>
				</Slide>
				<Slide>
					<h2>Styles de Fragments</h2>
					<p>Differents types de fragments :</p>
					<p class="fragment grow">grow</p>
					<p class="fragment shrink">shrink</p>
					<p class="fragment fade-out">fade-out</p>
					<p>
						<span class="fragment slide-right" style="display: inline-block;">slide-right, </span>
						<span class="fragment slide-up" style="display: inline-block;">up, </span>
						<span class="fragment slide-down" style="display: inline-block;">down, </span>
						<span class="fragment slide-left" style="display: inline-block;">left</span>
					</p>
					<p>
						Highlight <span class="fragment highlight-red">red</span>
						<span class="fragment highlight-blue">blue</span>
						<span class="fragment highlight-green">green</span>
					</p>
				</Slide>
			{/snippet}
			<h2>Fragments</h2>
			<p>Revelez le contenu progressivement</p>
		</Slide>

		<!-- ============================================ -->
		<!-- BACKGROUNDS -->
		<!-- ============================================ -->

		<Slide background="#dddddd">
			{#snippet vertical()}
				<Slide>
					<h2 style="color: #333;">Arriere-plans</h2>
					<p style="color: #333;">
						Utilisez <code>background="#dddddd"</code> pour changer la couleur.
					</p>
					<p style="font-size: 0.6em; opacity: 0.7; color: #333;">↓ Descendez ↓</p>
				</Slide>
				<Slide background="linear-gradient(to bottom, #283b95, #17b2c3)">
					<h2>Gradients</h2>
					<p>Utilisez des gradients CSS</p>
					<p style="font-size: 0.6em;">
						<code style="color: #fff;">background="linear-gradient(...)"</code>
					</p>
				</Slide>
				<Slide
					backgroundImage="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
					backgroundSize="cover"
				>
					<div style="background: rgba(0,0,0,0.6); padding: 1em 2em; border-radius: 10px;">
						<h2>Images</h2>
						<p>Arriere-plans avec images</p>
						<p style="font-size: 0.6em;">
							<code>backgroundImage="url..."</code>
						</p>
					</div>
				</Slide>
				<Slide
					backgroundImage="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80"
					backgroundRepeat="repeat"
					backgroundSize="200px"
				>
					<div style="background: rgba(0,0,0,0.7); padding: 1em 2em; border-radius: 10px;">
						<h2 style="color: #fff;">Motifs repetes</h2>
						<p style="color: #fff;">Images en mosaique</p>
						<p style="font-size: 0.6em; color: #fff;">
							<code>backgroundRepeat="repeat"</code>
						</p>
					</div>
				</Slide>
				<Slide
					backgroundVideo="https://static.slid.es/site/homepage/v1/homepage-video-editor.mp4"
					background="#000"
				>
					<div style="background: rgba(0,0,0,0.8); padding: 1em 2em; border-radius: 10px;">
						<h2>Videos</h2>
						<p>Arriere-plans video</p>
						<p style="font-size: 0.6em;">
							<code>backgroundVideo="url..."</code>
						</p>
					</div>
				</Slide>
				<Slide
					backgroundIframe="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&controls=0"
					background="#000"
				>
					<div
						style="background: rgba(0,0,0,0.8); padding: 1em 2em; border-radius: 10px; position: relative; z-index: 10;"
					>
						<h2>Iframes</h2>
						<p>Contenu web en arriere-plan</p>
						<p style="font-size: 0.6em;">
							<code>backgroundIframe="url..."</code>
						</p>
					</div>
				</Slide>
				<Slide backgroundImage="https://i.giphy.com/90F8aUepslB84.gif" backgroundSize="cover">
					<div style="background: rgba(0,0,0,0.6); padding: 1em 2em; border-radius: 10px;">
						<h2>... et les GIFs !</h2>
						<p style="font-size: 0.7em;">Les GIFs animes fonctionnent aussi</p>
					</div>
				</Slide>
			{/snippet}
			<h2 style="color: #333;">Arriere-plans de Slides</h2>
			<p style="color: #333;">Couleurs, gradients, images, videos, iframes</p>
		</Slide>

		<!-- Background Transitions -->
		<Slide transition="slide" background="#4d7e65" backgroundTransition="zoom">
			<h2>Transitions d'arriere-plan</h2>
			<p>L'arriere-plan peut avoir une transition differente du contenu</p>
			<p style="font-size: 0.6em;">
				<code>transition="slide" backgroundTransition="zoom"</code>
			</p>
		</Slide>

		<Slide transition="slide" background="#b5533c" backgroundTransition="zoom">
			<h2>Transitions d'arriere-plan</h2>
			<p>Ici le contenu glisse, mais l'arriere-plan fait un zoom</p>
		</Slide>

		<!-- Interactive Iframe -->
		<Slide
			backgroundIframe="https://en.wikipedia.org/wiki/Mathematics"
			backgroundInteractive={true}
			background="#000"
		>
			<div
				style="position: absolute; width: 40%; right: 2em; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.9); padding: 1.5em; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"
			>
				<h2 style="font-size: 1.2em;">Iframe Interactif</h2>
				<p style="font-size: 0.7em;">Vous pouvez interagir avec la page en arriere-plan !</p>
				<p style="font-size: 0.5em; opacity: 0.8;">
					<code>backgroundInteractive={'{true}'}</code>
				</p>
			</div>
		</Slide>

		<!-- ============================================ -->
		<!-- UBUMARK / MARKDOWN -->
		<!-- ============================================ -->

		<UbuMarkSlide content={markdownExample} background="#0f3460" transition="fade" />

		<UbuMarkSlide content={mathExample} background="#16213e" transition="fade" />

		<!-- ============================================ -->
		<!-- ANNOTATIONS -->
		<!-- ============================================ -->

		<AnnotatableSlide transition="fade">
			{#snippet content()}
				<h2>Annotations</h2>
				<p>Les enseignants peuvent annoter les slides en direct !</p>
				<ul>
					<li class="fragment">Crayon et surligneur</li>
					<li class="fragment">Plusieurs couleurs</li>
					<li class="fragment">Undo/Redo</li>
					<li class="fragment">Effacement</li>
				</ul>
				<p class="fragment" style="font-size: 0.7em; opacity: 0.8;">
					Utilisez la barre d'outils en bas pour dessiner
				</p>
			{/snippet}
		</AnnotatableSlide>

		<!-- ============================================ -->
		<!-- QUESTIONS -->
		<!-- ============================================ -->

		<Slide background="#1e3a5f" transition="fade">
			<h2>Questions Interactives</h2>
			<p>Integrez des questions directement dans vos presentations</p>
			<ul>
				<li class="fragment">QCM (choix multiples)</li>
				<li class="fragment">Reponses numeriques</li>
				<li class="fragment">Correction automatique</li>
			</ul>
		</Slide>

		<QuestionSlide instance={qcmQuestion} background="#2d1b4e" onanswer={handleAnswer} />

		<!-- ============================================ -->
		<!-- WHITEBOARD -->
		<!-- ============================================ -->

		<Slide background="#1a1a2e" transition="fade">
			<h2>Tableau Blanc</h2>
			<p>Integrez un tableau blanc interactif</p>
			<ul>
				<li class="fragment">Formes geometriques</li>
				<li class="fragment">Dessin libre</li>
				<li class="fragment">Style "fait main" (Rough.js)</li>
			</ul>
		</Slide>

		<WhiteboardSlide page={whiteboardPage} background="#1a1a2e" />

		<!-- ============================================ -->
		<!-- NAVIGATION -->
		<!-- ============================================ -->

		<Slide background="#2d3436" transition="fade">
			<h2>Navigation</h2>
			<p>Optimise pour le tactile et le clavier</p>
			<table style="font-size: 0.7em; margin: 0 auto;">
				<tbody>
					<tr>
						<td><strong>Fleches</strong></td>
						<td>Navigation directionnelle</td>
					</tr>
					<tr>
						<td><strong>Espace</strong></td>
						<td>Slide/fragment suivant</td>
					</tr>
					<tr>
						<td><strong>Echap</strong></td>
						<td>Vue d'ensemble</td>
					</tr>
					<tr>
						<td><strong>B / .</strong></td>
						<td>Pause (ecran noir)</td>
					</tr>
					<tr>
						<td><strong>Swipe</strong></td>
						<td>Navigation tactile</td>
					</tr>
				</tbody>
			</table>
		</Slide>

		<!-- ============================================ -->
		<!-- CODE SLIDES -->
		<!-- ============================================ -->

		<Slide background="#1a1a2e" transition="fade">
			<h2>Slides de Code</h2>
			<p>Coloration syntaxique avec highlight.js</p>
			<ul>
				<li class="fragment">Nombreux langages supportes</li>
				<li class="fragment">Numeros de ligne optionnels</li>
				<li class="fragment">Mise en surbrillance de lignes</li>
				<li class="fragment">Animation progressive</li>
			</ul>
		</Slide>

		<Slide background="#282c34" transition="fade">
			<h2>TypeScript</h2>
			<Code language="typescript" lineNumbers>
				{`interface User {
  id: string;
  name: string;
  email: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}`}
			</Code>
		</Slide>

		<Slide background="#282c34" transition="fade">
			<h2>Python</h2>
			<Code language="python" lineNumbers>
				{`def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence."""
    if n <= 0:
        return []

    fib = [0, 1]
    while len(fib) < n:
        fib.append(fib[-1] + fib[-2])
    return fib[:n]

# Usage
print(fibonacci(10))`}
			</Code>
		</Slide>

		<Slide background="#282c34" transition="fade">
			<h2>Mise en surbrillance</h2>
			<p style="font-size: 0.6em; margin-bottom: 0.5em;">
				<code>highlightLines="2,5-7"</code>
			</p>
			<Code language="javascript" lineNumbers highlightLines="2,5-7">
				{`// Basic example
const message = "Highlighted!";

function process(data) {
  // These lines are
  // also highlighted
  return data.map(x => x * 2);
}

console.log(message);`}
			</Code>
		</Slide>

		<Slide background="#282c34" transition="fade">
			<h2>Animation progressive</h2>
			<p style="font-size: 0.6em; margin-bottom: 0.5em;">
				<code>animateLines="|1-3|5-7|9"</code>
			</p>
			<Code language="javascript" lineNumbers animateLines="|1-3|5-7|9">
				{`// Step 1: Define function
function calculate(a, b) {
  return a + b;
}

// Step 2: Call function
const x = calculate(5, 3);
const y = calculate(10, 20);

// Step 3: Output
console.log(x, y);`}
			</Code>
		</Slide>

		<Slide background="#282c34" transition="fade">
			<h2>Svelte 5</h2>
			<!-- eslint-disable @typescript-eslint/no-unused-vars -->
			<Code language="svelte" lineNumbers>
				{`<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<button onclick={() => count++}>
  Count: {count}, Double: {doubled}
</button>`}
			</Code>
			<!-- eslint-enable @typescript-eslint/no-unused-vars -->
		</Slide>

		<!-- ============================================ -->
		<!-- FEATURES -->
		<!-- ============================================ -->

		<Slide background="#1e272e" transition="fade">
			<h2>Et plus encore...</h2>
			<ul>
				<li class="fragment">Support RTL</li>
				<li class="fragment">API JavaScript</li>
				<li class="fragment">Navigation par hash (#/2/1)</li>
				<li class="fragment">Barre de progression</li>
				<li class="fragment">Numerotation des slides</li>
			</ul>
		</Slide>

		<!-- ============================================ -->
		<!-- END -->
		<!-- ============================================ -->

		<Slide transition="zoom" background="#e94560">
			<h1>FIN</h1>
			<p>
				Slide {currentSlide.h + 1}{currentSlide.v > 0 ? `.${currentSlide.v + 1}` : ''}
			</p>
			<p style="font-size: 0.7em;">
				<a href="https://github.com/ubumaths" style="color: white;">Code source</a>
			</p>
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
	}

	/* Layout styles */
	.deck-container :global(ul) {
		text-align: left;
		display: inline-block;
	}

	.deck-container :global(table) {
		border-collapse: collapse;
	}

	.deck-container :global(td) {
		padding: 0.5em 1em;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
	}

	.deck-container :global(a) {
		color: #42affa;
	}

	.deck-container :global(code) {
		color: #ffd700;
		background: rgba(255, 255, 255, 0.1);
		padding: 0.1em 0.3em;
		border-radius: 4px;
	}
</style>
