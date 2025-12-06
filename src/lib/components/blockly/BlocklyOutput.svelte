<!--
  BlocklyOutput.svelte

  Console output display component for Blockly code execution.
  Shows stdout, stderr, and info messages with color coding.
-->
<script lang="ts">
	import { Trash2, Terminal } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { OutputLine } from '$lib/shared/blockly';
	import { cn } from '$lib/utils';

	// =============================================================================
	// Types
	// =============================================================================

	interface Props {
		/** Array of output lines to display */
		lines: OutputLine[];
		/** Callback to clear output */
		onclear: () => void;
	}

	// =============================================================================
	// Props
	// =============================================================================

	let { lines, onclear }: Props = $props();

	// =============================================================================
	// Derived State
	// =============================================================================

	/** Whether output is empty */
	let isEmpty = $derived(lines.length === 0);

	// =============================================================================
	// Helper Functions
	// =============================================================================

	/**
	 * Get CSS class for output line based on type
	 * @param type - Output line type
	 * @returns CSS class string
	 */
	function getLineClass(type: OutputLine['type']): string {
		switch (type) {
			case 'stderr':
				return 'text-red-600 dark:text-red-400';
			case 'info':
				return 'text-blue-600 dark:text-blue-400';
			case 'stdout':
			default:
				return 'text-foreground';
		}
	}

	/**
	 * Format timestamp for display
	 * @param timestamp - Unix timestamp in milliseconds
	 * @returns Formatted time string (HH:MM:SS)
	 */
	function formatTimestamp(timestamp: number | undefined): string {
		if (!timestamp) return '';
		const date = new Date(timestamp);
		return date.toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

<div class="flex h-full flex-col border-t border-border bg-background">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-border px-4 py-2">
		<div class="flex items-center gap-2">
			<Terminal class="h-4 w-4 text-muted-foreground" />
			<span class="text-sm font-medium">Console</span>
			{#if !isEmpty}
				<span class="text-xs text-muted-foreground"
					>({lines.length} ligne{lines.length > 1 ? 's' : ''})</span
				>
			{/if}
		</div>

		<Button onclick={onclear} variant="ghost" size="sm" class="gap-2" disabled={isEmpty}>
			<Trash2 class="h-3 w-3" />
			Effacer
		</Button>
	</div>

	<!-- Output content -->
	<div class="flex-1 overflow-auto">
		{#if isEmpty}
			<div class="flex h-full items-center justify-center text-muted-foreground">
				<p class="text-sm">Aucune sortie</p>
			</div>
		{:else}
			<div class="space-y-1 p-4 font-mono text-sm">
				{#each lines as line, index (index)}
					<div class="flex gap-2">
						{#if line.timestamp}
							<span class="text-xs text-muted-foreground">[{formatTimestamp(line.timestamp)}]</span>
						{/if}
						<span class={cn(getLineClass(line.type), 'break-words whitespace-pre-wrap')}>
							{line.text}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
