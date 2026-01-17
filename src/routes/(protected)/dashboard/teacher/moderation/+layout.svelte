<script lang="ts">
	import GroupedRouteLayout from '$lib/components/navigation/GroupedRouteLayout.svelte';
	import { AlertTriangle, ShieldAlert } from 'lucide-svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const tabs = [
		{
			href: '/dashboard/teacher/moderation/avertissements',
			label: 'Avertissements',
			icon: AlertTriangle
		},
		{
			href: '/dashboard/teacher/moderation/gestion',
			label: 'Gestion',
			icon: ShieldAlert,
			badge: data.pendingReportsCount > 0 ? data.pendingReportsCount : undefined
		}
	];
</script>

<GroupedRouteLayout
	title="Moderation"
	description="Gerez les avertissements eleves et les signalements de messages"
	{tabs}
>
	{@render children()}
</GroupedRouteLayout>
