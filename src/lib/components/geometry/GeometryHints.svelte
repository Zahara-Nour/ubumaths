<script lang="ts">
	/**
	 * GeometryHints Component
	 * Progressive hint system with penalties
	 * Shows hints based on exercise and current step
	 */

	import { Button } from '$lib/components/ui/button';
	import type { GeometryHint, HintLevel } from '$lib/types/geometry';

	interface Props {
		exerciseId: string;
		currentStep?: number | null;
		onHintUsed: (hintLevel: HintLevel, penalty: number) => void;
	}

	let { exerciseId, currentStep = null, onHintUsed }: Props = $props();

	let hints = $state<GeometryHint[]>([]);
	let revealedHints = $state<Set<string>>(new Set());
	let loading = $state(true);

	// Load hints when component mounts or step changes
	$effect(() => {
		loadHints();
	});

	async function loadHints() {
		loading = true;
		try {
			// TODO: Fetch hints from API
			// For now, use placeholder data
			hints = [];
		} catch (error) {
			console.error('Failed to load hints:', error);
		} finally {
			loading = false;
		}
	}

	function revealHint(hint: GeometryHint) {
		if (revealedHints.has(hint.id)) return;

		revealedHints.add(hint.id);
		revealedHints = new Set(revealedHints); // Trigger reactivity

		onHintUsed(hint.hint_level, hint.score_penalty);
	}

	function getHintIcon(level: HintLevel): string {
		switch (level) {
			case 'general':
				return '💡';
			case 'specific':
				return '🔍';
			case 'step_by_step':
				return '📝';
			default:
				return '❓';
		}
	}

	function getHintLabel(level: HintLevel): string {
		switch (level) {
			case 'general':
				return 'Indice général (gratuit)';
			case 'specific':
				return 'Indice spécifique (-5%)';
			case 'step_by_step':
				return 'Solution étape par étape (-10%)';
			default:
				return 'Indice';
		}
	}

	function getPenaltyColor(penalty: number): string {
		if (penalty === 0) return 'text-green-600';
		if (penalty <= 5) return 'text-yellow-600';
		return 'text-destructive';
	}

	const sortedHints = $derived(
		hints.sort((a, b) => {
			const levelOrder: Record<HintLevel, number> = {
				general: 1,
				specific: 2,
				step_by_step: 3
			};
			return levelOrder[a.hint_level] - levelOrder[b.hint_level] || a.hint_order - b.hint_order;
		})
	);
</script>

<div class="geometry-hints">
	<div class="hints-header">
		<h3 class="text-lg font-semibold">Indices disponibles</h3>
		<p class="text-sm text-muted-foreground">Utilise les indices si tu es bloqué</p>
	</div>

	{#if loading}
		<div class="hints-loading">
			<p class="text-muted-foreground">Chargement des indices...</p>
		</div>
	{:else if sortedHints.length === 0}
		<div class="hints-empty">
			<p class="text-muted-foreground">Aucun indice disponible pour cet exercice</p>
		</div>
	{:else}
		<div class="hints-list">
			{#each sortedHints as hint (hint.id)}
				{@const isRevealed = revealedHints.has(hint.id)}

				<div class="hint-card" class:revealed={isRevealed}>
					<div class="hint-header">
						<div class="hint-info">
							<span class="hint-icon">{getHintIcon(hint.hint_level)}</span>
							<span class="hint-label">{getHintLabel(hint.hint_level)}</span>
						</div>

						{#if hint.score_penalty > 0}
							<span class="hint-penalty {getPenaltyColor(hint.score_penalty)}">
								-{hint.score_penalty}%
							</span>
						{:else}
							<span class="hint-free">Gratuit</span>
						{/if}
					</div>

					{#if isRevealed}
						<div class="hint-content">
							<p>{hint.hint_text}</p>
						</div>
					{:else}
						<Button
							variant="outline"
							size="sm"
							onclick={() => revealHint(hint)}
							class="reveal-button"
						>
							Révéler l'indice
						</Button>
					{/if}
				</div>
			{/each}
		</div>

		<div class="hints-footer">
			<p class="text-xs text-muted-foreground">
				💡 Les indices généraux sont gratuits. Les indices spécifiques et solutions réduisent ton
				score.
			</p>
		</div>
	{/if}
</div>

<style>
	.geometry-hints {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
	}

	.hints-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	.hints-loading,
	.hints-empty {
		padding: 2rem;
		text-align: center;
	}

	.hints-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.hint-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: hsl(var(--muted) / 0.3);
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		transition: all 0.2s ease;
	}

	.hint-card.revealed {
		background: hsl(var(--primary) / 0.05);
		border-color: hsl(var(--primary) / 0.3);
	}

	.hint-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.hint-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.hint-icon {
		font-size: 1.25rem;
	}

	.hint-label {
		font-weight: 500;
	}

	.hint-penalty {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.hint-free {
		color: hsl(var(--primary));
		font-weight: 600;
		font-size: 0.875rem;
	}

	.hint-content {
		padding: 0.75rem;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 0.25rem;
		line-height: 1.6;
	}

	.hints-footer {
		padding-top: 0.5rem;
		border-top: 1px solid hsl(var(--border));
	}
</style>
