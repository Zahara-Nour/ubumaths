<script lang="ts">
	import { cn } from '$lib/utils';
	import type { BugReportStatus } from '$lib/types/bug-reports';
	import { BUG_REPORT_STATUS_LABELS, BUG_REPORT_STATUS_COLORS } from '$lib/types/bug-reports';

	interface Props {
		status: BugReportStatus;
		class?: string;
	}

	let { status, class: className }: Props = $props();

	const label = $derived(BUG_REPORT_STATUS_LABELS[status]);
	const colorClasses = $derived(BUG_REPORT_STATUS_COLORS[status]);

	const icons: Record<BugReportStatus, string> = {
		pending: '⏳',
		acknowledged: '👁️',
		in_progress: '🔧',
		resolved: '✅',
		wont_fix: '❌',
		duplicate: '🔄'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
		colorClasses,
		className
	)}
>
	<span>{icons[status]}</span>
	<span>{label}</span>
</span>
