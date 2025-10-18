<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	let { data } = $props();

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString('fr-FR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getRoleBadgeClass(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
			case 'teacher':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'student':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}
</script>

<div class="space-y-6">
	<!-- Data Counts Overview -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Database Overview</Card.Title>
			<Card.Description>Total counts across all tables</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-2 gap-6 md:grid-cols-4">
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Total Users</p>
					<p class="text-3xl font-bold">{data.counts.totalUsers}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Students</p>
					<p class="text-3xl font-bold text-green-600 dark:text-green-400">
						{data.counts.students}
					</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Teachers</p>
					<p class="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.counts.teachers}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Admins</p>
					<p class="text-3xl font-bold text-red-600 dark:text-red-400">{data.counts.admins}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Classes</p>
					<p class="text-2xl font-bold">{data.counts.classes}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Schools</p>
					<p class="text-2xl font-bold">{data.counts.schools}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Friendships</p>
					<p class="text-2xl font-bold">{data.counts.friendships}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Pending Requests</p>
					<p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
						{data.counts.pendingFriendships}
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Pending Students Status -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Pending Students</Card.Title>
			<Card.Description>Pre-imported students awaiting first login</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid grid-cols-3 gap-4">
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Total Pending</p>
					<p class="text-2xl font-bold">{data.pendingStudents.total}</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Activated</p>
					<p class="text-2xl font-bold text-green-600 dark:text-green-400">
						{data.pendingStudents.activated}
					</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Awaiting Login</p>
					<p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
						{data.pendingStudents.total - data.pendingStudents.activated}
					</p>
				</div>
			</div>

			{#if data.pendingStudents.notActivated.length > 0}
				<Separator />
				<div>
					<h3 class="mb-2 text-sm font-semibold">Students Not Yet Activated (Top 10)</h3>
					<div class="space-y-2">
						{#each data.pendingStudents.notActivated as student (student.email)}
							<div
								class="flex items-center justify-between rounded border border-border bg-muted/50 p-2 text-sm"
							>
								<div class="flex-1">
									<p class="font-medium">
										{student.firstname}
										{student.lastname}
									</p>
									<p class="text-xs text-muted-foreground">{student.email}</p>
								</div>
								<p class="text-xs text-muted-foreground">
									Added {formatDate(student.created_at)}
								</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Data Integrity Issues -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Data Integrity Checks</Card.Title>
			<Card.Description>Profiles with missing or invalid data</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<!-- Missing Names -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-sm font-semibold">Missing First/Last Name</h3>
					<Badge variant="outline">{data.integrity.missingNames.length} found</Badge>
				</div>
				{#if data.integrity.missingNames.length > 0}
					<div class="space-y-2">
						{#each data.integrity.missingNames as profile (profile.email)}
							<div
								class="flex items-center justify-between rounded border border-yellow-200 bg-yellow-50 p-2 text-sm dark:border-yellow-800 dark:bg-yellow-900/20"
							>
								<div>
									<p class="font-medium">{profile.email}</p>
									<p class="text-xs text-muted-foreground">
										First: {profile.firstname || '(missing)'} | Last: {profile.lastname ||
											'(missing)'}
									</p>
								</div>
								<Badge class={getRoleBadgeClass(profile.role)}>{profile.role}</Badge>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">✅ All profiles have names</p>
				{/if}
			</div>

			<Separator />

			<!-- Missing School -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-sm font-semibold">Missing School Assignment</h3>
					<Badge variant="outline">{data.integrity.missingSchool.length} found</Badge>
				</div>
				{#if data.integrity.missingSchool.length > 0}
					<div class="space-y-2">
						{#each data.integrity.missingSchool as profile (profile.email)}
							<div
								class="flex items-center justify-between rounded border border-yellow-200 bg-yellow-50 p-2 text-sm dark:border-yellow-800 dark:bg-yellow-900/20"
							>
								<p class="font-medium">{profile.email}</p>
								<Badge class={getRoleBadgeClass(profile.role)}>{profile.role}</Badge>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">✅ All profiles have school assignments</p>
				{/if}
			</div>

			<Separator />

			<!-- Students Without Classes -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-sm font-semibold">Students Without Classes</h3>
					<Badge variant="outline">{data.integrity.noClasses.length} found</Badge>
				</div>
				{#if data.integrity.noClasses.length > 0}
					<div class="space-y-2">
						{#each data.integrity.noClasses as profile (profile.email)}
							<div
								class="flex items-center justify-between rounded border border-yellow-200 bg-yellow-50 p-2 text-sm dark:border-yellow-800 dark:bg-yellow-900/20"
							>
								<p class="font-medium">{profile.email}</p>
								<Badge class={getRoleBadgeClass(profile.role)}>{profile.role}</Badge>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">✅ All students have class assignments</p>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Recent Signups -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Recent Signups</Card.Title>
			<Card.Description>Last 10 users to create accounts</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.recentSignups.length > 0}
				<div class="space-y-2">
					{#each data.recentSignups as signup (signup.email)}
						<div
							class="flex items-center justify-between rounded border border-border bg-muted/50 p-3 text-sm"
						>
							<div class="flex-1">
								<p class="font-medium">
									{signup.firstname || '(no name)'}
									{signup.lastname || ''}
								</p>
								<p class="text-xs text-muted-foreground">{signup.email}</p>
							</div>
							<div class="flex items-center gap-2">
								<Badge class={getRoleBadgeClass(signup.role)}>{signup.role}</Badge>
								<p class="text-xs text-muted-foreground">{formatDate(signup.created_at)}</p>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No recent signups</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Privacy Notice -->
	<div
		class="rounded-lg border border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground"
	>
		🔒 Email addresses are redacted for privacy (showing first 3 characters only)
	</div>
</div>
