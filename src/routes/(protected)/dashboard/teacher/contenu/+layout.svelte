<script lang="ts">
	import GroupedRouteLayout from '$lib/components/navigation/GroupedRouteLayout.svelte';
	import { Layers, BookOpen, Lightbulb, FileSpreadsheet, NotebookPen } from 'lucide-svelte';

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
		},
		{
			href: '/dashboard/teacher/contenu/notebooks',
			label: 'Notebooks',
			icon: NotebookPen
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
