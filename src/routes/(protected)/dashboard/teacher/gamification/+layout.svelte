<script lang="ts">
	import GroupedRouteLayout from '$lib/components/navigation/GroupedRouteLayout.svelte';
	import { Gift, Sparkles, ShoppingBag } from 'lucide-svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const tabs = [
		{
			href: '/dashboard/teacher/gamification/rewards',
			label: 'Rewards',
			icon: Gift,
			badge: data.pendingVipRequestsCount > 0 ? data.pendingVipRequestsCount : undefined
		},
		{
			href: '/dashboard/teacher/gamification/vip-cards',
			label: 'VIP Cards',
			icon: Sparkles
		},
		{
			href: '/dashboard/teacher/gamification/marketplace',
			label: 'Marche',
			icon: ShoppingBag
		}
	];
</script>

<GroupedRouteLayout
	title="Gamification"
	description="Gerez les recompenses, cartes VIP et le marche pour vos eleves"
	{tabs}
>
	{@render children()}
</GroupedRouteLayout>
