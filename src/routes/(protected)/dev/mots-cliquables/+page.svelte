<!--
	Page de test : mots cliquables et indices
	=========================================

	Pour vérifier à la main, sur tablette ou téléphone, les mots cliquables
	(lot 2 du lexique) et les indices : la fiche s'ouvre au toucher, et toucher
	la case de réponse y place le curseur et ouvre le clavier (#998, #999).
	Aucune donnée : tout est écrit dans la page.
-->
<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import MathField from '$lib/components/MathField.svelte';
	import * as Card from '$lib/components/ui/card';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte';
	import { provideReaderGrade } from '$lib/lexicon/reader-grade';
	import { GRADES, type GradeCode } from '$lib/types/grades';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { ExerciseHint } from '$lib/exercises/types';
	import { resolvedMarkdown } from '$lib/ubumark';

	// Niveaux proposés : de quoi voir changer les définitions et les filières de 1re
	const LEVELS: GradeCode[] = [
		'CM1',
		'6',
		'5',
		'3',
		'2',
		'1_SPE',
		'1_GEN',
		'1_TECHNO',
		'T_SPE',
		'T_EXP'
	];

	const QUESTION: QuestionInstance = {
		templateId: 'demo-mots-cliquables',
		statement: resolvedMarkdown(
			'Calcule l’aire d’un carré de côté $3$ : $\\mathcal{A}=\\placeholder[0]{}$'
		),
		blanks: [{ expectedAnswer: '9', expectedAnswerLatex: '9', type: 'math' }],
		correction: { steps: [resolvedMarkdown('L’aire du carré vaut $3 \\times 3 = 9$.')] },
		grades: ['6'],
		theme: 'Grandeurs',
		domain: 'Aires',
		level: 1,
		generatedAt: '2026-10-10T00:00:00.000Z'
	};

	const HINTS: ExerciseHint[] = [
		{
			id: 'rappel',
			type: 'ubumark',
			title: 'Rappel',
			content: 'Le périmètre d’un carré de côté $c$ est $4c$.'
		}
	];

	const SENTENCES = [
		'Le carré de $5$ vaut $25$, et un carré a quatre côtés de même longueur.',
		'On étudie la fonction exponentielle.',
		'Résous un problème de seuil.',
		'Cet événement est certain.',
		'Une urne contient des boules indiscernables au toucher, et on tire sans remise.',
		'Développe l’expression, puis détermine l’ensemble des solutions.'
	].join('\n\n');

	let grade = $state<GradeCode>('6');
	let answer = $state('');

	// Le niveau choisi remplace celui de l'élève connecté, pour toute la page
	provideReaderGrade(() => grade);

	const levelItems = LEVELS.map((code) => ({ value: code, label: GRADES[code].displayName }));
</script>

<SeoHead
	title="Mots cliquables : page de test"
	description="Page de test des mots cliquables et des indices"
	noindex
/>

<div class="container mx-auto max-w-3xl space-y-6 px-4 py-8">
	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Mots cliquables et indices : page de test</h1>
		<p class="text-muted-foreground">
			À faire sur tablette ou téléphone : toucher un mot souligné en pointillé ouvre sa fiche. Fiche
			ouverte, toucher la case de réponse doit la fermer, y placer le curseur et ouvrir le clavier.
			Même chose avec l’indice.
		</p>
	</header>

	<div class="flex items-center gap-3">
		<span class="text-sm font-medium">Niveau de lecture</span>
		<div class="w-56">
			<MySelect
				type="single"
				bind:value={grade}
				items={levelItems}
				triggerAriaLabel="Niveau de lecture"
			/>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>1. Une question, comme en entraînement</Card.Title>
			<Card.Description>
				Touche « aire » ou « carré », puis la case de réponse. En 5e, « carré » a deux sens.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<QuestionCard interactive instance={QUESTION} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>2. Un indice</Card.Title>
			<Card.Description>Ouvre l’indice, puis touche la case en dessous.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<MarkdownRenderer
				content={'Calcule le périmètre d’un carré de côté $7$. {{hint:rappel}}'}
				hints={HINTS}
				lexiconGrade={grade}
			/>
			<label class="block space-y-1">
				<span class="text-sm font-medium">Ta réponse</span>
				<MathField bind:value={answer} class="w-full rounded border p-2" />
			</label>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>3. Homonymes, filières et graphies</Card.Title>
			<Card.Description>
				Change le niveau de lecture : les définitions suivent l’élève (« carré » en CM1 puis en 5e,
				« fonction exponentielle » en 1re spé puis en 1re générale).
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<MarkdownRenderer content={SENTENCES} lexiconGrade={grade} />
		</Card.Content>
	</Card.Root>
</div>
