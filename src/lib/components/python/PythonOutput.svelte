<script lang="ts">
	/**
	 * PythonOutput - Display Python execution results
	 *
	 * Features:
	 * - Styled stdout/stderr output
	 * - Matplotlib plot display
	 * - SymPy LaTeX rendering with MathLive
	 * - Pedagogic error messages (French explanations)
	 * - Error line number display
	 */

	// Imports
	import { Button } from '$lib/components/ui/button';
	import { Download } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import 'mathlive';

	// Props
	let {
		stdout = '',
		stderr = '',
		plotData = null as string | null,
		latexOutput = null as string | null,
		plotlyData = null as string | null,
		errorLine = null as number | null,
		executionTime = 0,
		showPedagogicErrors = true
	}: {
		stdout?: string;
		stderr?: string;
		plotData?: string | null;
		latexOutput?: string | null;
		plotlyData?: string | null;
		errorLine?: number | null;
		executionTime?: number;
		showPedagogicErrors?: boolean;
	} = $props();

	// Derived state
	let hasOutput = $derived(
		stdout.length > 0 ||
			stderr.length > 0 ||
			plotData !== null ||
			latexOutput !== null ||
			plotlyData !== null
	);

	// Plotly state
	let plotlyContainerRef: HTMLDivElement | null = $state(null);
	let plotlyLoaded = $state(false);

	// Lazy load Plotly from CDN when plotlyData is received
	$effect(() => {
		if (plotlyData && !plotlyLoaded && browser) {
			// Check if Plotly is already loaded globally
			if ((window as Window & { Plotly?: unknown }).Plotly) {
				plotlyLoaded = true;
				return;
			}

			// Load Plotly from CDN
			const script = document.createElement('script');
			script.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js';
			script.onload = () => {
				plotlyLoaded = true;
			};
			script.onerror = () => {
				console.error('Failed to load Plotly from CDN');
			};
			document.head.appendChild(script);
		}
	});

	// Plotly interface for type safety
	interface PlotlyInstance {
		newPlot: (el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown) => void;
		purge: (el: HTMLElement) => void;
	}

	// Render Plotly chart when data and library are ready
	$effect(() => {
		if (plotlyData && plotlyLoaded && plotlyContainerRef && browser) {
			const container = plotlyContainerRef;
			try {
				const spec = JSON.parse(plotlyData);
				const Plotly = (window as Window & { Plotly?: PlotlyInstance }).Plotly;
				if (Plotly) {
					Plotly.newPlot(container, spec.data, spec.layout, {
						responsive: true,
						displayModeBar: true
					});
				}

				// Cleanup when effect re-runs or component unmounts
				return () => {
					const PlotlyCleanup = (window as Window & { Plotly?: PlotlyInstance }).Plotly;
					if (container && PlotlyCleanup) {
						PlotlyCleanup.purge(container);
					}
				};
			} catch (e) {
				console.error('Plotly render error:', e);
			}
		}
	});

	// Functions
	/**
	 * Download the plot as a PNG file
	 */
	function downloadPlot(): void {
		if (!plotData) return;

		const link = document.createElement('a');
		link.href = plotData;
		link.download = 'python-plot.png';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Pedagogic error translations
	const ERROR_TRANSLATIONS: Record<string, { pattern: RegExp; message: string }> = {
		syntaxError: {
			pattern: /SyntaxError:\s*(.+)/i,
			message: 'Erreur de syntaxe : vérifiez la ponctuation (parenthèses, deux-points, guillemets)'
		},
		nameError: {
			pattern: /NameError:\s*name\s+'([^']+)'\s+is not defined/i,
			message: "Variable non définie : '$1' n'existe pas. Avez-vous bien déclaré cette variable ?"
		},
		typeError: {
			pattern: /TypeError:\s*(.+)/i,
			message: "Erreur de type : vous essayez d'utiliser une valeur d'un mauvais type"
		},
		indexError: {
			pattern: /IndexError:\s*(.+)/i,
			message: "Index invalide : vous essayez d'accéder à un élément qui n'existe pas dans la liste"
		},
		keyError: {
			pattern: /KeyError:\s*(.+)/i,
			message: "Clé introuvable : cette clé n'existe pas dans le dictionnaire"
		},
		valueError: {
			pattern: /ValueError:\s*(.+)/i,
			message: "Valeur invalide : la valeur fournie n'est pas acceptable"
		},
		zeroDivision: {
			pattern: /ZeroDivisionError/i,
			message: 'Division par zéro : impossible de diviser par zéro'
		},
		indentationError: {
			pattern: /IndentationError:\s*(.+)/i,
			message: "Erreur d'indentation : vérifiez l'alignement de votre code (espaces/tabulations)"
		},
		importError: {
			pattern: /ImportError:\s*(.+)/i,
			message: "Erreur d'import : le module demandé n'a pas pu être chargé"
		},
		moduleNotFound: {
			pattern: /ModuleNotFoundError:\s*No module named '([^']+)'/i,
			message:
				"Module non trouvé : '$1' n'est pas disponible. Modules disponibles : numpy, matplotlib, sympy"
		},
		attributeError: {
			pattern: /AttributeError:\s*(.+)/i,
			message: 'Attribut non trouvé : cet objet ne possède pas cette propriété ou méthode'
		},
		recursionError: {
			pattern: /RecursionError/i,
			message: "Récursion infinie : votre fonction s'appelle elle-même indéfiniment"
		},
		memoryError: {
			pattern: /MemoryError/i,
			message: 'Mémoire insuffisante : votre programme utilise trop de mémoire'
		}
	};

	/**
	 * Convert Python error to pedagogic French message
	 */
	function getPedagogicMessage(error: string): string | null {
		if (!showPedagogicErrors) return null;

		for (const { pattern, message } of Object.values(ERROR_TRANSLATIONS)) {
			const match = error.match(pattern);
			if (match) {
				// Replace $1, $2, etc. with captured groups
				return message.replace(/\$(\d+)/g, (_, n) => match[parseInt(n)] || '');
			}
		}
		return null;
	}

	// Get pedagogic message for current error
	let pedagogicMessage = $derived(stderr ? getPedagogicMessage(stderr) : null);
</script>

{#if !hasOutput}
	<!-- Empty state -->
	<div
		class="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"
	>
		<p>Aucune sortie</p>
		<p class="text-sm">Cliquez sur "Exécuter" ou appuyez sur Ctrl+Entrée</p>
	</div>
{:else}
	<!-- Output display -->
	<div class="flex flex-col gap-4">
		{#if stdout}
			<div>
				<div class="mb-1 flex items-center gap-2">
					<span class="text-xs font-medium text-muted-foreground">stdout</span>
					{#if executionTime > 0}
						<span class="text-xs text-muted-foreground">({executionTime}ms)</span>
					{/if}
				</div>
				<pre
					class="rounded bg-background p-3 font-mono text-sm whitespace-pre-wrap text-foreground">{stdout}</pre>
			</div>
		{/if}

		{#if latexOutput}
			<div>
				<div class="mb-1 flex items-center gap-2">
					<span class="text-xs font-medium text-muted-foreground">Résultat SymPy</span>
					{#if executionTime > 0 && !stdout}
						<span class="text-xs text-muted-foreground">({executionTime}ms)</span>
					{/if}
				</div>
				<div class="rounded bg-background p-4">
					<math-span class="block text-lg">{latexOutput}</math-span>
				</div>
			</div>
		{/if}

		{#if stderr}
			<div>
				<div class="mb-1 text-xs font-medium text-destructive">
					stderr
					{#if errorLine !== null}
						<span class="ml-1 text-muted-foreground">(ligne {errorLine})</span>
					{/if}
				</div>

				{#if pedagogicMessage}
					<!-- Pedagogic error message -->
					<div class="mb-2 rounded border border-amber-500/50 bg-amber-500/10 p-3">
						<p class="text-sm font-medium text-amber-700 dark:text-amber-400">
							{pedagogicMessage}
						</p>
					</div>
				{/if}

				<!-- Raw error -->
				<pre
					class="rounded bg-destructive/10 p-3 font-mono text-sm whitespace-pre-wrap text-destructive">{stderr}</pre>
			</div>
		{/if}

		{#if plotData}
			<div>
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-muted-foreground">Graphique</span>
					<Button
						variant="ghost"
						size="sm"
						onclick={downloadPlot}
						class="h-7 gap-1.5 px-2"
						aria-label="Télécharger le graphique"
					>
						<Download class="size-3.5" />
						<span class="text-xs">Télécharger</span>
					</Button>
				</div>
				<img
					src={plotData}
					alt="Graphique matplotlib"
					class="max-w-full rounded border border-border bg-white"
				/>
			</div>
		{/if}

		{#if plotlyData}
			<div>
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-muted-foreground"
						>Graphique Plotly (interactif)</span
					>
				</div>
				{#if !plotlyLoaded}
					<div class="flex items-center gap-2 py-4">
						<div
							class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
						></div>
						<span class="text-sm text-muted-foreground">Chargement de Plotly...</span>
					</div>
				{/if}
				<div
					bind:this={plotlyContainerRef}
					class="min-h-[300px] rounded border border-border bg-white"
					class:hidden={!plotlyLoaded}
				></div>
			</div>
		{/if}
	</div>
{/if}
