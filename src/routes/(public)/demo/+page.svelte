<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Sparkles, Palette, FileText, Shapes, Gamepad2, Presentation } from 'lucide-svelte';
	import MathField from '$lib/components/MathField.svelte';
	import DynamicMathField from '$lib/components/DynamicMathField.svelte';
	import FlipCard from '$lib/components/FlipCard.svelte';
	import LoggerDemo from '$lib/components/LoggerDemo.svelte';
	import ToastDemo from '$lib/components/ToastDemo.svelte';
	import type { MathfieldElement } from 'mathlive';
	import { createLogger } from '$lib/utils/logger';

	const logger = createLogger('+page.svelte');

	let latex = $state('');
	let mathfieldRef: any;
	let currentLatex = $state('');
	let flipped = $state(false);
	let flipped2 = $state(false);
	let flipped3 = $state(false);

	function handleInput(latex: string, _mfElement: MathfieldElement) {
		currentLatex = latex;
		logger.trace('Current LaTeX:', latex);
	}

	function setFormula() {
		mathfieldRef?.setValue('x^2 + y^2 = r^2');
	}

	function getFormula() {
		const value = mathfieldRef?.getValue();
		alert(`Current value: ${value}`);
	}

	const demoPages = [
		{
			title: 'VIP Cards Holographiques',
			description: 'Cartes VIP avec effets holographiques 3D interactifs',
			href: '/demo/vip-cards-demo',
			icon: Sparkles,
			color: 'from-purple-500 to-pink-500'
		},
		{
			title: 'Éditeur de Texte Riche',
			description: 'Éditeur TipTap avec formatage, listes, liens et plus',
			href: '/demo/rich-text-editor-demo',
			icon: FileText,
			color: 'from-blue-500 to-cyan-500'
		},
		{
			title: 'Géométrie Interactive',
			description: 'Outils et visualisations de géométrie mathématique',
			href: '/demo/geometry',
			icon: Shapes,
			color: 'from-green-500 to-emerald-500'
		},
		{
			title: 'Test de Thème',
			description: 'Test des modes clair/sombre et palette de couleurs',
			href: '/demo/theme-test',
			icon: Palette,
			color: 'from-orange-500 to-red-500'
		},
		{
			title: 'Mathémo',
			description: 'Wordle mathématique avec termes français par niveau (6ème-Tale)',
			href: '/games/mathemo',
			icon: Gamepad2,
			color: 'from-rose-500 to-pink-500'
		},
		{
			title: 'Trio',
			description: "Jeu mathématique: alignez 3 nombres pour résoudre l'équation",
			href: '/games/trio',
			icon: Gamepad2,
			color: 'from-indigo-500 to-purple-500'
		}
	];
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Hero Section -->
	<div class="mb-12 text-center">
		<div class="mb-4 inline-flex items-center justify-center">
			<Presentation class="mr-3 h-12 w-12 text-primary" />
			<h1 class="text-4xl font-bold text-foreground">Démonstrations de Composants</h1>
		</div>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
			Explorez les différents composants et fonctionnalités de l'application UbuMaths
		</p>
	</div>

	<!-- Demo Pages Grid -->
	<div class="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each demoPages as demo (demo.href)}
			<a href={demo.href} class="group block">
				<Card.Root
					class="h-full border-2 transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
				>
					<Card.Header>
						<div class="mb-2 flex items-start justify-between">
							<div
								class="rounded-lg bg-gradient-to-br p-3 {demo.color} text-white shadow-md transition-shadow group-hover:shadow-lg"
							>
								<!-- Svelte 5: Components are dynamic by default -->
								<demo.icon class="h-6 w-6" />
							</div>
						</div>
						<Card.Title class="text-xl transition-colors group-hover:text-primary">
							{demo.title}
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="text-muted-foreground">{demo.description}</p>
					</Card.Content>
					<Card.Footer>
						<Button variant="ghost" class="w-full group-hover:bg-primary/10">Voir la démo →</Button>
					</Card.Footer>
				</Card.Root>
			</a>
		{/each}
	</div>

	<!-- Divider -->
	<div class="relative my-16">
		<div class="absolute inset-0 flex items-center">
			<div class="w-full border-t border-border"></div>
		</div>
		<div class="relative flex justify-center text-sm">
			<span class="bg-background px-4 font-medium text-muted-foreground"> Démos Intégrées </span>
		</div>
	</div>

	<!-- Inline Demos -->
	<div class="space-y-12">
		<!-- Math Editor Demo -->
		<section>
			<h2 class="mb-4 flex items-center gap-2 text-2xl font-semibold text-foreground">
				<span
					class="inline-block rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 p-2 text-white"
				>
					∫
				</span>
				Éditeur Mathématique Interactif
			</h2>
			<div class="rounded-lg border border-border bg-card p-6">
				<MathField
					bind:value={latex}
					placeholder={'\\text' + '{' + 'Entrez une formule...' + '}'}
				/>

				<div class="mt-6 rounded-lg bg-muted p-4">
					<h3 class="mb-2 font-semibold text-foreground">Sortie LaTeX :</h3>
					<pre class="font-mono text-sm text-foreground">{latex || '(aucune formule)'}</pre>
				</div>

				<div class="mt-6 space-y-4">
					<DynamicMathField
						bind:this={mathfieldRef}
						initialValue="x=\frac{1}{2}"
						placeholder="Tapez des maths ici..."
						oninput={handleInput}
					/>

					<p class="text-sm text-muted-foreground">
						LaTeX actuel : <code class="text-foreground">{currentLatex || '(vide)'}</code>
					</p>

					<div class="flex flex-wrap gap-2">
						<Button size="sm" onclick={setFormula}>Définir la formule</Button>
						<Button size="sm" onclick={getFormula} variant="secondary">Obtenir la formule</Button>
						<Button size="sm" onclick={() => mathfieldRef?.focus()} variant="outline">Focus</Button>
					</div>
				</div>
			</div>
		</section>

		<!-- Flip Card Demo -->
		<section>
			<h2 class="mb-4 flex items-center gap-2 text-2xl font-semibold text-foreground">
				<span
					class="inline-block rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 p-2 text-white"
				>
					⇄
				</span>
				Cartes Retournables
			</h2>
			<div class="grid gap-6 md:grid-cols-3">
				<!-- Card 1: Default -->
				<div>
					<h3 class="mb-3 text-lg font-medium text-foreground">Carte Standard</h3>
					<FlipCard bind:flipped>
						{#snippet front()}
							<div class="card-content front">
								<h3>Recto</h3>
								<p>Cliquez sur le bouton pour retourner la carte !</p>
								<p>Ceci est le contenu du recto.</p>
							</div>
						{/snippet}

						{#snippet back()}
							<div class="card-content back">
								<h3>Verso</h3>
								<p>La hauteur s'adapte dynamiquement !</p>
								<p>Ce côté a plus de contenu pour démontrer la fonction de hauteur dynamique.</p>
								<p>
									Remarquez comment la carte passe en douceur pour s'adapter aux différentes
									hauteurs de contenu.
								</p>
								<ul>
									<li>Premier élément</li>
									<li>Deuxième élément</li>
									<li>Troisième élément</li>
								</ul>
							</div>
						{/snippet}
					</FlipCard>

					<Button onclick={() => (flipped = !flipped)} variant="secondary" class="mt-4 w-full">
						{flipped ? 'Afficher le recto' : 'Afficher le verso'}
					</Button>
				</div>

				<!-- Card 2: Compact -->
				<div>
					<h3 class="mb-3 text-lg font-medium text-foreground">Carte Compacte</h3>
					<FlipCard bind:flipped={flipped2}>
						{#snippet front()}
							<div class="card-content compact-front">
								<h3>Court</h3>
								<p>Contenu minimal</p>
							</div>
						{/snippet}

						{#snippet back()}
							<div class="card-content compact-back">
								<h3>Aussi court</h3>
								<p>Même taille !</p>
							</div>
						{/snippet}
					</FlipCard>

					<Button onclick={() => (flipped2 = !flipped2)} variant="secondary" class="mt-4 w-full">
						{flipped2 ? 'Afficher le recto' : 'Afficher le verso'}
					</Button>
				</div>

				<!-- Card 3: Large -->
				<div>
					<h3 class="mb-3 text-lg font-medium text-foreground">Grande Carte</h3>
					<FlipCard bind:flipped={flipped3}>
						{#snippet front()}
							<div class="card-content large-front">
								<h3>Recto très long</h3>
								<p>Cette carte a beaucoup de contenu sur le recto.</p>
								<ul>
									<li>Élément un avec détails</li>
									<li>Élément deux avec plus d'infos</li>
									<li>Élément trois avec encore plus</li>
									<li>Élément quatre continue</li>
									<li>Élément cinq ajoute de la hauteur</li>
								</ul>
								<p>Encore plus de texte en bas pour la rendre vraiment grande !</p>
							</div>
						{/snippet}

						{#snippet back()}
							<div class="card-content large-back">
								<h3>Verso plus court</h3>
								<p>Ce côté a moins de contenu.</p>
								<p>Mais il correspondra à la hauteur du recto !</p>
							</div>
						{/snippet}
					</FlipCard>

					<Button onclick={() => (flipped3 = !flipped3)} variant="secondary" class="mt-4 w-full">
						{flipped3 ? 'Afficher le recto' : 'Afficher le verso'}
					</Button>
				</div>
			</div>
		</section>

		<!-- Logger Demo -->
		<section>
			<h2 class="mb-4 flex items-center gap-2 text-2xl font-semibold text-foreground">
				<span
					class="inline-block rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 p-2 text-white"
				>
					📝
				</span>
				Système de Journalisation
			</h2>
			<div class="rounded-lg border border-border bg-card p-6">
				<LoggerDemo />
			</div>
		</section>

		<!-- Toast Demo -->
		<section>
			<h2 class="mb-4 flex items-center gap-2 text-2xl font-semibold text-foreground">
				<span
					class="inline-block rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 p-2 text-white"
				>
					🔔
				</span>
				Notifications Toast
			</h2>
			<div class="rounded-lg border border-border bg-card p-6">
				<ToastDemo />
			</div>
		</section>
	</div>
</div>

<style lang="postcss">
	.card-content {
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		min-height: 200px;
	}

	:global(.dark) .card-content {
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
	}

	.front {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.back {
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
		color: white;
	}

	.compact-front {
		background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
		color: #333;
	}

	.compact-back {
		background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
		color: white;
	}

	.large-front {
		background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
		color: #333;
	}

	.large-back {
		background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
		color: #333;
	}
</style>
