<!--
  BlocklyPlayground.svelte

  Main orchestrating component for the Blockly visual programming playground.
  Combines workspace, toolbar, code preview, and output components.
-->
<script lang="ts">
	import type * as Blockly from 'blockly';
	import { onMount } from 'svelte';
	import BlocklyWorkspace from './BlocklyWorkspace.svelte';
	import BlocklyToolbar from './BlocklyToolbar.svelte';
	import BlocklyCodePreview from './BlocklyCodePreview.svelte';
	import BlocklyOutput from './BlocklyOutput.svelte';
	import type { ExecutionLanguage, OutputLine } from '$lib/shared/blockly';
	import { generateCode } from '$lib/shared/blockly/generators';
	import { BLOCKLY_CONFIG, ERROR_MESSAGES } from '$lib/shared/blockly/config';

	// =============================================================================
	// State
	// =============================================================================

	/** Blockly workspace instance */
	let workspace = $state<Blockly.WorkspaceSvg | null>(null);

	/** Current execution language */
	let language = $state<ExecutionLanguage>('javascript');

	/** Whether code is currently executing */
	let isExecuting = $state(false);

	/** Generated JavaScript code */
	let jsCode = $state('');

	/** Generated Python code */
	let pythonCode = $state('');

	/** Output lines from code execution */
	let outputLines = $state<OutputLine[]>([]);

	/** Debounce timer for code generation */
	let codeGenTimer: ReturnType<typeof setTimeout> | null = null;

	// =============================================================================
	// Lifecycle
	// =============================================================================

	onMount(() => {
		// Initial code generation when workspace is ready
		if (workspace) {
			generateBothCodes();
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
			addOutputLine('info', jsResult.warnings.join('\n'));
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

		// Clear previous output
		outputLines = [];

		// Regenerate code to ensure it's up to date
		generateBothCodes();

		const code = language === 'javascript' ? jsCode : pythonCode;

		// Check if there's code to execute
		if (!code || code.trim().length === 0) {
			addOutputLine('info', "Aucun code à exécuter. Ajoutez des blocs dans l'espace de travail.");
			return;
		}

		isExecuting = true;
		addOutputLine(
			'info',
			`Exécution du code ${language === 'javascript' ? 'JavaScript' : 'Python'}...`
		);

		try {
			if (language === 'javascript') {
				await executeJavaScript(code);
			} else {
				await executePython(code);
			}
		} catch (error) {
			addOutputLine('stderr', `Erreur: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			isExecuting = false;
		}
	}

	/**
	 * Execute JavaScript code
	 * @param code - JavaScript code to execute
	 */
	async function executeJavaScript(code: string): Promise<void> {
		try {
			// Create a safe execution context
			const safeConsoleLog = (...args: unknown[]) => {
				addOutputLine('stdout', args.map(String).join(' '));
			};

			// Execute code with timeout
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() => reject(new Error(ERROR_MESSAGES.TIMEOUT_JS)),
					BLOCKLY_CONFIG.JS_TIMEOUT_MS
				);
			});

			const executionPromise = new Promise<void>((resolve, reject) => {
				try {
					// Create function with custom console.log
					const fn = new Function('console', code);
					fn({ log: safeConsoleLog });
					resolve();
				} catch (error) {
					reject(error);
				}
			});

			await Promise.race([executionPromise, timeoutPromise]);
			addOutputLine('info', 'Exécution terminée avec succès.');
		} catch (error) {
			addOutputLine(
				'stderr',
				`Erreur JavaScript: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Execute Python code (placeholder - requires Pyodide integration)
	 * @param _code - Python code to execute (unused, for future implementation)
	 */
	async function executePython(_code: string): Promise<void> {
		// TODO: Implement Pyodide integration
		addOutputLine('stderr', "L'exécution Python n'est pas encore implémentée.");
		addOutputLine('info', "Utilisez JavaScript pour l'instant.");
	}

	// =============================================================================
	// Output Management
	// =============================================================================

	/**
	 * Add a line to the output
	 * @param type - Output line type
	 * @param text - Output text
	 */
	function addOutputLine(type: OutputLine['type'], text: string): void {
		outputLines = [
			...outputLines,
			{
				type,
				text,
				timestamp: Date.now()
			}
		];

		// Limit output lines
		if (outputLines.length > BLOCKLY_CONFIG.MAX_OUTPUT_LINES) {
			outputLines = outputLines.slice(-BLOCKLY_CONFIG.MAX_OUTPUT_LINES);
		}
	}

	/**
	 * Clear all output lines
	 */
	function handleClearOutput(): void {
		outputLines = [];
	}

	/**
	 * Clear the workspace
	 */
	function handleClearWorkspace(): void {
		if (workspace) {
			workspace.clear();
			generateBothCodes();
			outputLines = [];
		}
	}

	/**
	 * Handle language change
	 * @param newLanguage - New execution language
	 */
	function handleLanguageChange(newLanguage: ExecutionLanguage): void {
		language = newLanguage;
	}
</script>

<div class="flex h-full flex-col">
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
