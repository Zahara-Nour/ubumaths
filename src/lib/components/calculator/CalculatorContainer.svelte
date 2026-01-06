<script lang="ts">
	import type { MathfieldElement } from 'mathlive';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Keyboard, Share2, Download, Trash2 } from 'lucide-svelte';
	import UnifiedInput from './UnifiedInput.svelte';
	import ResultDisplay from './ResultDisplay.svelte';
	import CalculatorKeyboard from './CalculatorKeyboard.svelte';
	import GrapheurContainer from '$lib/components/grapheur/GrapheurContainer.svelte';
	import { calculatorStore } from '$lib/stores/calculator.svelte';
	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { z } from 'zod';

	// Schema for validating shared URL parameters
	const SharedCalcSchema = z.object({
		expr: z
			.string()
			.max(200)
			.refine((s) => !s.trim().startsWith('.'), 'Commands not allowed'),
		result: z.string().max(200).optional()
	});

	let activeTab = $state('calc');
	let showKeyboard = $state(false);

	// Référence au MathField pour injecter les touches du clavier
	let mathFieldElement = $state<MathfieldElement | null>(null);

	// Reactive window width for mobile detection
	let windowWidth = $state(browser ? window.innerWidth : 0);

	$effect(() => {
		if (!browser) return;

		function handleResize() {
			windowWidth = window.innerWidth;
		}

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	let isMobile = $derived(windowWidth < 768);

	/**
	 * Gère la soumission depuis UnifiedInput
	 */
	async function handleSubmit(input: {
		type: 'expression' | 'command';
		command?: string;
		expression: string;
	}) {
		await calculatorStore.execute(input);
	}

	/**
	 * Injecte une valeur dans le MathField via le clavier virtuel
	 */
	function handleKeyboardInput(value: string) {
		if (mathFieldElement) {
			mathFieldElement.executeCommand(['insert', value]);
		}
	}

	/**
	 * Efface le dernier caractère
	 */
	function handleBackspace() {
		if (mathFieldElement) {
			mathFieldElement.executeCommand('deleteBackward');
		}
	}

	/**
	 * Efface l'input courant
	 */
	function handleClear() {
		if (mathFieldElement) {
			mathFieldElement.setValue('');
		}
	}

	/**
	 * Efface tout (input + historique)
	 */
	function handleAllClear() {
		handleClear();
		calculatorStore.clearHistory();
	}

	/**
	 * Soumet depuis le clavier (bouton =)
	 */
	function handleKeyboardSubmit() {
		if (mathFieldElement) {
			const value = mathFieldElement.getValue('latex');
			if (value) {
				handleSubmit({ type: 'expression', expression: value });
				handleClear();
			}
		}
	}

	/**
	 * Trace une expression dans le grapheur
	 * Ajoute la fonction au grapheurStore et bascule vers l'onglet Graphique
	 */
	function handlePlot(expression: string) {
		grapheurStore.addFunction(expression);
		activeTab = 'graph';
	}

	/**
	 * Partage l'historique via URL base64 (avec limites de taille)
	 */
	async function handleShare() {
		if (!calculatorStore.hasHistory) {
			toaster.warning('Aucun calcul à partager');
			return;
		}

		const lastResult = calculatorStore.lastResult;

		// Truncate if too long
		const maxLen = 150;
		const expr =
			lastResult.input.length > maxLen
				? lastResult.input.slice(0, maxLen) + '...'
				: lastResult.input;
		const result = lastResult.output.slice(0, maxLen);

		const data = { expr, result };
		const encoded = btoa(encodeURIComponent(JSON.stringify(data)));

		// Final safety check
		if (encoded.length > 400) {
			toaster.error('Expression trop longue pour partager');
			return;
		}

		const shareUrl = `${page.url.origin}/calc?share=${encoded}`;

		try {
			await navigator.clipboard.writeText(shareUrl);
			toaster.success('Lien copié dans le presse-papiers');
		} catch {
			toaster.error('Impossible de copier le lien');
		}
	}

	/**
	 * Exporte l'historique en texte
	 */
	function handleExportText() {
		if (!calculatorStore.hasHistory) {
			toaster.warning('Aucun calcul à exporter');
			return;
		}

		const lines = calculatorStore.history.map((r) => {
			const status = r.isError ? '[ERREUR]' : '';
			return `${r.input} = ${r.output} ${status}`.trim();
		});

		const text = lines.join('\n');
		downloadFile('calculs.txt', text, 'text/plain');
		toaster.success('Historique exporté');
	}

	/**
	 * Exporte l'historique en LaTeX
	 */
	function handleExportLatex() {
		if (!calculatorStore.hasHistory) {
			toaster.warning('Aucun calcul à exporter');
			return;
		}

		const lines = calculatorStore.history.map((r) => {
			if (r.isError) {
				return `% Erreur: ${r.input}`;
			}
			return `${r.input} &= ${r.output} \\\\`;
		});

		const latex = `\\begin{align*}\n${lines.join('\n')}\n\\end{align*}`;
		downloadFile('calculs.tex', latex, 'text/plain');
		toaster.success('Export LaTeX créé');
	}

	/**
	 * Télécharge un fichier texte
	 */
	function downloadFile(filename: string, content: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Track if share URL was already processed (run-once)
	let shareUrlProcessed = $state(false);

	// Charger une expression partagée depuis l'URL (avec validation sécurité)
	$effect(() => {
		if (!browser || shareUrlProcessed) return;

		const shareParam = page.url.searchParams.get('share');
		if (!shareParam || shareParam.length > 500) return; // Size limit

		try {
			const decoded = JSON.parse(decodeURIComponent(atob(shareParam)));
			const validation = SharedCalcSchema.safeParse(decoded);

			if (!validation.success) {
				console.warn('Invalid share URL:', validation.error);
				toaster.error('Lien de partage invalide');
			} else {
				// Execute the shared expression
				calculatorStore.execute({ type: 'expression', expression: validation.data.expr });
				toaster.success('Expression partagée chargée');
			}

			// Clean URL regardless of validation result
			const url = new URL(page.url);
			url.searchParams.delete('share');
			window.history.replaceState({}, '', url.toString());
			shareUrlProcessed = true;
		} catch {
			console.error('Invalid share URL encoding');
			toaster.error('Lien de partage corrompu');
		}
	});
</script>

<Tabs.Root bind:value={activeTab} class="w-full">
	<Tabs.List class="grid w-full grid-cols-2">
		<Tabs.Trigger value="calc">Calcul</Tabs.Trigger>
		<Tabs.Trigger value="graph">Graphique</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="calc" class="mt-4 space-y-4">
		<!-- Zone de saisie -->
		<div class="rounded-lg border border-border bg-card p-4">
			<UnifiedInput onSubmit={handleSubmit} bind:mathFieldElement />
		</div>

		<!-- Historique des résultats -->
		{#if calculatorStore.hasHistory}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-medium text-muted-foreground">Historique</h3>
					<div class="flex gap-1">
						<Button
							variant="ghost"
							size="sm"
							onclick={handleShare}
							class="h-7 gap-1 px-2 text-xs"
							aria-label="Partager le dernier calcul"
						>
							<Share2 class="size-3" />
							<span class="hidden sm:inline">Partager</span>
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={handleExportLatex}
							class="h-7 gap-1 px-2 text-xs"
							aria-label="Exporter en LaTeX"
						>
							<Download class="size-3" />
							<span class="hidden sm:inline">LaTeX</span>
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={handleExportText}
							class="h-7 gap-1 px-2 text-xs"
							aria-label="Exporter en texte"
						>
							<Download class="size-3" />
							<span class="hidden sm:inline">Texte</span>
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => calculatorStore.clearHistory()}
							class="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
							aria-label="Effacer l'historique"
						>
							<Trash2 class="size-3" />
							<span class="hidden sm:inline">Effacer</span>
						</Button>
					</div>
				</div>
				<div class="max-h-[300px] space-y-2 overflow-y-auto">
					{#each calculatorStore.history as result (result.id)}
						<ResultDisplay {result} onPlot={handlePlot} />
					{/each}
				</div>
			</div>
		{/if}

		<!-- Toggle clavier (desktop uniquement) -->
		{#if !isMobile}
			<div class="flex justify-center">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (showKeyboard = !showKeyboard)}
					class="gap-2"
				>
					<Keyboard class="size-4" />
					{showKeyboard ? 'Masquer le clavier' : 'Afficher le clavier'}
				</Button>
			</div>
		{/if}

		<!-- Clavier virtuel -->
		<CalculatorKeyboard
			visible={isMobile || showKeyboard}
			onInput={handleKeyboardInput}
			onSubmit={handleKeyboardSubmit}
			onBackspace={handleBackspace}
			onClear={handleClear}
			onAllClear={handleAllClear}
		/>
	</Tabs.Content>

	<Tabs.Content value="graph" class="mt-4">
		<div class="h-[600px] rounded-lg border border-border">
			<GrapheurContainer />
		</div>
	</Tabs.Content>
</Tabs.Root>
