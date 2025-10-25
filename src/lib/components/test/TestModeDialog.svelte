<!--
	TestModeDialog Component
	========================
	Dialog for selecting test mode from the cart page

	Modes:
	- Display: Slideshow mode for revision (no scoring)
	- Interactive: Quiz mode with scoring
	- Course aux nombres: All questions at once with time limit

	Props:
	- open: boolean - Dialog open state
	- onSelect: (mode: TestMode, timeLimit?: number) => void - Callback when mode selected
-->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Eye, BrainCircuit, Timer, Rocket } from 'lucide-svelte';
	import type { TestMode } from '$lib/types/test';

	// Props
	interface Props {
		open: boolean;
		onSelect: (mode: TestMode, timeLimit?: number) => void;
	}

	let { open = $bindable(), onSelect }: Props = $props();

	// State
	let selectedMode = $state<TestMode | null>(null);
	let timeLimit = $state(5); // Default 5 minutes

	// Derived
	let canStart = $derived(
		selectedMode !== null && (selectedMode !== 'course' || (timeLimit > 0 && timeLimit <= 60))
	);

	// Mode configurations
	const modeConfigs = [
		{
			mode: 'display' as TestMode,
			title: 'Mode Révision',
			icon: Eye,
			description: 'Les questions défilent automatiquement. Idéal pour mémoriser.',
			features: ['Défilement automatique', 'Pas de score', 'Pause disponible']
		},
		{
			mode: 'interactive' as TestMode,
			title: 'Mode Quiz',
			icon: BrainCircuit,
			description: 'Répondez aux questions une par une. Score à la fin.',
			features: ['Validation des réponses', 'Score sur 10', 'Correction détaillée']
		},
		{
			mode: 'course' as TestMode,
			title: 'Course aux nombres',
			icon: Timer,
			description: 'Toutes les questions en même temps avec un temps limité.',
			features: ['Temps imparti', 'Toutes questions visibles', 'Score final']
		}
	];

	/**
	 * Handle mode selection
	 */
	function handleModeSelect(mode: TestMode) {
		selectedMode = mode;
	}

	/**
	 * Handle start test
	 */
	function handleStart() {
		if (!canStart || !selectedMode) return;

		const timeLimitSeconds = selectedMode === 'course' ? timeLimit * 60 : undefined;
		onSelect(selectedMode, timeLimitSeconds);

		// Reset state
		selectedMode = null;
		timeLimit = 5;
	}

	/**
	 * Handle dialog close
	 */
	function handleClose() {
		open = false;
		selectedMode = null;
		timeLimit = 5;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Choisissez un mode de test</Dialog.Title>
			<Dialog.Description>
				Sélectionnez comment vous souhaitez pratiquer avec les questions de votre panier.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Mode selection -->
		<div class="grid gap-4 py-4 sm:grid-cols-3">
			{#each modeConfigs as config (config.mode)}
				<button type="button" onclick={() => handleModeSelect(config.mode)} class="transition-all">
					<Card.Root
						class="h-full cursor-pointer transition-all hover:shadow-lg {selectedMode ===
						config.mode
							? 'border-primary ring-2 ring-primary ring-offset-2'
							: 'hover:border-primary/50'}"
					>
						<Card.Header>
							<div class="flex items-center gap-3">
								<div
									class="rounded-lg p-2 {selectedMode === config.mode
										? 'bg-primary text-primary-foreground'
										: 'bg-muted'}"
								>
									<svelte:component this={config.icon} class="h-6 w-6" />
								</div>
								<Card.Title class="text-base">{config.title}</Card.Title>
							</div>
						</Card.Header>
						<Card.Content>
							<p class="mb-3 text-sm text-muted-foreground">{config.description}</p>
							<ul class="space-y-1 text-xs text-muted-foreground">
								{#each config.features as feature (feature)}
									<li class="flex items-center gap-2">
										<span class="h-1 w-1 rounded-full bg-primary"></span>
										{feature}
									</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>
				</button>
			{/each}
		</div>

		<!-- Time limit input (for course mode) -->
		{#if selectedMode === 'course'}
			<div class="space-y-2 rounded-lg border bg-muted/50 p-4">
				<Label for="time-limit">Temps imparti (minutes)</Label>
				<div class="flex items-center gap-4">
					<Input
						id="time-limit"
						type="number"
						bind:value={timeLimit}
						min="1"
						max="60"
						class="max-w-32"
					/>
					<p class="text-sm text-muted-foreground">
						{timeLimit} minute{timeLimit > 1 ? 's' : ''}
						({timeLimit * 60} secondes)
					</p>
				</div>
				<p class="text-xs text-muted-foreground">
					Recommandation : comptez environ 20-30 secondes par question.
				</p>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose}>Annuler</Button>
			<Button onclick={handleStart} disabled={!canStart}>
				<Rocket class="mr-2 h-4 w-4" />
				Commencer le test
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
