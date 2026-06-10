<!--
	CapacityFsrsBadge — badge FSRS agrégé d'une capacité famille A.

	Affiche le statut dynamique calculé à partir des états FSRS des templates
	tagués sur la capacité. Coexiste avec le verdict BO `is_acquired` formel
	dans la même UI.

	Cf. docs/ref/srs/architecture.md §5.1.
-->
<script lang="ts">
	import { AlertCircle, RefreshCw, Clock, CheckCircle, Circle } from 'lucide-svelte';
	import type { CapacityBadge } from '$lib/server/srs/capacity-badge';

	interface Props {
		badge: CapacityBadge;
		size?: 'sm' | 'md';
		showLabel?: boolean;
	}

	const { badge, size = 'sm', showLabel = false }: Props = $props();

	const config = $derived(
		{
			a_remedier: {
				icon: AlertCircle,
				label: 'À remédier',
				colorClass: 'text-red-600 dark:text-red-400',
				bgClass: 'bg-red-50 dark:bg-red-950/30'
			},
			a_renforcer: {
				icon: RefreshCw,
				label: 'À renforcer',
				colorClass: 'text-amber-600 dark:text-amber-400',
				bgClass: 'bg-amber-50 dark:bg-amber-950/30'
			},
			acquise_en_memoire: {
				icon: CheckCircle,
				label: 'Acquise',
				colorClass: 'text-emerald-600 dark:text-emerald-400',
				bgClass: 'bg-emerald-50 dark:bg-emerald-950/30'
			},
			en_apprentissage: {
				icon: Clock,
				label: 'En apprentissage',
				colorClass: 'text-blue-600 dark:text-blue-400',
				bgClass: 'bg-blue-50 dark:bg-blue-950/30'
			},
			non_commencee: {
				icon: Circle,
				label: 'Non commencée',
				colorClass: 'text-muted-foreground',
				bgClass: 'bg-muted/30'
			}
		}[badge]
	);

	const iconSize = $derived(size === 'sm' ? 14 : 18);
</script>

{#if badge !== 'non_commencee'}
	<span
		class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {config.bgClass} {config.colorClass}"
		title={config.label}
		aria-label={config.label}
	>
		<config.icon size={iconSize} aria-hidden="true" />
		{#if showLabel}
			<span>{config.label}</span>
		{/if}
	</span>
{/if}
