<script lang="ts">
	import GroupedRouteLayout from '$lib/components/navigation/GroupedRouteLayout.svelte';
	import { Layers, BookOpen, Lightbulb, FileSpreadsheet } from 'lucide-svelte';

	let { children } = $props();

	const tabs = [
		{
			href: '/dashboard/teacher/contenu/templates',
			label: 'Templates',
			icon: Layers
		},
		{
			href: '/dashboard/teacher/contenu/exercices',
			label: 'Exercices',
			icon: BookOpen
		},
		{
			href: '/dashboard/teacher/contenu/enigmes',
			label: 'Enigmes',
			icon: Lightbulb
		},
		{
			href: '/dashboard/teacher/contenu/worksheets',
			label: 'Worksheets',
			icon: FileSpreadsheet
		}
	];
</script>

<GroupedRouteLayout
	title="Contenu pedagogique"
	description="Gerez vos templates, exercices, enigmes et fiches de travail"
	{tabs}
>
	{@render children()}
</GroupedRouteLayout>
