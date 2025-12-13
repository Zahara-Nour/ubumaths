<script lang="ts">
	import StudentReportsPanel from '$lib/components/worksheets/student/StudentReportsPanel.svelte';
</script>

<svelte:head>
	<title>Mes Signalements - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-5xl py-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Mes Signalements</h1>
		<p class="mt-1 text-muted-foreground">
			Consultez l'historique de vos signalements d'erreurs et leur statut.
		</p>
	</div>

	<StudentReportsPanel />
</div>
