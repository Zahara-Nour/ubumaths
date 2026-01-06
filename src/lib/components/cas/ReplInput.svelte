<script lang="ts">
	import { replStore } from '$lib/stores/repl.svelte';
	import MathField from '$lib/components/MathField.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Play, Search } from 'lucide-svelte';
	import { cn } from '$lib/utils';

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
	 * - Enter: Submit
	 * - Shift+Enter: New line
	 * - ArrowUp / Ctrl+P: Navigate to previous history entry
	 * - ArrowDown / Ctrl+N: Navigate to next history entry
	 * - Ctrl+R: Search history
	 * - Escape: Cancel history navigation and restore original input
	 */
	function handleKeyDown(event: KeyboardEvent): void {
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
			replStore.startHistorySearch();
			return;
		}
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
		replStore.execute(replStore.currentInput);
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
		<div class="flex items-start gap-2">
			<span class="repl-hash shrink-0 font-mono text-sm text-primary select-none">math&gt;</span>
			<textarea
				bind:this={textareaRef}
				bind:value={replStore.currentInput}
				onkeydown={handleKeyDown}
				placeholder="Entrez une expression ou commande..."
				aria-label="Console de calcul symbolique"
				rows="1"
				disabled={replStore.isSearching}
				class={cn(
					'min-h-[2rem] flex-1 resize-none border-none bg-transparent font-mono text-sm',
					'text-foreground outline-none placeholder:text-muted-foreground',
					'focus:ring-0 focus:outline-none',
					replStore.isSearching && 'opacity-50'
				)}
			></textarea>
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
