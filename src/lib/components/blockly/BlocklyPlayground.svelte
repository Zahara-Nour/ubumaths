<!--
  BlocklyPlayground.svelte

  Main orchestrating component for the Blockly visual programming playground.
  Combines workspace, toolbar, code preview, and output components.
  Uses BlocklyExecutor for secure code execution (JS via Worker, Python via Pyodide).
  Mode tortue : les blocs sont exécutés par `executerTortue` (ADR 0039), jamais par le code
  généré, qui ne sert que d'aperçu.
-->
<script lang="ts">
	import type * as Blockly from 'blockly';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import BlocklyWorkspace from './BlocklyWorkspace.svelte';
	import BlocklyToolbar from './BlocklyToolbar.svelte';
	import BlocklyCodePreview from './BlocklyCodePreview.svelte';
	import BlocklyOutput from './BlocklyOutput.svelte';
	import TortueCanvas from './TortueCanvas.svelte';
	import * as BlocklyCore from 'blockly';
	import { STANDARD_TOOLBOX, type ExecutionLanguage, type ModeBlockly } from '$lib/shared/blockly';
	import {
		TORTUE_TOOLBOX,
		executerTortue,
		messageErreurTortue,
		type ResultatTortue
	} from '$lib/shared/blockly/tortue';
	import { generateCode } from '$lib/shared/blockly/generators';
	import { BLOCKLY_CONFIG } from '$lib/shared/blockly/config';
	import { BlocklyExecutor } from '$lib/shared/blockly/execution';

	// =============================================================================
	// State
	// =============================================================================

	/** Blockly workspace instance */
	let workspace = $state<Blockly.WorkspaceSvg | null>(null);

	/** Current execution language */
	let language = $state<ExecutionLanguage>('javascript');

	/** Generated JavaScript code */
	let jsCode = $state('');

	/** Generated Python code */
	let pythonCode = $state('');

	/** Fullscreen mode */
	let isFullscreen = $state(false);

	/** Mode : programme (console) ou tortue (quadrillage) */
	let mode = $state<ModeBlockly>('programme');

	/** Dernière exécution de la tortue (null : rien exécuté depuis le dernier changement) */
	let resultatTortue = $state<ResultatTortue | null>(null);

	/** Debounce timer for code generation */
	let codeGenTimer: ReturnType<typeof setTimeout> | null = null;

	/** Blockly code executor */
	const executor = new BlocklyExecutor();

	// =============================================================================
	// Derived State
	// =============================================================================

	/** Current code based on selected language */
	const currentCode = $derived(language === 'javascript' ? jsCode : pythonCode);

	/** Whether code is currently executing */
	const isExecuting = $derived(executor.isExecuting);

	/** Output lines from execution */
	const outputLines = $derived(executor.output);

	/** Whether executor is loading */
	const isLoading = $derived(executor.isLoading);

	/** Loading progress */
	const loadingProgress = $derived(executor.loadingProgress);

	/** Loading stage */
	const loadingStage = $derived(executor.loadingStage);

	// =============================================================================
	// Lifecycle
	// =============================================================================

	onMount(() => {
		// Initialize the executor
		executor.init();

		// Initial code generation when workspace is ready
		if (workspace) {
			generateBothCodes();
		}
	});

	onDestroy(() => {
		// Clean up executor
		executor.destroy();

		// Clear debounce timer
		if (codeGenTimer !== null) {
			clearTimeout(codeGenTimer);
		}
	});

	// =============================================================================
	// Code Generation
	// =============================================================================

	/**
	 * Generate both JavaScript and Python code from current workspace
	 */
	function generateBothCodes(): void {
		if (!workspace) {
			jsCode = '';
			pythonCode = '';
			return;
		}

		// Generate JavaScript
		const jsResult = generateCode(workspace, 'javascript');
		jsCode = jsResult.success ? jsResult.code : '';

		// Generate Python
		const pyResult = generateCode(workspace, 'python');
		pythonCode = pyResult.success ? pyResult.code : '';

		// Show warnings if any
		if (jsResult.warnings && jsResult.warnings.length > 0) {
			executor.addOutput('info', jsResult.warnings.join('\n'));
		}
	}

	/**
	 * Debounced code generation triggered by workspace changes
	 */
	function handleWorkspaceChange(): void {
		// Clear existing timer
		if (codeGenTimer !== null) {
			clearTimeout(codeGenTimer);
		}

		// Set new timer
		codeGenTimer = setTimeout(() => {
			generateBothCodes();
			codeGenTimer = null;
		}, BLOCKLY_CONFIG.CODE_GEN_DEBOUNCE_MS);
	}

	// =============================================================================
	// Code Execution
	// =============================================================================

	/**
	 * Execute the generated code in the selected language
	 */
	async function handleRun(): Promise<void> {
		if (!workspace || isExecuting) {
			return;
		}

		// Regenerate code to ensure it's up to date
		generateBothCodes();

		if (mode === 'tortue') {
			runTortue(workspace);
			return;
		}

		// Les blocs tortue n'ont de sens que pour l'interpréteur : le code généré n'est qu'un aperçu
		if (workspace.getAllBlocks(false).some((bloc) => bloc.type.startsWith('tortue_'))) {
			executor.clearOutput();
			executor.addOutput('info', 'Les blocs tortue s’exécutent en mode Tortue.');
			return;
		}

		// Check if there's code to execute
		if (!currentCode || currentCode.trim().length === 0) {
			executor.addOutput(
				'info',
				"Aucun code a executer. Ajoutez des blocs dans l'espace de travail."
			);
			return;
		}

		// Execute code via executor
		await executor.execute(currentCode, language);
	}

	/**
	 * Exécute les blocs par l'interpréteur de la tortue (aucun code évalué)
	 */
	function runTortue(ws: Blockly.WorkspaceSvg): void {
		executor.clearOutput();
		const resultat = executerTortue(BlocklyCore.serialization.workspaces.save(ws));
		resultatTortue = resultat;
		if (resultat.ok) {
			const n = resultat.segments.length;
			executor.addOutput('info', `Tracé terminé : ${n} segment${n > 1 ? 's' : ''}.`);
		} else {
			executor.addOutput('stderr', messageErreurTortue(resultat.erreur));
		}
	}

	/**
	 * Change de mode : boîte à outils et zone de résultat suivent
	 */
	function handleModeChange(nouveauMode: ModeBlockly): void {
		mode = nouveauMode;
		resultatTortue = null;
		executor.clearOutput();
		const toolbox = nouveauMode === 'tortue' ? TORTUE_TOOLBOX : STANDARD_TOOLBOX;
		workspace?.updateToolbox(toolbox as unknown as Blockly.utils.toolbox.ToolboxDefinition);
	}

	// =============================================================================
	// Output Management
	// =============================================================================

	/**
	 * Clear all output lines
	 */
	function handleClearOutput(): void {
		executor.clearOutput();
	}

	/**
	 * Clear the workspace
	 */
	function handleClearWorkspace(): void {
		if (workspace) {
			workspace.clear();
			generateBothCodes();
			executor.clearOutput();
			resultatTortue = null;
		}
	}

	/**
	 * Handle language change
	 * @param newLanguage - New execution language
	 */
	async function handleLanguageChange(newLanguage: ExecutionLanguage): Promise<void> {
		language = newLanguage;
		await executor.setLanguage(newLanguage);
	}

	// =============================================================================
	// Fullscreen
	// =============================================================================

	/**
	 * Toggle fullscreen mode
	 */
	function toggleFullscreen(): void {
		isFullscreen = !isFullscreen;
	}

	/**
	 * Handle Escape key to exit fullscreen
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && isFullscreen) {
			isFullscreen = false;
		}
	}

	// Handle body scroll when fullscreen
	$effect(() => {
		if (!browser) return;

		if (isFullscreen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		// Cleanup on unmount
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Resize Blockly workspace when fullscreen changes
	$effect(() => {
		// Track isFullscreen to trigger on change
		const _fullscreen = isFullscreen;

		if (!browser || !workspace) return;

		// Small delay to let CSS transition complete
		const timer = setTimeout(() => {
			if (workspace) {
				// Trigger a resize event for Blockly to recalculate
				window.dispatchEvent(new Event('resize'));
			}
		}, 100);

		return () => clearTimeout(timer);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class={isFullscreen
		? 'fixed inset-0 z-[100] flex flex-col bg-background'
		: 'flex h-full flex-col'}
>
	<!-- Loading overlay -->
	{#if isLoading}
		<div
			class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
		>
			<div class="flex flex-col items-center gap-4">
				<div
					class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
				></div>
				<div class="text-sm text-muted-foreground">
					{loadingStage}
				</div>
				{#if loadingProgress > 0}
					<div class="h-2 w-48 overflow-hidden rounded-full bg-muted">
						<div
							class="h-full bg-primary transition-all duration-300"
							style="width: {loadingProgress}%"
						></div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Toolbar -->
	<BlocklyToolbar
		{language}
		{isExecuting}
		{isFullscreen}
		onrun={handleRun}
		onclear={handleClearOutput}
		onclearworkspace={handleClearWorkspace}
		onlanguagechange={handleLanguageChange}
		ontogglefullscreen={toggleFullscreen}
		{mode}
		onmodechange={handleModeChange}
	/>

	<!-- Main content area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Left: Workspace -->
		<div class="flex-1 overflow-hidden">
			<BlocklyWorkspace bind:workspace onchange={handleWorkspaceChange} />
		</div>

		<!-- Right: quadrillage (mode tortue) et aperçu du code -->
		<div class="flex w-96 flex-shrink-0 flex-col overflow-hidden">
			{#if mode === 'tortue'}
				<div class="border-b border-border p-3">
					<TortueCanvas
						segments={resultatTortue?.segments ?? []}
						tortue={resultatTortue?.tortue ?? { x: 0, y: 0, cap: 0, styloBaisse: true }}
					/>
				</div>
			{/if}
			<div class="min-h-0 flex-1">
				<BlocklyCodePreview {jsCode} {pythonCode} activeLanguage={language} />
			</div>
		</div>
	</div>

	<!-- Bottom: Output console -->
	<div class="h-64 flex-shrink-0">
		<BlocklyOutput lines={outputLines} onclear={handleClearOutput} />
	</div>
</div>
