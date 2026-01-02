<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import { DIFFICULTY_LABELS, type Difficulty } from '$lib/types/minesweeper';

	// Types - only includes properties used by this component
	interface TournamentData {
		id: string;
		name: string;
		description?: string | null;
		difficulty: Difficulty;
		start_date: string;
		end_date: string;
		top_x_games: number;
		my_games_count: number;
		my_wins_count: number;
		my_average_score: number | null;
		has_in_progress_game: boolean;
		time_remaining_seconds: number;
		// Additional properties from API (not used in display)
		[key: string]: unknown;
	}

	// Props
	let { tournament }: { tournament: TournamentData } = $props();

	// Derived state
	let difficultyLabel = $derived(DIFFICULTY_LABELS[tournament.difficulty] || tournament.difficulty);

	let difficultyColor = $derived.by(() => {
		switch (tournament.difficulty) {
			case 'beginner':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
			case 'intermediate':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
			case 'expert':
				return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
			default:
				return '';
		}
	});

	// Check if tournament has started
	let isStarted = $derived(new Date(tournament.start_date) <= new Date());

	// Format time as countdown
	function formatCountdown(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) return `${days}j ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	// Time remaining (for active tournaments)
	let timeRemaining = $derived.by(() => {
		if (!isStarted) return null;
		const seconds = tournament.time_remaining_seconds;
		if (seconds <= 0) return 'Termine';
		return formatCountdown(seconds);
	});

	// Time until start (for scheduled tournaments)
	let timeUntilStart = $derived.by(() => {
		if (isStarted) return null;
		const startDate = new Date(tournament.start_date);
		const now = new Date();
		const seconds = Math.max(0, Math.floor((startDate.getTime() - now.getTime()) / 1000));
		return formatCountdown(seconds);
	});

	// Format date range
	let dateRange = $derived.by(() => {
		const start = new Date(tournament.start_date);
		const end = new Date(tournament.end_date);
		const options: Intl.DateTimeFormatOptions = {
			day: 'numeric',
			month: 'short'
		};
		return `${start.toLocaleDateString('fr-FR', options)} - ${end.toLocaleDateString('fr-FR', options)}`;
	});
</script>

<a href="/dashboard/student/minesweeper/tournaments/{tournament.id}" class="block">
	<Card
		class={cn(
			'relative cursor-pointer overflow-hidden p-4 transition-all hover:scale-[1.02] hover:shadow-md',
			tournament.has_in_progress_game && 'ring-2 ring-primary'
		)}
	>
		<!-- Header: Name and Difficulty -->
		<div class="mb-3 flex items-start justify-between gap-2">
			<div class="min-w-0 flex-1">
				<h3 class="truncate text-lg font-semibold text-foreground">{tournament.name}</h3>
				{#if tournament.description}
					<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{tournament.description}</p>
				{/if}
			</div>
			<Badge class={cn('shrink-0', difficultyColor)}>
				{difficultyLabel}
			</Badge>
		</div>

		<!-- Tournament info -->
		<div class={cn('space-y-2 text-sm', isStarted && 'mb-4')}>
			<!-- Date range -->
			<div class="flex items-center gap-2 text-muted-foreground">
				<span aria-hidden="true">📅</span>
				<span>{dateRange}</span>
			</div>

			<!-- Time remaining / Time until start -->
			<div class="flex items-center gap-2">
				<span aria-hidden="true">⏳</span>
				{#if !isStarted}
					<span>Debut dans : <strong>{timeUntilStart}</strong></span>
				{:else if tournament.time_remaining_seconds > 0}
					<span
						class={cn(tournament.time_remaining_seconds < 3600 && 'font-semibold text-orange-600')}
					>
						Temps restant : {timeRemaining}
					</span>
				{:else}
					<span class="text-muted-foreground">Tournoi termine</span>
				{/if}
			</div>

			<!-- Top X games info -->
			<div class="flex items-center gap-2 text-muted-foreground">
				<span aria-hidden="true">🏆</span>
				<span>Moyenne des {tournament.top_x_games} meilleures parties</span>
			</div>
		</div>

		<!-- Player stats (only show if tournament has started) -->
		{#if isStarted}
			<div class="rounded-lg bg-muted/50 p-3">
				<h4 class="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
					Mes statistiques
				</h4>
				<div class="grid grid-cols-3 gap-2 text-center">
					<div>
						<p class="text-lg font-bold text-foreground">{tournament.my_games_count}</p>
						<p class="text-xs text-muted-foreground">Parties</p>
					</div>
					<div>
						<p class="text-lg font-bold text-green-600 dark:text-green-400">
							{tournament.my_wins_count}
						</p>
						<p class="text-xs text-muted-foreground">Victoires</p>
					</div>
					<div>
						<p class="text-lg font-bold text-foreground">
							{tournament.my_average_score !== null ? `${tournament.my_average_score} pts` : '-'}
						</p>
						<p class="text-xs text-muted-foreground">Score moyen</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- In-progress indicator -->
		{#if tournament.has_in_progress_game}
			<div class="absolute top-2 right-2">
				<span class="relative flex h-3 w-3">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
					></span>
					<span class="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
				</span>
			</div>
		{/if}
	</Card>
</a>
