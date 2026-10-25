<!--
	Vitrine : le lexique (`/demo/lexique`)
	======================================

	Les mots du dictionnaire soulignés dans une question et dans quelques
	phrases ; un sélecteur de niveau montre que la fiche d'un mot suit l'élève.
	La page de test, avec l'indice et les consignes, reste sur
	`/dev/mots-cliquables` (chantier demo-debug, PR 6d).
-->
<script lang="ts">
	import { demoSeo } from '$lib/seo/demo-pages';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Card from '$lib/components/ui/card';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte';
	import { provideReaderGrade } from '$lib/lexicon/reader-grade';
	import { GRADES, type GradeCode } from '$lib/types/grades';
	import type { QuestionInstance } from '$lib/questions/types';
	import { resolvedMarkdown } from '$lib/ubumark';

	// Types
	interface Sentence {
		markdown: string;
		hint: string;
	}

	// Constantes
	// Niveaux où une fiche change : du primaire aux deux filières de 1re
	const LEVELS: GradeCode[] = ['CM1', '6', '5', '3', '2', '1_SPE', '1_GEN'];

	const QUESTION: QuestionInstance = {
		templateId: 'demo-lexique',
		statement: resolvedMarkdown(
			'Calcule l’aire d’un carré de côté $3$ : $\\mathcal{A}=\\placeholder[0]{}$'
		),
		blanks: [{ expectedAnswer: '9', expectedAnswerLatex: '9', type: 'math' }],
		correction: { steps: [resolvedMarkdown('L’aire du carré vaut $3 \\times 3 = 9$.')] },
		grades: ['6'],
		theme: 'Grandeurs',
		domain: 'Aires',
		level: 1,
		generatedAt: '2026-10-24T00:00:00.000Z'
	};

	// Chaque phrase porte un mot dont la fiche change avec le niveau (vérifié en base)
	const SENTENCES: Sentence[] = [
		{
			markdown: 'Un carré a quatre côtés de même longueur.',
			hint: 'À partir de la 5e, « carré » a aussi un second sens : la puissance, comme dans $5^2$.'
		},
		{
			markdown: 'L’aire d’un rectangle se calcule avec sa longueur et sa largeur.',
			hint: 'En CM1, l’aire se compte en carrés-unités ; à partir de la 6e, la fiche ajoute le produit longueur × largeur.'
		},
		{
			markdown: 'Le périmètre d’un rectangle est la longueur de son contour.',
			hint: 'À partir de la 5e, la fiche ajoute la formule $2 \\times (L + l)$.'
		},
		{
			markdown: 'On étudie la fonction $f : x \\mapsto 2x + 1$.',
			hint: 'Avant la 3e, « fonction » n’est pas encore soulignée : l’élève ne l’a pas vue. En 2de, la fiche ajoute l’ensemble de définition.'
		},
		{
			markdown: 'On étudie la fonction exponentielle.',
			hint: 'En 1re spécialité, c’est la fonction $\\exp$ ; en 1re générale, les fonctions $x \\mapsto a^x$.'
		}
	];

	const levelItems = LEVELS.map((code) => ({ value: code, label: GRADES[code].displayName }));

	// Variables
	let grade = $state<GradeCode>('6');

	// Le niveau choisi remplace celui du lecteur, pour toute la page
	provideReaderGrade(() => grade);
</script>

<SeoHead {...demoSeo('/demo/lexique')} />

<div class="container mx-auto max-w-3xl space-y-6 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-3xl font-bold">Le lexique</h1>
		<p class="text-muted-foreground">
			Les mots soulignés en pointillé ont une fiche : un toucher l’ouvre, sans quitter l’exercice.
			Chaque fiche ne montre que ce que l’élève a déjà vu.
		</p>
	</header>

	<div class="flex flex-wrap items-center gap-3">
		<span class="text-sm font-medium">Niveau de l’élève</span>
		<div class="w-64">
			<MySelect
				type="single"
				bind:value={grade}
				items={levelItems}
				triggerAriaLabel="Niveau de l’élève"
			/>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Dans une question</Card.Title>
			<Card.Description>
				Touchez « aire » ou « carré » : la fiche s’ouvre, la réponse reste à écrire.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<QuestionCard interactive instance={QUESTION} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>La définition suit l’élève</Card.Title>
			<Card.Description>
				Changez de niveau, puis ouvrez de nouveau une fiche : elle s’enrichit au fil des classes.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<ul class="space-y-5">
				{#each SENTENCES as sentence (sentence.markdown)}
					<li class="space-y-1">
						<MarkdownRenderer content={sentence.markdown} lexiconGrade={grade} />
						<div class="text-sm text-muted-foreground">
							<MarkdownRenderer content={sentence.hint} lexiconGrade={null} />
						</div>
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>
</div>
