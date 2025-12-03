<script lang="ts">
	import { replStore } from '$lib/stores/repl.svelte';
	import MathField from '$lib/components/MathField.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Play } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		variant: 'terminal' | 'mathfield';
	}

	let { variant }: Props = $props();

	/**
	 * Handle key press in textarea input.
	 * - Enter: Submit
	 * - Shift+Enter: New line
	 * - ArrowUp: Navigate to previous history entry
	 * - ArrowDown: Navigate to next history entry
	 */
	function handleKeyDown(event: KeyboardEvent): void {
		// Handle Enter key
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submitInput();
			return;
		}

		// Handle history navigation (only if cursor at start/end of input)
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			const target = event.target as HTMLTextAreaElement;
			const atStart = target.selectionStart === 0;
			const atEnd = target.selectionStart === target.value.length;

			if ((event.key === 'ArrowUp' && atStart) || (event.key === 'ArrowDown' && atEnd)) {
				event.preventDefault();
				replStore.navigateHistory(event.key === 'ArrowUp' ? 'up' : 'down');
			}
		}
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
		<!-- Terminal-style textarea input -->
		<div class="flex items-start gap-2">
			<span class="repl-hash shrink-0 font-mono text-sm text-primary select-none">math&gt;</span>
			<textarea
				bind:value={replStore.currentInput}
				onkeydown={handleKeyDown}
				placeholder="Entrez une expression ou commande..."
				aria-label="Console de calcul symbolique"
				rows="1"
				class={cn(
					'min-h-[2rem] flex-1 resize-none border-none bg-transparent font-mono text-sm',
					'text-foreground outline-none placeholder:text-muted-foreground',
					'focus:ring-0 focus:outline-none'
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
