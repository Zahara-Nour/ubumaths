<!--
	QuestionPreviewBaseCard Debug Page
	===================================

	Test page for QuestionPreviewBaseCard component.
	Displays multiple instances with different configurations.
-->

<script lang="ts">
	import type { QuestionInstance } from '$lib/questions/types';
	import QuestionPreviewBaseCard from '$lib/components/questions/QuestionPreviewBaseCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import { resolvedMarkdown } from '$lib/custom-markdown';

	// ============================================================================
	// SAMPLE DATA
	// Note: These are properly typed instances for debug/testing purposes
	// ============================================================================

	const sampleInstance: QuestionInstance = {
		templateId: 'abc-123-def-456-ghi-789',
		type: 'numerical_exact',
		title: 'Résoudre une équation du second degré',
		description: "Exercice de résolution d'équations du second degré avec discriminant positif.",
		exerciseInstruction: 'Calculer',
		statement: resolvedMarkdown(
			"Résoudre l'équation $$x^2 + 3x - 10 = 0$$ dans $$\\mathbb{R}$$."
		),
		solution: '2 ou -5',
		resolvedVariables: [
			{ name: 'a', value: '1' },
			{ name: 'b', value: '3' },
			{ name: 'c', value: '-10' },
			{ name: 'delta', value: '49' }
		],
		correction: {
			feedback: {
				correct: resolvedMarkdown(
					'On calcule le discriminant: $$\\Delta = b^2 - 4ac = 9 + 40 = 49$$\n\n' +
						'Comme $$\\Delta > 0$$, il y a deux solutions réelles distinctes:\n\n' +
						'$$x_1 = \\frac{-b - \\sqrt{\\Delta}}{2a} = \\frac{-3 - 7}{2} = -5$$\n\n' +
						'$$x_2 = \\frac{-b + \\sqrt{\\Delta}}{2a} = \\frac{-3 + 7}{2} = 2$$'
				)
			}
		},
		grades: ['4', '3', '2'],
		theme: 'Algèbre',
		domain: 'Équations',
		subdomain: 'Quadratiques',
		level: 3,
		delay: 120,
		precision: { type: 'none' },
		generatedAt: new Date().toISOString(),
		seed: 42,
		selectedVariationIndex: 1
	};

	const sampleQCMInstance: QuestionInstance = {
		templateId: 'qcm-001-abc-def',
		type: 'multiple_choice',
		title: 'Identifier les nombres premiers',
		statement: resolvedMarkdown('Parmi les nombres suivants, lesquels sont premiers ?'),
		solution: ['1', '3'], // Indices of correct choices
		shuffledChoices: [
			{ content: resolvedMarkdown('$$15$$'), originalIndex: 0 },
			{ content: resolvedMarkdown('$$17$$'), originalIndex: 1 },
			{ content: resolvedMarkdown('$$21$$'), originalIndex: 2 },
			{ content: resolvedMarkdown('$$23$$'), originalIndex: 3 }
		],
		multipleAnswers: true,
		grades: ['6', '5'],
		theme: 'Arithmétique',
		domain: 'Nombres premiers',
		level: 2,
		generatedAt: new Date().toISOString(),
		seed: 123,
		selectedVariationIndex: 0
	};

	const longStatementInstance: QuestionInstance = {
		templateId: 'long-text-001',
		type: 'algebraic_transform',
		title: 'Développer et réduire',
		statement: resolvedMarkdown(
			"Soit l'expression algébrique suivante: $$E = (2x + 3)(x - 5) + (x + 1)^2 - 7x$$. " +
				'On souhaite développer et réduire cette expression pour obtenir une forme polynomiale simplifiée. ' +
				'Attention à bien respecter les règles de distributivité et à regrouper les termes semblables. ' +
				"N'oubliez pas de vérifier votre résultat en remplaçant $$x$$ par une valeur numérique simple."
		),
		solution: '3x^2 - 3x - 8',
		resolvedVariables: [],
		grades: ['4', '3'],
		theme: 'Algèbre',
		domain: 'Calcul littéral',
		subdomain: 'Développement',
		level: 4,
		generatedAt: new Date().toISOString(),
		seed: 789
	};

	// ============================================================================
	// STATE
	// ============================================================================

	let showMetadata = $state(true);
	let showVariables = $state(true);
	let showAnswer = $state(true);
	let showCorrection = $state(true);
	let showTechnicalInfo = $state(true);
	let truncateStatement = $state(false);
	let clickable = $state(false);

	// ============================================================================
	// EVENT HANDLERS
	// ============================================================================

	function handleInstanceClick(instance: QuestionInstance) {
		alert(`Clicked on: ${instance.title}\nTemplate ID: ${instance.templateId}`);
	}
</script>

<div class="container mx-auto space-y-8 py-8">
	<!-- Header -->
	<div class="space-y-2">
		<h1 class="text-3xl font-bold">QuestionPreviewBaseCard Debug</h1>
		<p class="text-muted-foreground">
			Test page for QuestionPreviewBaseCard component with various configurations.
		</p>
	</div>

	<!-- Controls -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Configuration</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={showMetadata} class="rounded" />
					<span class="text-sm">Afficher métadonnées</span>
				</label>

				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={showVariables} class="rounded" />
					<span class="text-sm">Afficher variables</span>
				</label>

				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={showAnswer} class="rounded" />
					<span class="text-sm">Afficher réponse</span>
				</label>

				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={showCorrection} class="rounded" />
					<span class="text-sm">Afficher correction</span>
				</label>

				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={showTechnicalInfo} class="rounded" />
					<span class="text-sm">Afficher infos techniques</span>
				</label>

				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={truncateStatement} class="rounded" />
					<span class="text-sm">Tronquer énoncé</span>
				</label>

				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={clickable} class="rounded" />
					<span class="text-sm">Carte cliquable</span>
				</label>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Examples -->
	<div class="space-y-6">
		<!-- Example 1: Standard Numerical Question -->
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">Exemple 1: Question numérique avec correction</h2>
			<QuestionPreviewBaseCard
				instance={sampleInstance}
				{showMetadata}
				{showVariables}
				{showAnswer}
				{showCorrection}
				{showTechnicalInfo}
				{truncateStatement}
				{clickable}
				onclick={clickable ? handleInstanceClick : undefined}
			/>
		</div>

		<!-- Example 2: QCM with Multiple Answers -->
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">Exemple 2: QCM avec réponses multiples</h2>
			<QuestionPreviewBaseCard
				instance={sampleQCMInstance}
				{showMetadata}
				{showVariables}
				{showAnswer}
				{showCorrection}
				{showTechnicalInfo}
				{truncateStatement}
				{clickable}
				onclick={clickable ? handleInstanceClick : undefined}
			/>
		</div>

		<!-- Example 3: Long Statement -->
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">Exemple 3: Énoncé long (test truncate)</h2>
			<QuestionPreviewBaseCard
				instance={longStatementInstance}
				{showMetadata}
				{showVariables}
				{showAnswer}
				{showCorrection}
				{showTechnicalInfo}
				{truncateStatement}
				statementMaxLength={150}
				{clickable}
				onclick={clickable ? handleInstanceClick : undefined}
			/>
		</div>

		<!-- Example 4: Minimal Configuration -->
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">Exemple 4: Configuration minimale</h2>
			<QuestionPreviewBaseCard
				instance={sampleInstance}
				showMetadata={false}
				showVariables={false}
				showCorrection={false}
				showTechnicalInfo={false}
			/>
		</div>

		<!-- Example 5: All Collapsed -->
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">Exemple 5: Toutes les sections fermées</h2>
			<QuestionPreviewBaseCard
				instance={sampleInstance}
				metadataCollapsed={true}
				variablesCollapsed={true}
				correctionCollapsed={true}
				technicalCollapsed={true}
			/>
		</div>
	</div>
</div>
