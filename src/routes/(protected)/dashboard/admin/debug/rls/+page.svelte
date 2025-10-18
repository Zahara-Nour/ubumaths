<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { CheckCircle2, XCircle, AlertCircle } from 'lucide-svelte';

	let { data } = $props();

	function getStatusIcon(success: boolean) {
		return success ? CheckCircle2 : XCircle;
	}

	function getStatusColor(success: boolean): string {
		return success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
	}

	function getStatusBadge(success: boolean): string {
		return success
			? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
			: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
	}

	// Group tests by table
	const testsByTable = $derived(() => {
		const grouped: Record<string, typeof data.tests> = {};
		for (const test of data.tests) {
			if (!grouped[test.table]) {
				grouped[test.table] = [];
			}
			grouped[test.table].push(test);
		}
		return grouped;
	});
</script>

<div class="space-y-6">
	<!-- Summary Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Test Summary</Card.Title>
			<Card.Description>Overview of RLS policy tests</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-2 gap-6 md:grid-cols-4">
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Total Tests</p>
					<p class="text-3xl font-bold">{data.summary.total}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Passed</p>
					<p class="text-3xl font-bold text-green-600 dark:text-green-400">
						{data.summary.passed}
					</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Failed</p>
					<p class="text-3xl font-bold text-red-600 dark:text-red-400">
						{data.summary.failed}
					</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Pass Rate</p>
					<p class="text-3xl font-bold">{data.summary.passRate}%</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Important Note -->
	<div
		class="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
	>
		<AlertCircle class="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
		<div class="flex-1">
			<p class="text-sm font-medium text-blue-900 dark:text-blue-100">Note</p>
			<p class="mt-1 text-sm text-blue-800 dark:text-blue-200">
				{data.note}
			</p>
		</div>
	</div>

	<!-- Tests by Table -->
	{#each Object.entries(testsByTable()) as [table, tests] (table)}
		{@const passed = tests.filter((t) => t.success).length}
		{@const total = tests.length}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title class="font-mono">{table}</Card.Title>
					<div class="flex items-center gap-2">
						<Badge variant="outline">
							{passed}/{total} passed
						</Badge>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					{#each tests as test (`${test.table}-${test.operation}-${test.role}`)}
						{@const StatusIcon = getStatusIcon(test.success)}
						<div
							class="flex items-start justify-between rounded-lg border p-3 {test.success
								? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
								: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'}"
						>
							<div class="flex flex-1 items-start gap-3">
								<StatusIcon class="h-5 w-5 {getStatusColor(test.success)} mt-0.5" />
								<div class="flex-1">
									<div class="mb-1 flex items-center gap-2">
										<span class="font-mono text-sm font-medium">{test.operation}</span>
										<Badge variant="outline" class="text-xs">{test.role}</Badge>
									</div>
									{#if test.error}
										<p class="mt-1 font-mono text-xs text-red-700 dark:text-red-300">
											Error: {test.error}
										</p>
									{/if}
									{#if test.rowCount !== undefined}
										<p class="mt-1 text-xs text-muted-foreground">
											Row count: {test.rowCount}
										</p>
									{/if}
								</div>
							</div>
							<Badge class={getStatusBadge(test.success)}>
								{test.success ? 'PASS' : 'FAIL'}
							</Badge>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/each}

	<!-- RLS Policy Reference -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Expected RLS Behavior</Card.Title>
			<Card.Description>What each role should be able to access</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<!-- Admin -->
				<div>
					<h3 class="mb-2 text-sm font-semibold">Admin</h3>
					<ul class="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
						<li>Full access to all tables (SELECT/INSERT/UPDATE/DELETE)</li>
						<li>Can view and modify all profiles</li>
						<li>Can manage schools, classes, and pending students</li>
						<li>Can view and moderate all friendships</li>
					</ul>
				</div>

				<Separator />

				<!-- Teacher -->
				<div>
					<h3 class="mb-2 text-sm font-semibold">Teacher</h3>
					<ul class="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
						<li>Can view and update own profile</li>
						<li>Can view all schools (read-only)</li>
						<li>Can create and manage own classes</li>
						<li>Can view students in their classes</li>
						<li>Can view and moderate student friendships</li>
					</ul>
				</div>

				<Separator />

				<!-- Student -->
				<div>
					<h3 class="mb-2 text-sm font-semibold">Student</h3>
					<ul class="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
						<li>Can view and update own profile (limited fields)</li>
						<li>Can view schools (read-only)</li>
						<li>Can view classes they belong to</li>
						<li>Can manage own friendships (create, accept, delete)</li>
						<li>Can view friendships they are part of</li>
					</ul>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Testing Instructions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Testing Other Roles</Card.Title>
			<Card.Description>How to test student and teacher RLS policies</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3 text-sm">
				<p>To test student or teacher policies, you need to authenticate as those roles:</p>
				<ol class="ml-2 list-inside list-decimal space-y-2 text-muted-foreground">
					<li>Create test accounts for student and teacher roles</li>
					<li>Log in as the test user</li>
					<li>Try accessing different pages and performing operations</li>
					<li>Check browser console for any RLS policy violations</li>
					<li>Verify that users can only access data they should have access to</li>
				</ol>
				<div class="mt-4 rounded border border-border bg-muted/50 p-3">
					<p class="font-mono text-xs">
						Example: A student should NOT be able to view profiles of students in other classes
						they're not a member of.
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
