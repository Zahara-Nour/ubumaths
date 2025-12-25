<script lang="ts">
	/**
	 * Debug Panel Container Component
	 *
	 * Main container that combines VariablesPanel, CallStackPanel, and LoopIndicator.
	 * Only visible when debugging is active.
	 */

	// Imports
	import { debugStore } from '$lib/stores/pythonDebug.svelte';
	import VariablesPanel from './VariablesPanel.svelte';
	import VariablesHistory from './VariablesHistory.svelte';
	import CallStackPanel from './CallStackPanel.svelte';
	import LoopIndicator from './LoopIndicator.svelte';
	import { cn } from '$lib/utils';
	import Bug from '@lucide/svelte/icons/bug';
	import Info from '@lucide/svelte/icons/info';
	import Table from '@lucide/svelte/icons/table';
	import List from '@lucide/svelte/icons/list';

	// Types
	interface Props {
		/** Callback when a stack frame is selected */
		onSelectFrame?: (index: number) => void;
		/** CSS class for the container */
		class?: string;
	}

	// Props
	let { onSelectFrame, class: className }: Props = $props();

	// Local state for view toggle
	let viewMode = $state<'list' | 'table'>('list');

	// Derived state from debug store
	let currentSnapshot = $derived(debugStore.currentSnapshot);
	let isDebugging = $derived(debugStore.isDebugging);
	let isPaused = $derived(debugStore.isPaused);
	let sessionState = $derived(debugStore.sessionState);
	let currentLine = $derived(debugStore.currentLine);
	let pauseReason = $derived(debugStore.pauseReason);

	// Extract data from current snapshot
	let locals = $derived(currentSnapshot?.callStack[0]?.locals ?? []);
	let globals = $derived(currentSnapshot?.globals ?? []);
	let callStack = $derived(currentSnapshot?.callStack ?? []);
	let loops = $derived(currentSnapshot?.loops ?? []);

	/**
	 * Get pause reason text in French
	 */
	function getPauseReasonText(reason: typeof pauseReason): string {
		switch (reason) {
			case 'breakpoint':
				return "Point d'arrêt atteint";
			case 'step':
				return 'Pas terminé';
			case 'exception':
				return 'Exception levée';
			case 'start':
				return 'Début du programme';
			default:
				return 'En pause';
		}
	}

	/**
	 * Get trace event text in French
	 */
	function getEventText(event: string | undefined): string {
		switch (event) {
			case 'line':
				return 'Ligne';
			case 'call':
				return 'Appel de fonction';
			case 'return':
				return 'Retour de fonction';
			case 'exception':
				return 'Exception';
			default:
				return '';
		}
	}
</script>

{#if isDebugging && sessionState !== 'idle'}
	<div
		class={cn('flex flex-col gap-4 rounded-lg border border-border bg-background p-4', className)}
	>
		<!-- Header with debug info -->
		<div class="flex items-center justify-between border-b border-border pb-3">
			<div class="flex items-center gap-2">
				<Bug class="size-5 text-primary" aria-hidden="true" />
				<h2 class="text-base font-semibold text-foreground">Débogueur</h2>
			</div>

			{#if isPaused && currentLine}
				<div class="flex items-center gap-3 text-sm">
					{#if pauseReason}
						<span class="flex items-center gap-1 text-muted-foreground">
							<Info class="size-3.5" aria-hidden="true" />
							{getPauseReasonText(pauseReason)}
						</span>
					{/if}
					<span class="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-primary">
						Ligne {currentLine}
					</span>
					{#if currentSnapshot?.event}
						<span class="text-xs text-muted-foreground">
							({getEventText(currentSnapshot.event)})
						</span>
					{/if}
				</div>
			{:else if sessionState === 'running' || sessionState === 'stepping'}
				<span class="text-sm text-muted-foreground">Exécution en cours...</span>
			{:else if sessionState === 'finished'}
				<span class="text-sm text-green-600 dark:text-green-400">Exécution terminée</span>
			{/if}
		</div>

		<!-- Loop indicator (shown at top when active) -->
		<LoopIndicator {loops} />

		<!-- View mode toggle -->
		<div class="flex items-center gap-2">
			<span class="text-xs text-muted-foreground">Vue:</span>
			<div class="flex rounded-md border border-border">
				<button
					type="button"
					onclick={() => (viewMode = 'list')}
					class={cn(
						'flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors',
						viewMode === 'list'
							? 'bg-primary text-primary-foreground'
							: 'bg-background text-muted-foreground hover:bg-muted'
					)}
					aria-pressed={viewMode === 'list'}
				>
					<List class="size-3.5" aria-hidden="true" />
					Liste
				</button>
				<button
					type="button"
					onclick={() => (viewMode = 'table')}
					class={cn(
						'flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors',
						viewMode === 'table'
							? 'bg-primary text-primary-foreground'
							: 'bg-background text-muted-foreground hover:bg-muted'
					)}
					aria-pressed={viewMode === 'table'}
				>
					<Table class="size-3.5" aria-hidden="true" />
					Historique
				</button>
			</div>
		</div>

		<!-- Main content based on view mode -->
		{#if viewMode === 'list'}
			<!-- List view: Variables and Call Stack side by side -->
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Variables Panel -->
				<div class="min-w-0">
					<VariablesPanel {locals} {globals} />
				</div>

				<!-- Call Stack Panel -->
				<div class="min-w-0">
					<CallStackPanel {callStack} {onSelectFrame} />
				</div>
			</div>
		{:else}
			<!-- Table view: Variables history -->
			<VariablesHistory />

			<!-- Call Stack (compact) -->
			<CallStackPanel {callStack} {onSelectFrame} />
		{/if}

		<!-- Snapshot info (debug helper) -->
		{#if currentSnapshot}
			<div class="border-t border-border pt-2 text-xs text-muted-foreground">
				<span>
					Instantané #{currentSnapshot.id.slice(0, 8)} |
					{debugStore.snapshotCount} dans l'historique
				</span>
			</div>
		{/if}
	</div>
{/if}
