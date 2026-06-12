<script lang="ts">
	import GroupedRouteLayout from '$lib/components/navigation/GroupedRouteLayout.svelte';
	import { Gift, Sparkles, ShoppingBag, Users } from 'lucide-svelte';
	import type { LayoutData } from './$types';
	import type { Component, Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Cast Lucide icons to Component to satisfy GroupedRouteLayout's Tab.icon type
	const tabs = $derived([
		{
			href: '/dashboard/teacher/gamification/rewards',
			label: 'Rewards',
			icon: Gift as unknown as Component,
			badge: data.pendingVipRequestsCount > 0 ? data.pendingVipRequestsCount : undefined
		},
		{
			href: '/dashboard/teacher/gamification/vip-cards',
			label: 'VIP Cards',
			icon: Sparkles as unknown as Component
		},
		{
			href: '/dashboard/teacher/gamification/marketplace',
			label: 'Marche',
			icon: ShoppingBag as unknown as Component
		},
		{
			href: '/dashboard/teacher/gamification/buddies',
			label: 'Palotins',
			icon: Users as unknown as Component
		}
	]);
</script>

<GroupedRouteLayout
	title="Gamification"
	description="Gerez les recompenses, cartes VIP et le marche pour vos eleves"
	{tabs}
>
	{@render children()}
</GroupedRouteLayout>
