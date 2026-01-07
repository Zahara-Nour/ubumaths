<script lang="ts">
	import { replStore } from '$lib/stores/repl.svelte';
	import MathField from '$lib/components/MathField.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Play, Search } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { CompletionProvider, type Completion } from '$lib/mathAST/cli/completion';

	interface Props {
		variant: 'terminal' | 'mathfield';
	}

	let { variant }: Props = $props();

	/** Reference to textarea for cursor positioning */
	let textareaRef: HTMLTextAreaElement | undefined = $state();

	/** Reference to search input */
	let searchInputRef: HTMLInputElement | undefined = $state();

	/** Track previous search state to detect transitions */
	let wasSearching = $state(false);

	// ==========================================================================
	// Auto-Completion State
	// ==========================================================================

	const completionProvider = new CompletionProvider();

	/** Current list of completion suggestions */
	let completions = $state<Completion[]>([]);

	/** Index of selected completion in the list */
	let selectedIndex = $state(0);

	/** Whether completion dropdown should be shown */
	let showCompletions = $state(false);

	/** Info about the current word being typed */
	let currentWordInfo = $state<{ word: string; start: number; end: number } | null>(null);

	/** Reference to the completion list for scrolling */
	let completionListRef: HTMLDivElement | undefined = $state();

	// ==========================================================================
	// Word Extraction Helpers
	// ==========================================================================

	/**
	 * Extract the current word being typed at cursor position.
	 * A "word" consists of letters, numbers, and underscores.
	 */
	function getCurrentWord(
		text: string,
		cursorPos: number
	): { word: string; start: number; end: number } {
		// Word characters: letters, numbers, underscore, and dot (for commands)
		const wordCharRegex = /[a-zA-Z0-9_.]/;

		// Find start of word (scan backwards from cursor)
		let start = cursorPos;
		for (let i = cursorPos - 1; i >= 0; i--) {
			if (wordCharRegex.test(text[i])) {
				start = i;
			} else {
				break;
			}
		}

		// Find end of word (scan forwards from cursor)
		let end = cursorPos;
		for (let i = cursorPos; i < text.length; i++) {
			if (wordCharRegex.test(text[i])) {
				end = i + 1;
			} else {
				break;
			}
		}

		// Return the prefix (from word start to cursor)
		return {
			word: text.slice(start, cursorPos),
			start,
			end
		};
	}

	// ==========================================================================
	// Completion Logic
	// ==========================================================================

	/**
	 * Update completion suggestions based on current input and cursor position.
	 */
	function updateCompletions(): void {
		if (!textareaRef) {
			hideCompletions();
			return;
		}

		const cursorPos = textareaRef.selectionStart;
		const text = replStore.currentInput;

		const wordInfo = getCurrentWord(text, cursorPos);
		currentWordInfo = wordInfo;

		// Need at least 1 character to show completions
		if (wordInfo.word.length < 1) {
			hideCompletions();
			return;
		}

		// Get context from replStore
		const context = {
			variables: replStore.getVariableNames(),
			functions: replStore.getFunctionNames()
		};

		// Get completions (limit to reasonable number)
		const results = completionProvider.getCompletions(wordInfo.word, context, { maxResults: 10 });

		if (results.length > 0) {
			completions = results;
			selectedIndex = 0;
			showCompletions = true;
		} else {
			hideCompletions();
		}
	}

	/**
	 * Hide completions and reset state.
	 */
	function hideCompletions(): void {
		completions = [];
		showCompletions = false;
		selectedIndex = 0;
		currentWordInfo = null;
	}

	/**
	 * Insert the selected completion into the input.
	 */
	function insertCompletion(completion: Completion): void {
		if (!currentWordInfo || !textareaRef) return;

		const text = replStore.currentInput;
		const before = text.slice(0, currentWordInfo.start);
		const after = text.slice(currentWordInfo.end);

		// Build new text
		const newText = before + completion.insertText + after;
		replStore.currentInput = newText;

		// Position cursor after inserted text
		const newCursorPos = currentWordInfo.start + completion.insertText.length;
		requestAnimationFrame(() => {
			if (textareaRef) {
				textareaRef.selectionStart = newCursorPos;
				textareaRef.selectionEnd = newCursorPos;
				textareaRef.focus();
			}
		});

		hideCompletions();
	}

	/**
	 * Scroll the selected completion into view.
	 */
	function scrollSelectedIntoView(): void {
		if (!completionListRef) return;

		const selectedEl = completionListRef.querySelector(`[data-index="${selectedIndex}"]`);
		if (selectedEl) {
			selectedEl.scrollIntoView({ block: 'nearest' });
		}
	}

	/** Focus search input when search mode starts */
	$effect(() => {
		if (replStore.isSearching && searchInputRef) {
			searchInputRef.focus();
		}
	});

	/** Focus textarea and ensure value is correct after search ends */
	$effect(() => {
		const isSearching = replStore.isSearching;

		// Only restore when transitioning from searching to not searching
		if (wasSearching && !isSearching && textareaRef && variant === 'terminal') {
			// Explicitly set the value to ensure it's synced after search
			textareaRef.value = replStore.currentInput;
			textareaRef.focus();
			// Place cursor at end
			textareaRef.selectionStart = textareaRef.value.length;
			textareaRef.selectionEnd = textareaRef.value.length;
		}

		// Update tracking state
		wasSearching = isSearching;
	});

	/**
	 * Handle key press in textarea input.
	 * - Tab: Insert completion (when completions shown)
	 * - ArrowUp/Down: Navigate completions (when shown) or history (when not)
	 * - Escape: Close completions or cancel history navigation
	 * - Enter: Submit (closes completions first if shown)
	 * - Shift+Enter: New line
	 * - Ctrl+P/N: Navigate history
	 * - Ctrl+R: Search history
	 */
	function handleKeyDown(event: KeyboardEvent): void {
		// =======================================================================
		// Completion Navigation (takes priority when completions are visible)
		// =======================================================================

		if (showCompletions && completions.length > 0) {
			// Tab or Enter: Insert selected completion
			if (event.key === 'Tab') {
				event.preventDefault();
				insertCompletion(completions[selectedIndex]);
				return;
			}

			// Arrow down: Next completion
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				selectedIndex = (selectedIndex + 1) % completions.length;
				scrollSelectedIntoView();
				return;
			}

			// Arrow up: Previous completion
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				selectedIndex = (selectedIndex - 1 + completions.length) % completions.length;
				scrollSelectedIntoView();
				return;
			}

			// Escape: Close completions
			if (event.key === 'Escape') {
				event.preventDefault();
				hideCompletions();
				return;
			}

			// Enter with completions shown: submit (completions will hide on submit)
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				hideCompletions();
				submitInput();
				return;
			}
		}

		// =======================================================================
		// Regular Key Handling (when completions not shown)
		// =======================================================================

		// Handle Enter key
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submitInput();
			return;
		}

		// Cancel history navigation: Escape
		if (event.key === 'Escape' && replStore.isNavigatingHistory) {
			event.preventDefault();
			replStore.cancelHistoryNavigation();
			return;
		}

		// History navigation: ArrowUp or Ctrl+P
		if (event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p')) {
			event.preventDefault();
			replStore.navigateHistory('up');
			hideCompletions();
			// Place cursor at end after navigation
			requestAnimationFrame(() => {
				if (textareaRef) {
					textareaRef.selectionStart = textareaRef.value.length;
					textareaRef.selectionEnd = textareaRef.value.length;
				}
			});
			return;
		}

		// History navigation: ArrowDown or Ctrl+N
		if (event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n')) {
			event.preventDefault();
			replStore.navigateHistory('down');
			hideCompletions();
			// Place cursor at end after navigation
			requestAnimationFrame(() => {
				if (textareaRef) {
					textareaRef.selectionStart = textareaRef.value.length;
					textareaRef.selectionEnd = textareaRef.value.length;
				}
			});
			return;
		}

		// History search: Ctrl+R
		if (event.ctrlKey && event.key === 'r') {
			event.preventDefault();
			hideCompletions();
			replStore.startHistorySearch();
			return;
		}
	}

	/**
	 * Handle input changes in textarea - update completions.
	 */
	function handleInput(): void {
		// Small delay to let the input value update
		requestAnimationFrame(() => {
			updateCompletions();
		});
	}

	/**
	 * Handle key press in search input.
	 * - Enter: Select current result and edit
	 * - Escape: Cancel search
	 * - Ctrl+R: Next result
	 * - Ctrl+S: Previous result
	 * - ArrowUp/Down: Navigate results
	 */
	function handleSearchKeyDown(event: KeyboardEvent): void {
		// Select current result
		if (event.key === 'Enter') {
			event.preventDefault();
			replStore.selectSearchResult();
			return;
		}

		// Cancel search and restore original input
		if (event.key === 'Escape') {
			event.preventDefault();
			replStore.abortHistorySearch();
			return;
		}

		// Next result: Ctrl+R or ArrowDown
		if ((event.ctrlKey && event.key === 'r') || event.key === 'ArrowDown') {
			event.preventDefault();
			replStore.nextSearchResult();
			return;
		}

		// Previous result: Ctrl+S or ArrowUp
		if ((event.ctrlKey && event.key === 's') || event.key === 'ArrowUp') {
			event.preventDefault();
			replStore.prevSearchResult();
			return;
		}
	}

	/**
	 * Handle search input change.
	 */
	function handleSearchInput(event: Event): void {
		const target = event.target as HTMLInputElement;
		replStore.updateSearchQuery(target.value);
	}

	/**
	 * Handle key press in MathField.
	 * MathField custom element uses 'input' events, but we can listen for keydown.
	 */
	function handleMathFieldKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submitInput();
		}
	}

	/**
	 * Submit the current input.
	 */
	function submitInput(): void {
		hideCompletions();
		replStore.execute(replStore.currentInput);
	}

	/**
	 * Get icon/badge for completion kind.
	 */
	function getKindBadge(kind: Completion['kind']): { text: string; class: string } {
		switch (kind) {
			case 'function':
				return { text: 'fn', class: 'bg-blue-500/20 text-blue-400' };
			case 'variable':
				return { text: 'var', class: 'bg-green-500/20 text-green-400' };
			case 'constant':
				return { text: 'const', class: 'bg-purple-500/20 text-purple-400' };
			case 'greek':
				return { text: 'α', class: 'bg-amber-500/20 text-amber-400' };
			case 'command':
				return { text: 'cmd', class: 'bg-cyan-500/20 text-cyan-400' };
			default:
				return { text: '?', class: 'bg-gray-500/20 text-gray-400' };
		}
	}
</script>

<div class="p-4">
	{#if variant === 'terminal'}
		<!-- History search UI (Ctrl+R) -->
		{#if replStore.isSearching}
			<div class="mb-2 rounded border border-primary/50 bg-primary/5 p-2">
				<div class="flex items-center gap-2">
					<Search class="size-4 shrink-0 text-primary" />
					<span class="shrink-0 font-mono text-xs text-muted-foreground">(reverse-i-search)</span>
					<input
						bind:this={searchInputRef}
						type="text"
						value={replStore.searchQuery}
						oninput={handleSearchInput}
						onkeydown={handleSearchKeyDown}
						placeholder="Rechercher..."
						class={cn(
							'flex-1 border-none bg-transparent font-mono text-sm',
							'text-foreground outline-none placeholder:text-muted-foreground'
						)}
					/>
					<span class="shrink-0 font-mono text-xs text-muted-foreground">
						{#if replStore.searchResults.length > 0}
							{replStore.searchResultIndex + 1}/{replStore.searchResults.length}
						{:else if replStore.searchQuery}
							0/0
						{/if}
					</span>
				</div>
				{#if replStore.currentSearchResult}
					<div
						class="mt-2 truncate rounded bg-muted/50 px-2 py-1 font-mono text-sm text-foreground"
					>
						{replStore.currentSearchResult.input}
					</div>
				{/if}
				<div class="mt-1 text-xs text-muted-foreground">
					<kbd class="rounded border border-border bg-muted px-1">Enter</kbd> selectionner
					<kbd class="ml-2 rounded border border-border bg-muted px-1">Esc</kbd> annuler
					<kbd class="ml-2 rounded border border-border bg-muted px-1">↑↓</kbd> naviguer
				</div>
			</div>
		{/if}

		<!-- Terminal-style textarea input -->
		<div class="relative flex items-start gap-2">
			<span class="repl-hash shrink-0 font-mono text-sm text-primary select-none">math&gt;</span>
			<div class="relative flex-1">
				<textarea
					bind:this={textareaRef}
					bind:value={replStore.currentInput}
					onkeydown={handleKeyDown}
					oninput={handleInput}
					placeholder="Entrez une expression ou commande..."
					aria-label="Console de calcul symbolique"
					rows="1"
					disabled={replStore.isSearching}
					autocomplete="off"
					class={cn(
						'min-h-[2rem] w-full resize-none border-none bg-transparent font-mono text-sm',
						'text-foreground outline-none placeholder:text-muted-foreground',
						'focus:ring-0 focus:outline-none',
						replStore.isSearching && 'opacity-50'
					)}
				></textarea>

				<!-- Completion dropdown -->
				{#if showCompletions && completions.length > 0}
					<div
						bind:this={completionListRef}
						class="absolute top-full left-0 z-50 mt-1 max-h-48 w-64 overflow-auto rounded-md border border-border bg-popover shadow-lg"
						role="listbox"
						aria-label="Suggestions d'auto-complétion"
					>
						{#each completions as completion, i (completion.label)}
							{@const badge = getKindBadge(completion.kind)}
							<button
								type="button"
								data-index={i}
								role="option"
								aria-selected={i === selectedIndex}
								class={cn(
									'flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm',
									'transition-colors duration-75',
									i === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
								)}
								onclick={() => insertCompletion(completion)}
								onmouseenter={() => (selectedIndex = i)}
							>
								<!-- Kind badge -->
								<span
									class={cn(
										'shrink-0 rounded px-1 py-0.5 font-mono text-[10px] leading-none',
										badge.class
									)}
								>
									{badge.text}
								</span>

								<!-- Label -->
								<span class="flex-1 truncate font-mono">{completion.label}</span>

								<!-- Description (optional) -->
								{#if completion.description}
									<span class="max-w-24 shrink-0 truncate text-xs text-muted-foreground">
										{completion.description}
									</span>
								{/if}
							</button>
						{/each}

						<!-- Keyboard hint -->
						<div class="border-t border-border px-2 py-1 text-[10px] text-muted-foreground">
							<kbd class="rounded border border-border bg-muted px-1">↑↓</kbd> naviguer
							<kbd class="ml-1 rounded border border-border bg-muted px-1">Tab</kbd> insérer
							<kbd class="ml-1 rounded border border-border bg-muted px-1">Esc</kbd> fermer
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- MathField input with submit button -->
		<div class="space-y-2">
			<label for="mathfield-input" class="block text-sm font-medium text-muted-foreground">
				Expression mathématique
			</label>
			<div class="flex items-center gap-2">
				<MathField
					bind:value={replStore.currentInput}
					virtual-keyboard-mode="manual"
					id="mathfield-input"
					onkeydown={handleMathFieldKeyDown}
					class={cn(
						'flex-1 rounded-md border border-border bg-background px-3 py-2',
						'text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
					)}
				/>
				<Button onclick={submitInput} size="icon" aria-label="Exécuter">
					<Play class="size-4" />
				</Button>
			</div>
			<p class="text-xs text-muted-foreground">
				Appuyez sur <kbd
					class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Entrée</kbd
				> pour exécuter
			</p>
		</div>
	{/if}
</div>

<style>
	.repl-hash {
		color: hsl(var(--primary));
	}
</style>
