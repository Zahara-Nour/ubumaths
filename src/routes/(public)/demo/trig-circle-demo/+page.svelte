<!--
	Trig Circle Demo Page
	=====================

	Demonstrates the trigonometric circle markdown tool with various configurations.
-->
<script lang="ts">
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Circle } from 'lucide-svelte';

	// Demo examples with different configurations
	const examples = [
		{
			title: 'Preset: Quarters',
			description: 'Les 4 angles principaux (0, π/2, π, 3π/2)',
			markdown: `\`\`\`trig
preset: quarters
labels: true
\`\`\``
		},
		{
			title: 'Preset: Sixths',
			description: 'Les 12 angles multiples de π/6',
			markdown: `\`\`\`trig
preset: sixths
projections: true
color: blue
\`\`\``
		},
		{
			title: 'Preset: Thirds',
			description: 'Les 6 angles multiples de π/3',
			markdown: `\`\`\`trig
preset: thirds
color: green
\`\`\``
		},
		{
			title: 'Preset: All',
			description: 'Toutes les valeurs remarquables (16 angles)',
			markdown: `\`\`\`trig
preset: all
color: purple
\`\`\``
		},
		{
			title: 'Avec tableau des valeurs',
			description: 'Cercle + tableau cos/sin',
			markdown: `\`\`\`trig
preset: quarters
display: circle+table
color: orange
\`\`\``
		},
		{
			title: 'Tableau seul',
			description: 'Uniquement le tableau des valeurs',
			markdown: `\`\`\`trig
preset: sixths
display: table
\`\`\``
		},
		{
			title: 'Avec projections',
			description: 'Lignes de projection vers les axes',
			markdown: `\`\`\`trig
preset: thirds
projections: true
color: cyan
\`\`\``
		},
		{
			title: 'Angles personnalisés',
			description: 'Angles custom: π/5 et 7π/6',
			markdown: `\`\`\`trig
preset: custom
angles: pi/5, 7*pi/6
color: pink
\`\`\``
		},
		{
			title: 'Équation: cos(x) = 1/2',
			description: 'Solutions de cos(x) = 1/2',
			markdown: `\`\`\`trig
equation: cos(x) = 1/2
mode: arc
color: blue
\`\`\``
		},
		{
			title: 'Équation: sin(x) = √2/2',
			description: 'Solutions de sin(x) = √2/2',
			markdown: `\`\`\`trig
equation: sin(x) = √2/2
mode: arc
color: red
\`\`\``
		},
		{
			title: 'Inéquation: cos(x) > 1/2',
			description: 'Arc solution pour cos(x) > 1/2',
			markdown: `\`\`\`trig
equation: cos(x) > 1/2
mode: arc
color: green
\`\`\``
		},
		{
			title: 'Inéquation: sin(x) < -1/2',
			description: 'Arc solution pour sin(x) < -1/2',
			markdown: `\`\`\`trig
equation: sin(x) < -1/2
mode: arc
color: orange
\`\`\``
		},
		{
			title: 'Mode interactif',
			description: 'Glissez sur le cercle pour explorer',
			markdown: `\`\`\`trig
preset: custom
mode: interactive
display: circle+table
color: purple
\`\`\``
		},
		{
			title: 'Configuration complète',
			description: 'Tous les éléments activés',
			markdown: `\`\`\`trig
preset: quarters
projections: true
grid: true
axes: true
labels: true
values: true
color: blue
\`\`\``
		},
		{
			title: 'Équation avec tableau',
			description: 'cos(x) = -√3/2 avec tableau des solutions',
			markdown: `\`\`\`trig
equation: cos(x) = -√3/2
mode: arc
display: circle+table
color: red
\`\`\``
		}
	];
</script>

<svelte:head>
	<title>Cercle Trigonométrique - Demo | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Hero Section -->
	<div class="mb-12 text-center">
		<div class="mb-4 inline-flex items-center justify-center">
			<Circle class="mr-3 h-12 w-12 text-primary" />
			<h1 class="text-4xl font-bold text-foreground">Cercle Trigonométrique</h1>
		</div>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
			Outil interactif pour visualiser les valeurs remarquables et résoudre des équations
			trigonométriques.
		</p>
	</div>

	<!-- Syntax Reference -->
	<Card.Root class="mb-12">
		<Card.Header>
			<Card.Title>Syntaxe Markdown</Card.Title>
			<Card.Description
				>Utilisez un bloc <code>```trig</code> avec les options suivantes</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<h3 class="mb-2 font-semibold">Options de preset</h3>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><code>preset: quarters</code> - 4 angles (0, π/2, π, 3π/2)</li>
						<li><code>preset: sixths</code> - 12 angles (multiples de π/6)</li>
						<li><code>preset: thirds</code> - 6 angles (multiples de π/3)</li>
						<li><code>preset: all</code> - 16 valeurs remarquables</li>
						<li><code>preset: custom</code> - angles personnalisés</li>
					</ul>
				</div>
				<div>
					<h3 class="mb-2 font-semibold">Options d'affichage</h3>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><code>display: circle</code> - cercle seul (défaut)</li>
						<li><code>display: table</code> - tableau seul</li>
						<li><code>display: circle+table</code> - les deux</li>
						<li><code>projections: true</code> - lignes vers axes</li>
						<li><code>grid: true</code> - grille de fond</li>
					</ul>
				</div>
				<div>
					<h3 class="mb-2 font-semibold">Modes</h3>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><code>mode: points</code> - affichage statique (défaut)</li>
						<li><code>mode: arc</code> - arcs pour équations/inéquations</li>
						<li><code>mode: interactive</code> - glisser pour explorer</li>
					</ul>
				</div>
				<div>
					<h3 class="mb-2 font-semibold">Équations</h3>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><code>equation: cos(x) = 1/2</code></li>
						<li><code>equation: sin(x) &gt; √2/2</code></li>
						<li><code>equation: tan(x) &lt;= 1</code></li>
						<li>Valeurs: 0, 1, -1, 1/2, √2/2, √3/2, √3</li>
					</ul>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Examples Grid -->
	<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
		{#each examples as example (example.title)}
			<Card.Root class="overflow-hidden">
				<Card.Header class="pb-2">
					<Card.Title class="text-lg">{example.title}</Card.Title>
					<Card.Description>{example.description}</Card.Description>
				</Card.Header>
				<Card.Content>
					<!-- Rendered output -->
					<div
						class="mb-4 flex min-h-[280px] items-center justify-center rounded-lg bg-muted/50 p-4"
					>
						<MarkdownRenderer content={example.markdown} />
					</div>

					<!-- Source code -->
					<details class="group">
						<summary
							class="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
						>
							Voir le code source
						</summary>
						<pre class="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">{example.markdown}</pre>
					</details>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Back link -->
	<div class="mt-12 text-center">
		<a href="/demo" class="text-primary hover:underline">← Retour aux démos</a>
	</div>
</div>
