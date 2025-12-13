<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { ErrorReportStatus } from '$lib/types/worksheets';

	interface Props {
		status: ErrorReportStatus;
		onclick?: () => void;
	}

	let { status, onclick }: Props = $props();

	// Status-specific styling and labels
	const STATUS_CONFIG = {
		pending: {
			label: 'En attente',
			variant: 'outline' as const,
			class: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
		},
		fixed: {
			label: 'Corrigé',
			variant: 'outline' as const,
			class: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
		},
		rejected: {
			label: 'Rejeté',
			variant: 'outline' as const,
			class: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
		}
	} as const;

	let config = $derived(STATUS_CONFIG[status]);
	let isClickable = $derived(!!onclick);
</script>

<Badge
	variant={config.variant}
	class="{config.class} {isClickable ? 'cursor-pointer hover:opacity-80' : ''}"
	{onclick}
>
	{config.label}
</Badge>
