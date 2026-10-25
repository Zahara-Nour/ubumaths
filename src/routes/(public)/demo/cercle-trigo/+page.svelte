<!--
	Vitrine : le cercle trigonométrique (`/demo/cercle-trigo`)
	==========================================================

	Quatre exemples du bloc `trig` pour un visiteur, sans le texte du bloc :
	exploration libre, lecture d'un angle, une équation, une inéquation. Le
	catalogue complet, avec la syntaxe, reste sur `/aide-ecriture/cercle-trigo`
	(chantier demo-debug, PR 6b).
-->
<script lang="ts">
	import { demoSeo } from '$lib/seo/demo-pages';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import * as Card from '$lib/components/ui/card';

	// Types
	interface Example {
		title: string;
		description: string;
		markdown: string;
	}

	// Constantes
	const EXAMPLES: Example[] = [
		{
			title: 'Explorer le cercle',
			description:
				'Faites glisser le point sur le cercle : son angle, son cosinus et son sinus se lisent dans le tableau, au fil du déplacement.',
			markdown: `\`\`\`trig
preset: custom
angles: pi/4
mode: interactive
display: circle+table
color: purple
\`\`\``
		},
		{
			title: 'Lire le cosinus et le sinus de π/6',
			description:
				'Le cosinus se lit sur l’axe horizontal, le sinus sur l’axe vertical : cos π/6 = √3/2 et sin π/6 = 1/2.',
			markdown: `\`\`\`trig
preset: custom
angles: pi/6
projections: true
display: circle+table
color: blue
\`\`\``
		},
		{
			title: 'Résoudre cos x = 1/2',
			description: 'Deux points du cercle ont pour abscisse 1/2 : les solutions sont π/3 et 5π/3.',
			markdown: `\`\`\`trig
preset: custom
equation: cos(x) = 1/2
projections: true
color: blue
\`\`\``
		},
		{
			title: 'Résoudre cos x > 1/2',
			description:
				'Les solutions forment un arc du cercle : tous les points dont l’abscisse dépasse 1/2.',
			markdown: `\`\`\`trig
preset: custom
equation: cos(x) > 1/2
mode: arc
color: green
\`\`\``
		}
	];
</script>

<SeoHead {...demoSeo('/demo/cercle-trigo')} />

<div class="mx-auto max-w-5xl space-y-6 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Le cercle trigonométrique</h1>
		<div class="text-muted-foreground">
			Dans les cours et les exercices de Chiphre, le cercle trigonométrique se dessine tout seul :
			on y lit les valeurs remarquables, on y voit les solutions d'une équation ou d'une inéquation.
		</div>
	</header>

	<div class="grid gap-6 md:grid-cols-2">
		{#each EXAMPLES as example (example.title)}
			<Card.Root class="overflow-hidden">
				<Card.Header class="pb-2">
					<h2 class="text-lg font-semibold">{example.title}</h2>
					<Card.Description>{example.description}</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center justify-center rounded-lg bg-muted/50 p-4">
						<MarkdownRenderer content={example.markdown} />
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
