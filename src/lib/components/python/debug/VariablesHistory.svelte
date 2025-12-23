<script lang="ts">
	/**
	 * Variables History Table Component
	 *
	 * Displays a table tracking all variables across execution steps.
	 * - Rows: variable names
	 * - Columns: execution steps (snapshots)
	 * - Highlights changed values and current step
	 */

	import { debugStore } from '$lib/stores/pythonDebug.svelte';
	import { cn } from '$lib/utils';
	import { SvelteSet } from 'svelte/reactivity';
	import type { DebugSnapshot, DebugVariable } from '$lib/shared/python/debug/types';

	// Types
	interface Props {
		/** CSS class for the container */
		class?: string;
	}

	// Props
	let { class: className }: Props = $props();

	// Reference for auto-scroll
	let tableContainer: HTMLDivElement | null = $state(null);

	// Get all snapshots in chronological order (oldest first)
	let snapshots = $derived([...debugStore.allSnapshots].reverse());
	let currentStepIndex = $derived(
		snapshots.length > 0 ? snapshots.length - 1 - debugStore.historyIndex : -1
	);

	// Build the list of unique variable names across all snapshots
	let variableNames = $derived.by(() => {
		const names = new SvelteSet<string>();
		for (const snapshot of snapshots) {
			// Get variables from current frame (locals) and globals
			const currentFrame = snapshot.callStack[snapshot.callStack.length - 1];
			if (currentFrame) {
				for (const v of currentFrame.locals) {
					if (!v.isBuiltin) names.add(v.name);
				}
			}
			for (const v of snapshot.globals) {
				if (!v.isBuiltin) names.add(v.name);
			}
		}
		return Array.from(names).sort();
	});

	/**
	 * Get variable value at a specific snapshot
	 */
	function getVariableAtStep(
		varName: string,
		snapshot: DebugSnapshot
	): DebugVariable | undefined {
		// First check locals in current frame
		const currentFrame = snapshot.callStack[snapshot.callStack.length - 1];
		if (currentFrame) {
			const local = currentFrame.locals.find((v) => v.name === varName);
			if (local) return local;
		}
		// Then check globals
		return snapshot.globals.find((v) => v.name === varName);
	}

	/**
	 * Check if value changed from previous step
	 */
	function hasChanged(varName: string, stepIndex: number): boolean {
		if (stepIndex === 0) return false;

		const current = getVariableAtStep(varName, snapshots[stepIndex]);
		const previous = getVariableAtStep(varName, snapshots[stepIndex - 1]);

		if (!current && !previous) return false;
		if (!current || !previous) return true;
		return current.value !== previous.value;
	}

	/**
	 * Check if variable is new at this step
	 */
	function isNew(varName: string, stepIndex: number): boolean {
		if (stepIndex === 0) {
			return getVariableAtStep(varName, snapshots[0]) !== undefined;
		}
		const current = getVariableAtStep(varName, snapshots[stepIndex]);
		const previous = getVariableAtStep(varName, snapshots[stepIndex - 1]);
		return current !== undefined && previous === undefined;
	}

	/**
	 * Format value for display (truncate if too long)
	 */
	function formatValue(value: string | undefined): string {
		if (!value) return '—';
		const maxLength = 15;
		if (value.length > maxLength) {
			return value.slice(0, maxLength) + '…';
		}
		return value;
	}

	/**
	 * Get cell classes based on state
	 */
	function getCellClass(varName: string, stepIndex: number, isCurrentStep: boolean): string {
		const classes: string[] = [];

		if (isCurrentStep) {
			classes.push('bg-amber-100 dark:bg-amber-900/40');
		}

		if (isNew(varName, stepIndex)) {
			classes.push('ring-2 ring-inset ring-green-500 dark:ring-green-400');
		} else if (hasChanged(varName, stepIndex)) {
			classes.push('ring-2 ring-inset ring-amber-500 dark:ring-amber-400');
		}

		return classes.join(' ');
	}

	// Auto-scroll to current column when it changes
	$effect(() => {
		if (tableContainer && currentStepIndex >= 0) {
			const currentColumn = tableContainer.querySelector(`[data-step="${currentStepIndex}"]`);
			if (currentColumn) {
				currentColumn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
			}
		}
	});
</script>

{#if snapshots.length > 0 && variableNames.length > 0}
	<div class={cn('flex flex-col gap-2', className)}>
		<h3 class="text-sm font-medium text-foreground">Historique des variables</h3>

		<div
			bind:this={tableContainer}
			class="overflow-auto rounded-lg border border-border bg-background"
		>
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b border-border bg-muted/50">
						<th
							class="sticky left-0 z-10 min-w-[100px] border-r border-border bg-muted/50 px-3 py-2 text-left font-medium text-foreground"
						>
							Variable
						</th>
						{#each snapshots as snapshot, stepIndex (snapshot.id)}
							<th
								data-step={stepIndex}
								class={cn(
									'min-w-[80px] px-3 py-2 text-center font-medium',
									stepIndex === currentStepIndex
										? 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100'
										: 'text-muted-foreground'
								)}
							>
								<div class="flex flex-col items-center gap-0.5">
									<span class="text-xs">Pas {stepIndex + 1}</span>
									<span class="text-[10px] opacity-70">L{snapshot.lineNumber}</span>
								</div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each variableNames as varName (varName)}
						<tr class="border-b border-border last:border-b-0 hover:bg-muted/30">
							<td
								class="sticky left-0 z-10 border-r border-border bg-background px-3 py-1.5 font-mono font-medium text-foreground"
							>
								{varName}
							</td>
							{#each snapshots as snapshot, stepIndex (snapshot.id)}
								{@const variable = getVariableAtStep(varName, snapshot)}
								{@const isCurrentStep = stepIndex === currentStepIndex}
								<td
									class={cn(
										'px-2 py-1.5 text-center font-mono text-xs transition-colors',
										getCellClass(varName, stepIndex, isCurrentStep)
									)}
									title={variable?.value ?? 'Non défini'}
								>
									{#if variable}
										<span
											class={cn(
												'inline-block rounded px-1',
												variable.type === 'str' && 'text-green-700 dark:text-green-300',
												(variable.type === 'int' || variable.type === 'float') &&
													'text-blue-700 dark:text-blue-300',
												variable.type === 'bool' && 'text-purple-700 dark:text-purple-300',
												(variable.type === 'list' || variable.type === 'dict') &&
													'text-orange-700 dark:text-orange-300'
											)}
										>
											{formatValue(variable.value)}
										</span>
									{:else}
										<span class="text-muted-foreground/50">—</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Legend -->
		<div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
			<span class="flex items-center gap-1">
				<span class="inline-block size-3 rounded bg-amber-200 dark:bg-amber-800"></span>
				Pas courant
			</span>
			<span class="flex items-center gap-1">
				<span class="inline-block size-3 rounded ring-2 ring-inset ring-green-500"></span>
				Nouvelle variable
			</span>
			<span class="flex items-center gap-1">
				<span class="inline-block size-3 rounded ring-2 ring-inset ring-amber-500"></span>
				Valeur modifiée
			</span>
		</div>
	</div>
{:else if debugStore.sessionState !== 'idle'}
	<div class="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
		<p>Aucune variable à afficher</p>
		<p class="text-xs mt-1">Exécutez le code pas à pas pour voir l'évolution des variables</p>
	</div>
{/if}
