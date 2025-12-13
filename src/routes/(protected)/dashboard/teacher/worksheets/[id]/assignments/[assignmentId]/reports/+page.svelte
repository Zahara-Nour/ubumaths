<!--
	Teacher Error Reports Page
	==========================

	Dedicated page for viewing and managing error reports for a specific assignment.
	Accessible via notification links when students report errors.

	Uses the existing ErrorReportsPanel component which handles:
	- Filtering by status (pending/fixed/rejected)
	- Pagination
	- Review dialog with approve/reject actions
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import ErrorReportsPanel from '$lib/components/worksheets/teacher/ErrorReportsPanel.svelte';
	import { ArrowLeft } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Derive display values
	let assignmentTitle = $derived(data.assignment.title || data.worksheet.title || 'Devoir');

	// Format class names
	let classNames = $derived.by(() => {
		const classes = data.assignment.classes || [];
		if (classes.length === 0) return '';
		return classes.map((c: { name: string }) => c.name).join(', ');
	});
</script>

<svelte:head>
	<title>Signalements - {assignmentTitle} - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-5xl py-6">
	<!-- Header -->
	<div class="mb-6 flex items-start gap-4">
		<Button
			variant="ghost"
			size="icon"
			href="/dashboard/teacher/worksheets/{data.worksheetId}"
			class="mt-1"
		>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold">Signalements</h1>
			<p class="mt-1 text-muted-foreground">
				{assignmentTitle}
				{#if classNames}
					<span class="mx-2">-</span>
					{classNames}
				{/if}
			</p>
		</div>
	</div>

	<!-- Error Reports Panel (reused component) -->
	<ErrorReportsPanel worksheetId={data.worksheetId} assignmentId={data.assignmentId} />
</div>
