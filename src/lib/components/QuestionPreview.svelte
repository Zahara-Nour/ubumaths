<!--
	Question Preview Component
	==========================

	Live preview of generated question instances.

	FEATURES:
	- Generate instance from template on demand
	- Show generated statement, answer, choices
	- Display validation errors
	- Regenerate button with different seed
	- MathLive rendering for LaTeX

	PROPS:
	- template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>
-->

<script lang="ts">
	import type { QuestionTemplate, QuestionInstance } from '$lib/questions/types';
	import { generateInstance } from '$lib/questions/generator/instance-generator';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { AlertCircle, RefreshCw, Check, X } from 'lucide-svelte';
	import { onMount } from 'svelte';

	interface Props {
		template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
	}

	let { template }: Props = $props();

	let instance = $state<QuestionInstance | null>(null);
	let errors = $state<string[]>([]);
	let isGenerating = $state(false);
	let seed = $state(Math.floor(Math.random() * 1000000));
	let mathLiveLoaded = $state(false);

	// Generate instance
	function generate() {
		isGenerating = true;
		errors = [];
		instance = null;

		// Small delay for visual feedback
		setTimeout(() => {
			try {
				const result = generateInstance(template as QuestionTemplate, seed);

				if (result.success && result.instance) {
					instance = result.instance;
				} else {
					errors = result.errors || ['Erreur inconnue'];
				}
			} catch (error) {
				errors = [error instanceof Error ? error.message : 'Erreur de génération'];
			} finally {
				isGenerating = false;
			}
		}, 100);
	}

	// Regenerate with new seed
	function regenerate() {
		seed = Math.floor(Math.random() * 1000000);
		generate();
	}

	// Render LaTeX with MathLive
	function renderLatex(element: HTMLElement) {
		if (typeof window !== 'undefined' && window.MathfieldElement && mathLiveLoaded) {
			// Use MathLive's renderMathInElement if available
			// For now, just display raw LaTeX
			// TODO: Integrate MathLive rendering
		}
	}

	// Auto-generate on mount and template change
	$effect(() => {
		// Track template changes
		template;
		generate();
	});

	// Load MathLive
	onMount(() => {
		// Check if MathLive is available
		if (typeof window !== 'undefined' && window.MathfieldElement) {
			mathLiveLoaded = true;
		}
	});

	// Render content fields
	function renderContent(fields: { type: 'text' | 'image'; content: string }[]): string {
		return fields
			.map((field) => {
				if (field.type === 'text') {
					return field.content;
				} else {
					return `[Image: ${field.content}]`;
				}
			})
			.join(' ');
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title>Aperçu de la question</Card.Title>
				<Card.Description>
					Instance générée avec graine : <code class="rounded bg-muted px-1">{seed}</code>
				</Card.Description>
			</div>
			<Button onclick={regenerate} disabled={isGenerating} class="gap-2">
				<RefreshCw class="h-4 w-4" />
				Régénérer
			</Button>
		</div>
	</Card.Header>
	<Card.Content>
		{#if isGenerating}
			<div class="flex items-center justify-center py-8">
				<div class="flex items-center gap-3 text-muted-foreground">
					<RefreshCw class="h-5 w-5 animate-spin" />
					<span>Génération en cours...</span>
				</div>
			</div>
		{:else if errors.length > 0}
			<div class="space-y-3">
				<div class="flex items-center gap-2 text-destructive">
					<AlertCircle class="h-5 w-5" />
					<span class="font-semibold">Erreurs de génération</span>
				</div>
				<ul class="space-y-1">
					{#each errors as error}
						<li class="flex items-start gap-2 text-sm text-destructive">
							<X class="mt-0.5 h-4 w-4 flex-shrink-0" />
							<span>{error}</span>
						</li>
					{/each}
				</ul>
			</div>
		{:else if instance}
			<div class="space-y-6">
				<!-- Success indicator -->
				<div class="flex items-center gap-2 text-green-600">
					<Check class="h-5 w-5" />
					<span class="font-semibold">Instance générée avec succès</span>
				</div>

				<!-- Statement -->
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<Badge variant="outline">Énoncé</Badge>
						<Badge>{template.type}</Badge>
					</div>
					<div
						class="rounded-lg border bg-card p-4 font-serif text-lg"
						use:renderLatex
					>
						{renderContent(instance.statement)}
					</div>
				</div>

				<!-- Variables (if any) -->
				{#if instance.resolvedVariables && Object.keys(instance.resolvedVariables).length > 0}
					<div class="space-y-2">
						<Badge variant="outline">Variables résolues</Badge>
						<div class="grid gap-2 md:grid-cols-2">
							{#each Object.entries(instance.resolvedVariables) as [name, value]}
								<div class="flex items-center gap-2 rounded border bg-muted/50 p-2 text-sm">
									<code class="font-semibold">{name}:</code>
									<code>{value}</code>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Answer -->
				<div class="space-y-2">
					<Badge variant="outline">Réponse</Badge>
					<div class="rounded border bg-green-50 p-3 dark:bg-green-950/20">
						{#if Array.isArray(instance.answer)}
							<ul class="space-y-1">
								{#each instance.answer as ans, i}
									<li class="flex items-center gap-2">
										<Badge class="bg-green-600">{i + 1}</Badge>
										<code class="font-mono">{ans}</code>
									</li>
								{/each}
							</ul>
						{:else}
							<code class="font-mono text-lg">{instance.answer}</code>
						{/if}
					</div>
				</div>

				<!-- Choices (for QCM) -->
				{#if instance.shuffledChoices && instance.shuffledChoices.length > 0}
					<div class="space-y-2">
						<Badge variant="outline">Choix (mélangés)</Badge>
						<div class="space-y-2">
							{#each instance.shuffledChoices as choice, i}
								{@const isCorrect =
									(typeof instance.answer === 'string' && instance.answer === String(i)) ||
									(Array.isArray(instance.answer) && instance.answer.includes(String(i)))}
								<div
									class="flex items-center gap-3 rounded border p-3 {isCorrect
										? 'border-green-500 bg-green-50 dark:bg-green-950/20'
										: 'bg-card'}"
								>
									<Badge variant={isCorrect ? 'default' : 'outline'}>
										{String.fromCharCode(65 + i)}
									</Badge>
									<code class="flex-1 font-mono">{choice}</code>
									{#if isCorrect}
										<Check class="h-5 w-5 text-green-600" />
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Correction (if any) -->
				{#if instance.correction}
					<div class="space-y-2">
						<Badge variant="outline">Correction</Badge>
						<div class="rounded-lg border bg-muted/50 p-4 text-sm">
							{renderContent(instance.correction)}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex items-center justify-center py-8 text-muted-foreground">
				<p>Remplissez le formulaire pour voir un aperçu</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
