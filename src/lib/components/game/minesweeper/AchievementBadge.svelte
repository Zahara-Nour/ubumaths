<script lang="ts">
	import { cn } from '$lib/utils';
	import { Badge } from '$lib/components/ui/badge';

	type Size = 'small' | 'medium' | 'large';

	interface Props {
		achievement_id: string;
		name: string;
		description: string;
		icon: string;
		difficulty?: string | null;
		is_unlocked: boolean;
		unlocked_at?: string | null;
		size?: Size;
	}

	let {
		achievement_id: _achievement_id,
		name,
		description,
		icon,
		difficulty = null,
		is_unlocked,
		unlocked_at = null,
		size = 'medium'
	}: Props = $props();

	/**
	 * Format date in French locale
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	/**
	 * Translate difficulty to French
	 */
	function translateDifficulty(diff: string): string {
		switch (diff) {
			case 'beginner':
				return 'Débutant';
			case 'intermediate':
				return 'Intermédiaire';
			case 'expert':
				return 'Expert';
			default:
				return diff;
		}
	}

	// Size-specific classes
	const sizeClasses = {
		small: {
			container: 'p-3',
			icon: 'text-2xl',
			name: 'text-sm font-semibold',
			description: 'hidden',
			badge: 'text-xs'
		},
		medium: {
			container: 'p-4',
			icon: 'text-4xl',
			name: 'text-base font-bold',
			description: 'text-sm text-muted-foreground',
			badge: 'text-xs'
		},
		large: {
			container: 'p-6',
			icon: 'text-6xl',
			name: 'text-xl font-bold',
			description: 'text-base text-muted-foreground',
			badge: 'text-sm'
		}
	};

	const currentSize = sizeClasses[size];
</script>

<div
	class={cn(
		'rounded-lg border transition-all duration-200 hover:shadow-md',
		currentSize.container,
		is_unlocked
			? 'border-primary/50 bg-card hover:border-primary'
			: 'border-border bg-muted/50 opacity-60 grayscale hover:opacity-70'
	)}
	role="article"
	aria-label={`Achievement: ${name}${is_unlocked ? ' (Débloqué)' : ' (Verrouillé)'}`}
>
	<div class="flex items-start gap-3">
		<!-- Icon -->
		<div class={cn('flex-shrink-0', currentSize.icon)} aria-hidden="true">
			{#if is_unlocked}
				{icon}
			{:else}
				<span class="opacity-40">🔒</span>
			{/if}
		</div>

		<!-- Content -->
		<div class="min-w-0 flex-1">
			<!-- Name and difficulty badge -->
			<div class="flex flex-wrap items-start justify-between gap-2">
				<h3 class={cn(currentSize.name, 'leading-tight')}>{name}</h3>
				{#if difficulty}
					<Badge variant={is_unlocked ? 'default' : 'outline'} class={currentSize.badge}>
						{translateDifficulty(difficulty)}
					</Badge>
				{/if}
			</div>

			<!-- Description -->
			{#if size !== 'small'}
				<p class={cn(currentSize.description, 'mt-1 leading-snug')}>{description}</p>
			{/if}

			<!-- Status badge and unlock date -->
			<div class="mt-2 flex flex-wrap items-center gap-2">
				{#if is_unlocked}
					{#if unlocked_at}
						<Badge variant="secondary" class={currentSize.badge}>
							Débloqué le {formatDate(unlocked_at)}
						</Badge>
					{:else}
						<Badge variant="secondary" class={currentSize.badge}>Débloqué</Badge>
					{/if}
				{:else}
					<Badge variant="outline" class={currentSize.badge}>Non débloqué</Badge>
				{/if}
			</div>
		</div>
	</div>
</div>
