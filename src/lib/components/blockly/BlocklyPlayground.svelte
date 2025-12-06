<!--
  BlocklyPlayground.svelte

  Main orchestrating component for the Blockly visual programming playground.
  Combines workspace, toolbar, code preview, and output components.
  Uses BlocklyExecutor for secure code execution (JS via Worker, Python via Pyodide).
-->
<script lang="ts">
	import type * as Blockly from 'blockly';
	import { onMount, onDestroy } from 'svelte';
	import BlocklyWorkspace from './BlocklyWorkspace.svelte';
	import BlocklyToolbar from './BlocklyToolbar.svelte';
	import BlocklyCodePreview from './BlocklyCodePreview.svelte';
	import BlocklyOutput from './BlocklyOutput.svelte';
	import type { ExecutionLanguage } from '$lib/shared/blockly';
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
</script>

<div class="flex h-full flex-col">
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
		onrun={handleRun}
		onclear={handleClearOutput}
		onclearworkspace={handleClearWorkspace}
		onlanguagechange={handleLanguageChange}
	/>

	<!-- Main content area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Left: Workspace -->
		<div class="flex-1 overflow-hidden">
			<BlocklyWorkspace bind:workspace onchange={handleWorkspaceChange} />
		</div>

		<!-- Right: Code preview -->
		<div class="w-96 flex-shrink-0">
			<BlocklyCodePreview {jsCode} {pythonCode} activeLanguage={language} />
		</div>
	</div>

	<!-- Bottom: Output console -->
	<div class="h-64 flex-shrink-0">
		<BlocklyOutput lines={outputLines} onclear={handleClearOutput} />
	</div>
</div>
