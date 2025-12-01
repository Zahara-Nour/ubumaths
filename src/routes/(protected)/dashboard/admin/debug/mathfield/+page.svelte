<script lang="ts">
	import 'mathlive';
	import type { MathfieldElement } from 'mathlive';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Keyboard, Type, Copy, Check, RotateCcw, Settings2, Code, Braces } from 'lucide-svelte';

	// State
	let latexOutput = $state('');
	let mathfield: MathfieldElement | null = $state(null);
	let copied = $state(false);
	let currentMode = $state<'math' | 'text' | 'latex'>('math');

	// Options
	let smartMode = $state(false);
	let virtualKeyboardMode = $state<'manual' | 'onfocus' | 'off'>('onfocus');

	// Available virtual keyboards - state for each
	let kbNumeric = $state(true);
	let kbSymbols = $state(true);
	let kbFunctions = $state(true);
	let kbRoman = $state(true);
	let kbGreek = $state(true);

	// Keyboard config (for UI)
	const keyboardConfigs = [
		{ id: 'numeric', label: 'Numeric' },
		{ id: 'symbols', label: 'Symbols' },
		{ id: 'functions', label: 'Functions' },
		{ id: 'roman', label: 'Roman' },
		{ id: 'greek', label: 'Greek' }
	] as const;

	// Helper to get/set keyboard state
	function getKbState(id: string): boolean {
		switch (id) {
			case 'numeric':
				return kbNumeric;
			case 'symbols':
				return kbSymbols;
			case 'functions':
				return kbFunctions;
			case 'roman':
				return kbRoman;
			case 'greek':
				return kbGreek;
			default:
				return true;
		}
	}

	function setKbState(id: string, value: boolean) {
		switch (id) {
			case 'numeric':
				kbNumeric = value;
				break;
			case 'symbols':
				kbSymbols = value;
				break;
			case 'functions':
				kbFunctions = value;
				break;
			case 'roman':
				kbRoman = value;
				break;
			case 'greek':
				kbGreek = value;
				break;
		}
	}

	// Derived: active keyboards string
	let activeKeyboards = $derived(
		[
			kbNumeric && 'numeric',
			kbSymbols && 'symbols',
			kbFunctions && 'functions',
			kbRoman && 'roman',
			kbGreek && 'greek'
		]
			.filter(Boolean)
			.join(' ')
	);

	// Example expressions to test
	const examples = [
		{ label: 'Fraction', latex: '\\frac{a}{b}' },
		{ label: 'Square root', latex: '\\sqrt{x}' },
		{ label: 'Power', latex: 'x^{2}' },
		{ label: 'Subscript', latex: 'x_{1}' },
		{ label: 'Sum', latex: '\\sum_{i=1}^{n} i' },
		{ label: 'Integral', latex: '\\int_{0}^{\\infty} e^{-x} dx' },
		{ label: 'Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
		{ label: 'Text unit', latex: '5\\text{ km}' },
		{ label: '\\unit{} macro', latex: '5\\unit{km}' },
		{ label: 'Speed with \\unit', latex: 'v = 10\\unit{m/s}' },
		{ label: 'Greek', latex: '\\alpha + \\beta = \\gamma' },
		{ label: 'Limit', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' }
	];

	/**
	 * Initialize mathfield with all options
	 */
	function initMathfield(node: MathfieldElement) {
		mathfield = node;

		// Configure virtual keyboard
		node.virtualKeyboardMode = virtualKeyboardMode;

		// Set math-virtual-keyboard-policy to allow virtual keyboard
		node.mathVirtualKeyboardPolicy = 'auto';

		// Define custom macros for units
		node.macros = {
			...node.macros,
			// \unit{km} renders with a light background to distinguish from variables
			unit: {
				args: 1,
				def: '\\colorbox{#e8f5e9}{\\textcolor{black}{\\mathsf{#1}}}'
			}
		};

		// Function to update latex output - try different methods
		const updateLatex = () => {
			try {
				const standard = node.value;

				// If standard doesn't have placeholder, use it directly
				if (!standard.includes('\\placeholder')) {
					latexOutput = standard;
					return;
				}

				// Otherwise, get expanded and convert back to \unit{...}
				const expanded = node.getValue('latex-expanded');

				// Pattern to match expanded \unit macro and extract content
				// \colorbox{#e8f5e9}{\textcolor{...}{$ content $}} or similar variations
				const unitPattern = /\\colorbox\{#e8f5e9\}\{\\textcolor\{[^}]+\}\{\$\s*(.*?)\s*\$\}\}/g;

				const reconstructed = expanded.replace(unitPattern, (_, content) => {
					// Clean up the content (remove extra spaces, handle empty)
					const cleanContent = content.trim();
					return cleanContent ? `\\unit{${cleanContent}}` : '\\unit{}';
				});

				latexOutput = reconstructed;
			} catch {
				latexOutput = node.value;
			}
		};

		// Listen for input changes
		node.addEventListener('input', updateLatex);

		// Also listen to keyup as backup for custom macro content
		node.addEventListener('keyup', updateLatex);

		// Listen for mode changes
		node.addEventListener('mode-change', () => {
			currentMode = node.mode;
		});

		// Initial value
		updateLatex();
		currentMode = node.mode;
	}

	/**
	 * Update virtual keyboard mode
	 */
	$effect(() => {
		if (mathfield) {
			mathfield.virtualKeyboardMode = virtualKeyboardMode;
		}
	});

	/**
	 * Update smart mode
	 */
	$effect(() => {
		if (mathfield) {
			mathfield.smartMode = smartMode;
		}
	});

	/**
	 * Enter text mode
	 */
	function enterTextMode() {
		if (mathfield) {
			mathfield.focus();
			mathfield.mode = 'text';
		}
	}

	/**
	 * Exit text mode back to math mode
	 */
	function exitTextMode() {
		if (mathfield) {
			mathfield.focus();
			mathfield.mode = 'math';
		}
	}

	/**
	 * Insert \unit{} command with cursor inside
	 */
	function insertUnitCommand() {
		if (mathfield) {
			mathfield.focus();
			mathfield.executeCommand(['insert', '\\unit{#0}', { focus: true }]);
			// Update output after insertion
			latexOutput = mathfield.value;
		}
	}

	/**
	 * Insert a specific latex string
	 */
	function insertLatex(latex: string) {
		if (mathfield) {
			mathfield.value = latex;
			latexOutput = latex;
			mathfield.focus();
		}
	}

	/**
	 * Clear the mathfield
	 */
	function clearField() {
		if (mathfield) {
			mathfield.value = '';
			latexOutput = '';
			mathfield.focus();
		}
	}

	/**
	 * Copy LaTeX to clipboard
	 */
	async function copyLatex() {
		await navigator.clipboard.writeText(latexOutput);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	/**
	 * Toggle virtual keyboard visibility
	 */
	function toggleKeyboard() {
		if (mathfield) {
			// Access the global virtual keyboard
			const vk = window.mathVirtualKeyboard;
			if (vk) {
				if (vk.visible) {
					vk.hide();
				} else {
					vk.show();
				}
			}
		}
	}

	/**
	 * Insert unit using \unit{} macro (stays in math mode with visual distinction)
	 */
	function insertUnitMacro(unit: string) {
		if (mathfield) {
			mathfield.executeCommand(['insert', `\\unit{${unit}}`]);
			latexOutput = mathfield.value;
			mathfield.focus();
		}
	}

	/**
	 * Insert unit using \text{} (traditional approach)
	 */
	function insertUnitText(unit: string) {
		if (mathfield) {
			mathfield.executeCommand(['insert', `\\text{${unit}}`]);
			latexOutput = mathfield.value;
			mathfield.focus();
		}
	}
</script>

<svelte:head>
	<title>MathField Debug - UbuMaths</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h2 class="mb-2 text-2xl font-bold">MathField Playground</h2>
		<p class="text-muted-foreground">
			Test MathLive's math-field component with full virtual keyboard and LaTeX output.
		</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<Badge variant="outline">MathLive</Badge>
			<Badge variant="outline">LaTeX</Badge>
			<Badge variant="outline">Virtual Keyboard</Badge>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main MathField Card -->
		<div class="lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Keyboard class="h-5 w-5" />
						Math Input
					</Card.Title>
					<Card.Description>
						Click to focus and use the virtual keyboard, or type LaTeX directly.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Mode indicator and action buttons -->
					<div class="flex items-center justify-between">
						<div class="flex flex-wrap gap-2">
							<Button variant="outline" size="sm" onclick={toggleKeyboard}>
								<Keyboard class="mr-2 h-4 w-4" />
								Toggle Keyboard
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={insertUnitCommand}
								class="bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
							>
								<Braces class="mr-2 h-4 w-4" />
								Insert \unit{'{}'}
							</Button>
							{#if currentMode === 'text'}
								<Button variant="default" size="sm" onclick={exitTextMode}>
									<Code class="mr-2 h-4 w-4" />
									Exit Text Mode
								</Button>
							{:else}
								<Button variant="outline" size="sm" onclick={enterTextMode}>
									<Type class="mr-2 h-4 w-4" />
									Enter Text Mode
								</Button>
							{/if}
							<Button variant="outline" size="sm" onclick={clearField}>
								<RotateCcw class="mr-2 h-4 w-4" />
								Clear
							</Button>
						</div>
						<Badge variant={currentMode === 'text' ? 'default' : 'secondary'}>
							Mode: {currentMode}
						</Badge>
					</div>

					<!-- The MathField -->
					<div
						class="rounded-lg border-2 border-primary/20 bg-background p-2 focus-within:border-primary"
					>
						<math-field
							use:initMathfield
							virtual-keyboard-mode={virtualKeyboardMode}
							virtual-keyboards={activeKeyboards}
							smart-mode={smartMode}
							style="
								font-size: 24px;
								min-height: 60px;
								width: 100%;
								border: none;
								outline: none;
								background: transparent;
							"
						></math-field>
					</div>

					<!-- Quick unit buttons -->
					<div class="space-y-3">
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">
								Quick Units (using \unit{'{}'} macro):
							</p>
							<div class="flex flex-wrap gap-1">
								{#each ['m', 'km', 'cm', 'mm', 's', 'h', 'min', 'kg', 'g', 'mg', 'L', 'mL', 'm/s', 'km/h', 'm/s^2', 'N', 'J', 'W'] as unit (unit)}
									<Button
										variant="outline"
										size="sm"
										class="h-7 bg-green-50 px-2 text-xs hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
										onclick={() => insertUnitMacro(unit)}
									>
										{unit}
									</Button>
								{/each}
							</div>
						</div>
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">
								Quick Units (using \text{'{}'}):
							</p>
							<div class="flex flex-wrap gap-1">
								{#each ['m', 'km', 'cm', 'mm', 's', 'h', 'min', 'kg', 'g'] as unit (unit)}
									<Button
										variant="outline"
										size="sm"
										class="h-7 px-2 text-xs"
										onclick={() => insertUnitText(unit)}
									>
										{unit}
									</Button>
								{/each}
							</div>
						</div>
					</div>

					<!-- LaTeX Output -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<p class="flex items-center gap-2 text-sm font-medium">
								<Code class="h-4 w-4" />
								LaTeX Output
							</p>
							<Button variant="ghost" size="sm" onclick={copyLatex} disabled={!latexOutput}>
								{#if copied}
									<Check class="mr-2 h-4 w-4 text-green-500" />
									Copied!
								{:else}
									<Copy class="mr-2 h-4 w-4" />
									Copy
								{/if}
							</Button>
						</div>
						<div class="rounded-lg border bg-muted/50 p-3">
							<pre class="font-mono text-sm break-all whitespace-pre-wrap">{latexOutput ||
									'(empty)'}</pre>
						</div>
					</div>

					<!-- Character count -->
					<p class="text-xs text-muted-foreground">
						{latexOutput.length} characters
					</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Options Panel -->
		<div class="space-y-4">
			<!-- Settings Card -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-lg">
						<Settings2 class="h-5 w-5" />
						Options
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Virtual Keyboard Mode -->
					<div class="space-y-2">
						<Label class="text-sm font-medium">Virtual Keyboard Mode</Label>
						<div class="flex flex-col gap-2">
							{#each ['onfocus', 'manual', 'off'] as mode (mode)}
								<label class="flex items-center gap-2 text-sm">
									<input
										type="radio"
										name="vk-mode"
										value={mode}
										checked={virtualKeyboardMode === mode}
										onchange={() => (virtualKeyboardMode = mode as 'manual' | 'onfocus' | 'off')}
										class="h-4 w-4"
									/>
									<span class="capitalize">{mode}</span>
								</label>
							{/each}
						</div>
					</div>

					<!-- Smart Mode -->
					<div class="flex items-center gap-2">
						<Checkbox
							id="smart-mode"
							checked={smartMode}
							onCheckedChange={(v) => (smartMode = v === true)}
						/>
						<Label for="smart-mode" class="text-sm">Smart Mode (auto text/math)</Label>
					</div>

					<!-- Keyboard Selection -->
					<div class="space-y-2">
						<Label class="text-sm font-medium">Active Keyboards</Label>
						<div class="flex flex-col gap-2">
							{#each keyboardConfigs as keyboard (keyboard.id)}
								<div class="flex items-center gap-2">
									<Checkbox
										id={`kb-${keyboard.id}`}
										checked={getKbState(keyboard.id)}
										onCheckedChange={(v) => setKbState(keyboard.id, v === true)}
									/>
									<Label for={`kb-${keyboard.id}`} class="text-sm">
										{keyboard.label}
									</Label>
								</div>
							{/each}
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Examples Card -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-lg">
						<Braces class="h-5 w-5" />
						Examples
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col gap-1">
						{#each examples as example (example.label)}
							<Button
								variant="ghost"
								size="sm"
								class="justify-start text-left"
								onclick={() => insertLatex(example.latex)}
							>
								{example.label}
							</Button>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Info Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>MathLive Keyboard Shortcuts</Card.Title>
			<Card.Description>Useful keyboard shortcuts for entering math</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div>
					<h4 class="mb-2 font-medium">Navigation</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">Tab</kbd> Next placeholder</li>
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">Shift+Tab</kbd> Previous</li>
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">Esc</kbd> Exit field</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Fractions & Powers</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">/</kbd> Fraction</li>
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">^</kbd> Superscript</li>
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">_</kbd> Subscript</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Text Mode</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">"</kbd> Toggle text mode</li>
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">\text{'{'}</kbd> Text block</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Common</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">\sqrt</kbd> Square root</li>
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">\sum</kbd> Summation</li>
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">\int</kbd> Integral</li>
						<li><kbd class="rounded bg-muted px-1.5 py-0.5">\alpha</kbd> Greek letter</li>
					</ul>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<style>
	/* Ensure the virtual keyboard appears properly */
	:global(math-field) {
		display: block;
	}

	:global(math-field::part(virtual-keyboard-toggle)) {
		display: block !important;
	}
</style>
