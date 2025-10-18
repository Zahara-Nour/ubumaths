<script lang="ts">
	import type { CombatTurn } from '$lib/types/game';

	interface Props {
		turns: CombatTurn[];
		maxHeight?: string;
	}

	let { turns, maxHeight = '300px' }: Props = $props();

	function getActionIcon(action: string): string {
		return (
			{
				spell: '⚔️',
				heal: '💚',
				monster_attack: '👹',
				challenge: '📝'
			}[action] || '•'
		);
	}

	function getActionColor(action: string, critical?: boolean): string {
		if (critical) return 'text-yellow-500';

		return (
			{
				spell: 'text-primary',
				heal: 'text-green-500',
				monster_attack: 'text-destructive',
				challenge: 'text-blue-500'
			}[action] || 'text-foreground'
		);
	}

	function formatTurnMessage(turn: CombatTurn): string {
		if (turn.action === 'spell' && turn.damage_dealt) {
			const criticalText = turn.critical ? ' CRITIQUE !' : '';
			return `Inflige ${turn.damage_dealt} points de dégâts${criticalText}`;
		}

		if (turn.action === 'heal' && turn.healing_done) {
			return `Récupère ${turn.healing_done} PV`;
		}

		if (turn.action === 'monster_attack' && turn.damage_dealt) {
			return `Le monstre attaque ! ${turn.damage_dealt} dégâts`;
		}

		if (turn.action === 'challenge' && turn.challenge_result) {
			return turn.challenge_result.success ? 'Défi réussi !' : 'Défi échoué';
		}

		return 'Action effectuée';
	}
</script>

<div class="combat-log rounded-lg border border-border bg-card">
	<div class="border-b border-border p-3">
		<h3 class="font-bold text-card-foreground">Journal de combat</h3>
	</div>

	<div class="overflow-y-auto p-3" style="max-height: {maxHeight}">
		{#if turns.length === 0}
			<p class="text-center text-sm text-muted-foreground">Le combat va commencer...</p>
		{:else}
			<div class="space-y-2">
				{#each turns as turn (turn.timestamp)}
					<div
						class="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm {getActionColor(
							turn.action,
							turn.critical
						)}"
					>
						<span class="text-lg">{getActionIcon(turn.action)}</span>
						<div class="flex-1">
							<p class="font-medium">Tour {turn.turn}, Round {turn.round}</p>
							<p class="text-muted-foreground">{formatTurnMessage(turn)}</p>
							{#if turn.challenge_result}
								<p class="text-xs text-muted-foreground">
									Temps : {(turn.challenge_result.time_taken / 1000).toFixed(1)}s
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
