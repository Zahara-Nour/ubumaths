<script lang="ts">
	import { lore } from '#lib/config/lore.ts';
	import GroupedRouteLayout from '#lib/components/navigation/GroupedRouteLayout.svelte';
	import { Layers, BookOpen, Lightbulb, FileSpreadsheet, NotebookPen } from '@lucide/svelte';
	import type { Component } from 'svelte';

	let { children } = $props();

	// Cast Lucide icons to Component to satisfy GroupedRouteLayout's Tab.icon type.
	// Lucide icons have wider prop signatures than Component<{}>, so the cast is safe.
	const tabs = [
		{
			href: '/dashboard/teacher/contenu/templates',
			label: 'Modèles de chapitres',
			icon: Layers as unknown as Component
		},
		{
			href: '/dashboard/teacher/contenu/exercices',
			label: `${lore.learning.exercise}s`,
			icon: BookOpen as unknown as Component
		},
		{
			href: '/dashboard/teacher/contenu/enigmes',
			label: 'Énigmes',
			icon: Lightbulb as unknown as Component
		},
		{
			href: '/dashboard/teacher/contenu/worksheets',
			label: 'Fiches',
			icon: FileSpreadsheet as unknown as Component
		},
		{
			href: '/dashboard/teacher/contenu/notebooks',
			label: 'Carnets Python',
			icon: NotebookPen as unknown as Component
		}
	];
</script>

<GroupedRouteLayout
	title="Contenu pédagogique"
	description="Gérez vos modèles de chapitres, {lore.learning.exercise}s, énigmes et fiches"
	{tabs}
>
	{@render children()}
</GroupedRouteLayout>
