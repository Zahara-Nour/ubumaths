<script lang="ts">
	/**
	 * Debug Toolbar Component
	 *
	 * Provides controls for switching between Execute/Debug mode and debug actions.
	 * Shows step controls, history navigation, and execution status.
	 */

	// Imports
	import { debugStore } from '$lib/stores/pythonDebug.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import StepForward from '@lucide/svelte/icons/step-forward';
	import StepBack from '@lucide/svelte/icons/step-back';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import Square from '@lucide/svelte/icons/square';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import type { DebugStepAction } from '$lib/shared/python/debug/types';

	// Types
	interface Props {
		/** Callback when run button is clicked */
		onRun: () => void;
		/** Callback for step actions */
		onStep: (action: DebugStepAction) => void;
		/** Callback when stop button is clicked */
		onStop: () => void;
		/** Whether controls are disabled (e.g., during code edit) */
		disabled?: boolean;
	}

	// Props
	let { onRun, onStep, onStop, disabled = false }: Props = $props();

	// Derived state
	let canStep = $derived(debugStore.canStep());
	let isPaused = $derived(debugStore.isPaused);
	let isRunning = $derived(debugStore.isRunning);
	let isDebugging = $derived(debugStore.isDebugging);
	let canStepBack = $derived(debugStore.canStepBack);
	let canStepForward = $derived(debugStore.canStepForward);
	// Display position: 1 = oldest, N = most recent (historyIndex 0 = most recent snapshot)
	let currentPosition = $derived(
		debugStore.snapshotCount > 0 ? debugStore.snapshotCount - debugStore.historyIndex : 0
	);

	// Functions
	function handleModeToggle() {
		debugStore.toggleMode();
	}

	function handleStepBack() {
		debugStore.stepBack();
	}

	function handleStepForward() {
		debugStore.stepForward();
	}
</script>

<div class="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
	<!-- Mode switch: Execute / Debug -->
	<div class="flex items-center gap-2">
		<Label class="text-sm font-medium text-muted-foreground">
			{isDebugging ? 'Debug' : 'Exécuter'}
		</Label>
		<Switch checked={isDebugging} onCheckedChange={handleModeToggle} disabled={disabled || isRunning} />
	</div>

	<div class="h-6 w-px bg-border" aria-hidden="true"></div>

	<!-- Run/Continue button -->
	{#if isDebugging}
		{#if isPaused}
			<Button
				variant="default"
				size="sm"
				onclick={() => onStep('continue')}
				disabled={disabled}
				aria-label="Continuer l'exécution"
			>
				<Play class="size-4" />
				<span class="hidden sm:inline">Continuer</span>
			</Button>
		{:else}
			<Button
				variant="default"
				size="sm"
				onclick={onRun}
				disabled={disabled || isRunning}
				aria-label="Démarrer le débogage"
			>
				<Play class="size-4" />
				<span class="hidden sm:inline">Déboguer</span>
			</Button>
		{/if}
	{:else}
		<Button
			variant="default"
			size="sm"
			onclick={onRun}
			disabled={disabled || isRunning}
			aria-label="Exécuter le code"
		>
			<Play class="size-4" />
			<span class="hidden sm:inline">Exécuter</span>
		</Button>
	{/if}

	<!-- Debug step controls (only shown in debug mode) -->
	{#if isDebugging}
		<div class="flex items-center gap-1">
			<!-- Step (into) -->
			<Button
				variant="outline"
				size="icon-sm"
				onclick={() => onStep('step')}
				disabled={disabled || !canStep}
				aria-label="Pas suivant (entrer dans les fonctions)"
				title="Pas"
			>
				<ArrowRight class="size-4" />
			</Button>

			<!-- Step over -->
			<Button
				variant="outline"
				size="icon-sm"
				onclick={() => onStep('step-over')}
				disabled={disabled || !canStep}
				aria-label="Pas suivant (sans entrer dans les fonctions)"
				title="Pas (ignorer fonctions)"
			>
				<StepForward class="size-4" />
			</Button>

			<!-- Step out -->
			<Button
				variant="outline"
				size="icon-sm"
				onclick={() => onStep('step-out')}
				disabled={disabled || !canStep}
				aria-label="Sortir de la fonction"
				title="Sortir"
			>
				<ArrowUpRight class="size-4" />
			</Button>

			<!-- Run to end -->
			<Button
				variant="outline"
				size="icon-sm"
				onclick={() => onStep('run-to-end')}
				disabled={disabled || !canStep}
				aria-label="Exécuter jusqu'à la fin"
				title="Exécuter jusqu'à la fin"
			>
				<SkipForward class="size-4" />
			</Button>
		</div>

		<div class="h-6 w-px bg-border" aria-hidden="true"></div>

		<!-- History navigation -->
		<div class="flex items-center gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={handleStepBack}
				disabled={disabled || !canStepBack}
				aria-label="Pas précédent dans l'historique"
				title="Reculer"
			>
				<StepBack class="size-4" />
			</Button>

			{#if debugStore.snapshotCount > 0}
				<span class="min-w-[4rem] text-center text-xs text-muted-foreground">
					Pas {currentPosition}/{debugStore.snapshotCount}
				</span>
			{/if}

			<Button
				variant="ghost"
				size="icon-sm"
				onclick={handleStepForward}
				disabled={disabled || !canStepForward}
				aria-label="Pas suivant dans l'historique"
				title="Avancer"
			>
				<StepForward class="size-4" />
			</Button>
		</div>

		<div class="h-6 w-px bg-border" aria-hidden="true"></div>

		<!-- Stop button -->
		<Button
			variant="destructive"
			size="icon-sm"
			onclick={onStop}
			disabled={disabled || debugStore.sessionState === 'idle'}
			aria-label="Arrêter le débogage"
			title="Arrêter"
		>
			<Square class="size-4" />
		</Button>
	{/if}

	<!-- Status indicator -->
	{#if isRunning}
		<div class="ml-auto flex items-center gap-2">
			<div class="size-2 animate-pulse rounded-full bg-yellow-500" aria-hidden="true"></div>
			<span class="text-xs text-muted-foreground">En cours...</span>
		</div>
	{:else if isPaused}
		<div class="ml-auto flex items-center gap-2">
			<Pause class="size-3 text-orange-500" aria-hidden="true" />
			<span class="text-xs text-muted-foreground">
				En pause{debugStore.currentLine ? ` (ligne ${debugStore.currentLine})` : ''}
			</span>
		</div>
	{:else if debugStore.sessionState === 'finished'}
		<div class="ml-auto flex items-center gap-2">
			<div class="size-2 rounded-full bg-green-500" aria-hidden="true"></div>
			<span class="text-xs text-muted-foreground">Terminé</span>
		</div>
	{/if}
</div>
