<script lang="ts">
	/**
	 * PythonOutput - Display Python execution results
	 *
	 * Features:
	 * - Styled stdout/stderr output
	 * - Matplotlib plot display
	 * - Pedagogic error messages (French explanations)
	 * - Error line number display
	 */

	// Props
	let {
		stdout = '',
		stderr = '',
		plotData = null as string | null,
		errorLine = null as number | null,
		executionTime = 0,
		showPedagogicErrors = true
	}: {
		stdout?: string;
		stderr?: string;
		plotData?: string | null;
		errorLine?: number | null;
		executionTime?: number;
		showPedagogicErrors?: boolean;
	} = $props();

	// Derived state
	let hasOutput = $derived(stdout.length > 0 || stderr.length > 0 || plotData !== null);

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
				<div class="mb-1 text-xs font-medium text-muted-foreground">Graphique</div>
				<img
					src={plotData}
					alt="Graphique matplotlib"
					class="max-w-full rounded border border-border bg-white"
				/>
			</div>
		{/if}
	</div>
{/if}
