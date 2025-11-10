<!--
	Teacher Moderation Page
	=======================

	Allows teachers to manage user restrictions and view moderation history.

	Features:
		- Tab navigation: Restrictions | Logs
		- Active restrictions table with ability to remove
		- Moderation logs table with pagination
		- Automatic data refresh after actions
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as Tabs from '$lib/components/ui/tabs';
	import ActiveRestrictionsTable from '$lib/components/moderation/ActiveRestrictionsTable.svelte';
	import ModerationLogsTable from '$lib/components/moderation/ModerationLogsTable.svelte';
	import { ShieldAlert } from 'lucide-svelte';
	import type { PageData } from './$types';

	// Page Props
	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/**
	 * Handle successful unrestrict action
	 */
	async function handleUnrestrict(): Promise<void> {
		// Refresh data from server
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Modération - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl space-y-6 p-6">
	<!-- Page Header -->
	<div class="space-y-2">
		<div class="flex items-center gap-3">
			<ShieldAlert class="h-8 w-8 text-primary" />
			<h1 class="text-3xl font-bold tracking-tight">Modération</h1>
		</div>
		<p class="text-muted-foreground">
			Gérez les restrictions des utilisateurs et consultez l'historique des actions de modération.
		</p>
	</div>

	<!-- Tabs -->
	<Tabs.Root value="restrictions" class="w-full">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="restrictions">Restrictions actives</Tabs.Trigger>
			<Tabs.Trigger value="logs">Historique</Tabs.Trigger>
		</Tabs.List>

		<!-- Restrictions Tab -->
		<Tabs.Content value="restrictions" class="space-y-4 pt-6">
			<div>
				<h2 class="mb-2 text-xl font-semibold">Restrictions actives</h2>
				<p class="text-sm text-muted-foreground">
					Liste des restrictions que vous avez appliquées aux utilisateurs.
				</p>
			</div>
			<ActiveRestrictionsTable restrictions={data.restrictions} onUnrestrict={handleUnrestrict} />
		</Tabs.Content>

		<!-- Logs Tab -->
		<Tabs.Content value="logs" class="space-y-4 pt-6">
			<div>
				<h2 class="mb-2 text-xl font-semibold">Historique de modération</h2>
				<p class="text-sm text-muted-foreground">
					Toutes les actions de modération que vous avez effectuées.
				</p>
			</div>
			<ModerationLogsTable logs={data.logs} />
		</Tabs.Content>
	</Tabs.Root>
</div>
