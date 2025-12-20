<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Label } from '$lib/components/ui/label';
	import ExerciseMarkdownPreview from './ExerciseMarkdownPreview.svelte';
	import {
		transpileLatexToMarkdown,
		splitStatementAndSolution,
		detectSplitMethod,
		type TranspileWarning
	} from '$lib/ubumark/importers/latex';

	// Types
	type SplitMode = 'statement-only' | 'auto' | 'solution-only';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		onImport?: (result: {
			statement: string;
			solution: string | null;
			warnings: TranspileWarning[];
		}) => void;
	}

	// Props
	let { open = $bindable(false), onOpenChange, onImport }: Props = $props();

	// State
	let step = $state<1 | 2>(1);
	let latexInput = $state('');
	let splitMode = $state<SplitMode>('statement-only');
	let canAutoSplit = $state(false);
	let convertedStatement = $state('');
	let convertedSolution = $state<string | null>(null);
	let warnings = $state<TranspileWarning[]>([]);
	let converting = $state(false);
	let activeTab = $state('statement');

	// File input state
	let fileInput = $state<HTMLInputElement>();
	let selectedFile = $state<File | null>(null);
	let dragOver = $state(false);

	// Computed
	let hasWarnings = $derived(warnings.length > 0);
	let errorCount = $derived(warnings.filter((w) => w.severity === 'error').length);
	let warningCount = $derived(warnings.filter((w) => w.severity === 'warning').length);
	let infoCount = $derived(warnings.filter((w) => w.severity === 'info').length);

	/**
	 * Handle file selection
	 */
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFile = target.files[0];
			readFileContent(target.files[0]);
		}
	}

	/**
	 * Handle drag over
	 */
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	/**
	 * Handle drag leave
	 */
	function handleDragLeave() {
		dragOver = false;
	}

	/**
	 * Handle file drop
	 */
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;

		if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
			selectedFile = event.dataTransfer.files[0];
			readFileContent(event.dataTransfer.files[0]);
		}
	}

	/**
	 * Read file content and update state
	 */
	async function readFileContent(file: File) {
		try {
			const content = await file.text();
			latexInput = content;
			detectAutoSplit(content);
		} catch {
			console.error('Failed to read file');
		}
	}

	/**
	 * Detect if automatic split is possible
	 */
	function detectAutoSplit(content: string) {
		const method = detectSplitMethod(content);
		canAutoSplit = method !== 'none';

		// Auto-select split mode based on detection
		if (canAutoSplit) {
			splitMode = 'auto';
		}
	}

	/**
	 * Handle paste in textarea
	 */
	function handleTextareaInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		latexInput = target.value;
		detectAutoSplit(target.value);
	}

	/**
	 * Handle convert and preview
	 */
	function handleConvert() {
		if (!latexInput.trim()) return;

		converting = true;
		warnings = [];

		try {
			// Split first if needed
			let statementLatex = latexInput;
			let solutionLatex: string | null = null;

			if (splitMode === 'auto') {
				const split = splitStatementAndSolution(latexInput);
				statementLatex = split.statement;
				solutionLatex = split.solution;
			} else if (splitMode === 'solution-only') {
				solutionLatex = latexInput;
				statementLatex = '';
			}

			// Transpile each part
			if (statementLatex.trim()) {
				const statementResult = transpileLatexToMarkdown(statementLatex);
				convertedStatement = statementResult.markdown;
				warnings = [...statementResult.warnings];
			} else {
				convertedStatement = '';
			}

			if (solutionLatex?.trim()) {
				const solutionResult = transpileLatexToMarkdown(solutionLatex);
				convertedSolution = solutionResult.markdown;
				warnings = [...warnings, ...solutionResult.warnings];
			} else {
				convertedSolution = null;
			}

			step = 2;
			activeTab = convertedStatement ? 'statement' : 'solution';
		} catch (error) {
			console.error('Conversion error:', error);
			warnings = [
				{
					type: 'parse-error',
					message: error instanceof Error ? error.message : 'Erreur de conversion',
					severity: 'error'
				}
			];
		} finally {
			converting = false;
		}
	}

	/**
	 * Handle import
	 */
	function handleImport() {
		if (onImport) {
			onImport({
				statement: convertedStatement,
				solution: convertedSolution,
				warnings
			});
		}

		// Close dialog
		open = false;
		if (onOpenChange) onOpenChange(false);
	}

	/**
	 * Go back to step 1
	 */
	function handleBack() {
		step = 1;
	}

	/**
	 * Reset dialog state when closed
	 */
	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		if (onOpenChange) onOpenChange(newOpen);

		if (!newOpen) {
			// Reset state when closing
			step = 1;
			latexInput = '';
			splitMode = 'statement-only';
			canAutoSplit = false;
			convertedStatement = '';
			convertedSolution = null;
			warnings = [];
			selectedFile = null;
			activeTab = 'statement';
			if (fileInput) fileInput.value = '';
		}
	}

	/**
	 * Get severity class for warning display
	 */
	function getSeverityClass(severity: TranspileWarning['severity']): string {
		switch (severity) {
			case 'error':
				return 'text-red-600 dark:text-red-400';
			case 'warning':
				return 'text-yellow-600 dark:text-yellow-400';
			default:
				return 'text-blue-600 dark:text-blue-400';
		}
	}

	/**
	 * Get severity icon
	 */
	function getSeverityIcon(severity: TranspileWarning['severity']): string {
		switch (severity) {
			case 'error':
				return 'x';
			case 'warning':
				return '!';
			default:
				return 'i';
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[700px]">
		<Dialog.Header>
			<Dialog.Title>Importer depuis LaTeX</Dialog.Title>
			<Dialog.Description>
				{#if step === 1}
					Importez un fichier LaTeX ou collez le contenu directement
				{:else}
					Prévisualisez le résultat de la conversion
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			{#if step === 1}
				<!-- Step 1: Input -->

				<!-- File upload -->
				<div class="space-y-3">
					<Label>Fichier LaTeX</Label>

					<!-- Drag & drop zone -->
					<div
						role="region"
						aria-label="Zone de glisser-déposer pour importer des fichiers"
						class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
							? 'border-primary bg-primary/5'
							: 'border-border'}"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
					>
						{#if selectedFile}
							<div class="space-y-2">
								<svg
									class="mx-auto h-12 w-12 text-green-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<p class="font-medium">{selectedFile.name}</p>
								<p class="text-sm text-muted-foreground">
									{(selectedFile.size / 1024).toFixed(1)} KB
								</p>
								<Button
									variant="outline"
									size="sm"
									onclick={() => {
										selectedFile = null;
										latexInput = '';
										canAutoSplit = false;
										splitMode = 'statement-only';
										if (fileInput) fileInput.value = '';
									}}
								>
									Changer de fichier
								</Button>
							</div>
						{:else}
							<svg
								class="mx-auto h-12 w-12 text-muted-foreground"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								/>
							</svg>
							<p class="mt-2 text-sm font-medium">Glissez-déposez un fichier .tex ici</p>
							<p class="text-xs text-muted-foreground">ou</p>
							<Button variant="outline" size="sm" class="mt-2" onclick={() => fileInput?.click()}>
								Parcourir les fichiers
							</Button>
							<input
								type="file"
								bind:this={fileInput}
								onchange={handleFileChange}
								accept=".tex,.latex"
								class="hidden"
							/>
						{/if}
					</div>
				</div>

				<!-- Or paste directly -->
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<div class="h-px flex-1 bg-border"></div>
						<span class="text-xs text-muted-foreground">ou collez directement</span>
						<div class="h-px flex-1 bg-border"></div>
					</div>

					<textarea
						class="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						placeholder="Collez votre code LaTeX ici..."
						value={latexInput}
						oninput={handleTextareaInput}
					></textarea>
				</div>

				<!-- Split mode selection -->
				<div class="space-y-3">
					<Label>Mode de séparation</Label>
					<div class="space-y-2">
						<label class="flex cursor-pointer items-center gap-3 rounded-md border p-3">
							<input
								type="radio"
								name="splitMode"
								value="statement-only"
								bind:group={splitMode}
								class="h-4 w-4"
							/>
							<div class="flex-1">
								<span class="text-sm font-medium">Tout dans l'enonce</span>
								<p class="text-xs text-muted-foreground">
									Le contenu sera utilise uniquement comme enonce
								</p>
							</div>
						</label>

						<label
							class="flex items-center gap-3 rounded-md border p-3 {canAutoSplit
								? 'cursor-pointer'
								: 'cursor-not-allowed opacity-50'}"
						>
							<input
								type="radio"
								name="splitMode"
								value="auto"
								bind:group={splitMode}
								disabled={!canAutoSplit}
								class="h-4 w-4"
							/>
							<div class="flex-1">
								<span class="text-sm font-medium">Diviser automatiquement</span>
								<p class="text-xs text-muted-foreground">
									{#if canAutoSplit}
										Division detectee (environnement solution, section, ou commentaire)
									{:else}
										Aucune separation detectee dans le contenu
									{/if}
								</p>
							</div>
						</label>

						<label class="flex cursor-pointer items-center gap-3 rounded-md border p-3">
							<input
								type="radio"
								name="splitMode"
								value="solution-only"
								bind:group={splitMode}
								class="h-4 w-4"
							/>
							<div class="flex-1">
								<span class="text-sm font-medium">Fichier = Solution uniquement</span>
								<p class="text-xs text-muted-foreground">
									Le contenu sera utilise uniquement comme solution
								</p>
							</div>
						</label>
					</div>
				</div>
			{:else}
				<!-- Step 2: Preview -->

				<!-- Tabs for statement/solution preview -->
				<Tabs.Root bind:value={activeTab}>
					<Tabs.List class="grid w-full grid-cols-2">
						<Tabs.Trigger value="statement" disabled={!convertedStatement}>
							Enonce
							{#if convertedStatement}
								<span class="ml-1 text-xs text-muted-foreground">
									({convertedStatement.length} car.)
								</span>
							{/if}
						</Tabs.Trigger>
						<Tabs.Trigger value="solution" disabled={!convertedSolution}>
							Solution
							{#if convertedSolution}
								<span class="ml-1 text-xs text-muted-foreground">
									({convertedSolution.length} car.)
								</span>
							{/if}
						</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="statement" class="mt-4">
						{#if convertedStatement}
							<div
								class="max-h-[300px] min-h-[200px] overflow-y-auto rounded-md border border-input bg-background p-4"
							>
								<ExerciseMarkdownPreview markdown={convertedStatement} />
							</div>
						{:else}
							<div class="rounded-md border border-dashed p-8 text-center text-muted-foreground">
								Pas d'enonce (mode solution uniquement)
							</div>
						{/if}
					</Tabs.Content>

					<Tabs.Content value="solution" class="mt-4">
						{#if convertedSolution}
							<div
								class="max-h-[300px] min-h-[200px] overflow-y-auto rounded-md border border-input bg-background p-4"
							>
								<ExerciseMarkdownPreview markdown={convertedSolution} />
							</div>
						{:else}
							<div class="rounded-md border border-dashed p-8 text-center text-muted-foreground">
								Pas de solution detectee
							</div>
						{/if}
					</Tabs.Content>
				</Tabs.Root>

				<!-- Warnings section -->
				{#if hasWarnings}
					<div class="space-y-2 rounded-lg border p-4">
						<div class="flex items-center justify-between">
							<h4 class="font-medium">Avertissements de conversion</h4>
							<div class="flex gap-2 text-xs">
								{#if errorCount > 0}
									<span class="text-red-600 dark:text-red-400">{errorCount} erreur(s)</span>
								{/if}
								{#if warningCount > 0}
									<span class="text-yellow-600 dark:text-yellow-400">{warningCount} attention</span>
								{/if}
								{#if infoCount > 0}
									<span class="text-blue-600 dark:text-blue-400">{infoCount} info</span>
								{/if}
							</div>
						</div>

						<div class="max-h-[150px] space-y-1 overflow-y-auto">
							{#each warnings as warning, i (i)}
								<div class="flex items-start gap-2 text-sm">
									<span
										class="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs font-bold {getSeverityClass(
											warning.severity
										)}"
									>
										{getSeverityIcon(warning.severity)}
									</span>
									<div class="flex-1">
										<span class={getSeverityClass(warning.severity)}>{warning.message}</span>
										{#if warning.line}
											<span class="ml-1 text-xs text-muted-foreground">
												(ligne {warning.line})
											</span>
										{/if}
										{#if warning.command}
											<span class="ml-1 text-xs text-muted-foreground">
												[{warning.command}]
											</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<Dialog.Footer>
			{#if step === 1}
				<Button
					variant="outline"
					onclick={() => {
						open = false;
						if (onOpenChange) onOpenChange(false);
					}}
				>
					Annuler
				</Button>
				<Button onclick={handleConvert} disabled={!latexInput.trim() || converting}>
					{converting ? 'Conversion...' : 'Convertir et Apercu'}
				</Button>
			{:else}
				<Button variant="outline" onclick={handleBack}>Retour</Button>
				<Button
					onclick={handleImport}
					disabled={!convertedStatement && !convertedSolution}
					variant={errorCount > 0 ? 'destructive' : 'default'}
				>
					{errorCount > 0 ? 'Importer malgre les erreurs' : 'Importer'}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
