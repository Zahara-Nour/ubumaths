<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import StoredFigureForm from '$lib/components/geometry/StoredFigureForm.svelte';

	const LIST_HREF = '/dashboard/teacher/figures';
	const STARTER_SCRIPT =
		'A = point(0, 0)\nB = point(4, 0)\nC = point(1, 3)\np = polygone(A, B, C)\n';
</script>

<svelte:head>
	<title>Nouvelle figure | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6">
		<BackLink href={LIST_HREF} label="Retour aux figures" />
		<h1 class="text-3xl font-bold tracking-tight">Nouvelle figure</h1>
	</div>

	<StoredFigureForm
		initial={{
			title: '',
			description: null,
			dsl_script: STARTER_SCRIPT,
			grades: [],
			is_public: false,
			tags: []
		}}
		listHref={LIST_HREF}
	/>
</div>
