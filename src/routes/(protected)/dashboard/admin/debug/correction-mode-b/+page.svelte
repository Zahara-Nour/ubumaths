<!--
	Mode B Generated Correction — Debug Page
	=========================================

	Debug page for the new Mode B pedagogical correction steps.
	Loads the demo fixtures from `__tests__/fixtures/generated-steps-demo.ts`,
	runs them through `generateInstance()` (which auto-calls `generateCorrection()`),
	and displays the result via `<CorrectionCard>`.

	URL : /dashboard/admin/debug/correction-mode-b
-->

<script lang="ts">
	import { generateInstance } from '$lib/questions/generator/instance-generator';
	import {
		additionGroupingDemo,
		linearEquationDemo
	} from '$lib/questions/__tests__/fixtures/generated-steps-demo';
	import CorrectionCard from '$lib/components/questions/CorrectionCard.svelte';
	import GeneratedStepsCorrection from '$lib/components/questions/GeneratedStepsCorrection.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { TestAnswerResult } from '$lib/types/test';

	// ============================================================================
	// Generate instances from fixtures (deterministic via seed)
	// ============================================================================

	const arithmeticResult = generateInstance(additionGroupingDemo, 1);
	const linearResult = generateInstance(linearEquationDemo, 1);

	function buildAnswerResult(
		result: ReturnType<typeof generateInstance>,
		index: number,
		makeCorrect: boolean
	): TestAnswerResult | null {
		if (!result.success) return null;
		return {
			index,
			instance: result.instance,
			userAnswer: {
				value: makeCorrect ? (result.instance.blanks?.[0]?.expectedAnswer ?? '') : '999',
				isCorrect: makeCorrect,
				timeSpent: 12,
				attempts: 1,
				submittedAt: new Date().toISOString()
			},
			isCorrect: makeCorrect,
			timeSpent: 12,
			attempts: 1
		};
	}

	const arithmeticCorrect = buildAnswerResult(arithmeticResult, 0, true);
	const arithmeticIncorrect = buildAnswerResult(arithmeticResult, 1, false);
	const linearCorrect = buildAnswerResult(linearResult, 0, true);
	const linearIncorrect = buildAnswerResult(linearResult, 1, false);

	// ============================================================================
	// Raw step inspector
	// ============================================================================

	let showJson = $state(false);
	const arithmeticSteps = $derived(
		arithmeticResult.success ? arithmeticResult.instance.correction?._renderedSteps : undefined
	);
	const linearSteps = $derived(
		linearResult.success ? linearResult.instance.correction?._renderedSteps : undefined
	);
</script>

<svelte:head>
	<title>Debug — Correction Mode B</title>
</svelte:head>

<div class="container mx-auto space-y-8 p-6">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold">Mode B — Generated correction steps</h1>
		<p class="text-muted-foreground">
			Démo des deux fixtures Mode B (CM2 arithmétique + 4e équation linéaire). Cliquer sur l'icône ↻
			d'une carte pour basculer sur la correction détaillée.
		</p>
	</header>

	<!-- ============================================================================
		 Generation status
		 ============================================================================ -->

	<Card.Root>
		<Card.Header>
			<Card.Title>État de la génération</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-2 text-sm">
			<div>
				<span class="font-mono">additionGroupingDemo</span> :
				{#if arithmeticResult.success}
					<span class="text-green-600">✓ {arithmeticSteps?.length ?? 0} étapes générées</span>
				{:else}
					<span class="text-red-600">✗ {arithmeticResult.errors.join(', ')}</span>
				{/if}
			</div>
			<div>
				<span class="font-mono">linearEquationDemo</span> :
				{#if linearResult.success}
					<span class="text-green-600">✓ {linearSteps?.length ?? 0} étapes générées</span>
				{:else}
					<span class="text-red-600">✗ {linearResult.errors.join(', ')}</span>
				{/if}
			</div>
			<Button variant="outline" size="sm" onclick={() => (showJson = !showJson)}>
				{showJson ? 'Masquer' : 'Afficher'} le JSON brut des RenderedStep[]
			</Button>
			{#if showJson}
				<pre class="mt-3 max-h-96 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(
						{ arithmetic: arithmeticSteps, linear: linearSteps },
						null,
						2
					)}</pre>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- ============================================================================
		 Direct GeneratedStepsCorrection (no flip)
		 ============================================================================ -->

	<section class="space-y-4">
		<h2 class="text-2xl font-semibold">
			Aperçu direct de <code class="text-base">&lt;GeneratedStepsCorrection&gt;</code>
		</h2>
		<p class="text-sm text-muted-foreground">
			Vue isolée du composant, sans le flip / l'enveloppe TestAnswerResult.
		</p>

		<div class="grid gap-6 md:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>CM2 — arithmétique</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if arithmeticSteps}
						<GeneratedStepsCorrection steps={arithmeticSteps} />
					{:else}
						<p class="text-muted-foreground">Aucune étape générée.</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>4e — équation linéaire</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if linearSteps}
						<GeneratedStepsCorrection steps={linearSteps} />
					{:else}
						<p class="text-muted-foreground">Aucune étape générée.</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<!-- ============================================================================
		 CorrectionCard integration
		 ============================================================================ -->

	<section class="space-y-4">
		<h2 class="text-2xl font-semibold">
			<code class="text-base">&lt;CorrectionCard&gt;</code> — flux complet
		</h2>
		<p class="text-sm text-muted-foreground">
			Recto : énoncé + réponse de l'élève + réponse correcte. Cliquer sur ↻ (en bas à droite) pour
			afficher la correction Mode B.
		</p>

		<div class="grid gap-6 md:grid-cols-2">
			{#if arithmeticCorrect}
				<div>
					<h3 class="mb-2 text-lg font-medium">CM2 — réponse correcte</h3>
					<CorrectionCard answerResult={arithmeticCorrect} questionNumber={1} size="md" />
				</div>
			{/if}
			{#if arithmeticIncorrect}
				<div>
					<h3 class="mb-2 text-lg font-medium">CM2 — réponse incorrecte</h3>
					<CorrectionCard answerResult={arithmeticIncorrect} questionNumber={2} size="md" />
				</div>
			{/if}
			{#if linearCorrect}
				<div>
					<h3 class="mb-2 text-lg font-medium">4e — réponse correcte</h3>
					<CorrectionCard answerResult={linearCorrect} questionNumber={3} size="md" />
				</div>
			{/if}
			{#if linearIncorrect}
				<div>
					<h3 class="mb-2 text-lg font-medium">4e — réponse incorrecte</h3>
					<CorrectionCard answerResult={linearIncorrect} questionNumber={4} size="md" />
				</div>
			{/if}
		</div>
	</section>
</div>
