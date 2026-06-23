<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Plus, BookOpen, FileCode2 } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Exercices Python – Chiphre</title>
	<meta
		name="description"
		content="Crée des exercices Python avec validation automatique et partage-les via un simple lien."
	/>
</svelte:head>

<div class="container mx-auto max-w-3xl p-4 py-8">
	<header class="mb-6">
		<h1 class="mb-2 text-3xl font-bold">Exercices Python</h1>
		<p class="text-muted-foreground">
			Crée un exercice Python avec une validation automatique (comparaison de sortie, test de
			fonction, ou analyse syntaxique) et partage-le via un simple lien. Les élèves écrivent leur
			code dans le navigateur — tout tourne en local, pas besoin d'installer Python.
		</p>
	</header>

	<section class="mb-8 grid gap-3 sm:grid-cols-3">
		<div class="rounded-lg border border-border bg-card p-4">
			<FileCode2 class="mb-2 h-6 w-6 text-primary" />
			<h2 class="mb-1 font-medium">Comparaison de sortie</h2>
			<p class="text-sm text-muted-foreground">
				Le code de l'élève doit produire un texte attendu sur stdout.
			</p>
		</div>
		<div class="rounded-lg border border-border bg-card p-4">
			<FileCode2 class="mb-2 h-6 w-6 text-primary" />
			<h2 class="mb-1 font-medium">Test de fonction</h2>
			<p class="text-sm text-muted-foreground">
				Tu fournis des cas de test ; la fonction de l'élève doit retourner les bonnes valeurs.
			</p>
		</div>
		<div class="rounded-lg border border-border bg-card p-4">
			<BookOpen class="mb-2 h-6 w-6 text-primary" />
			<h2 class="mb-1 font-medium">Analyse syntaxique</h2>
			<p class="text-sm text-muted-foreground">
				Vérifie la structure du code (boucle, fonction, récursion…) sans l'exécuter.
			</p>
		</div>
	</section>

	{#if data.isTeacher}
		<div class="flex flex-wrap gap-2">
			<Button href="/python-exercises/new">
				<Plus class="mr-1 h-4 w-4" /> Créer un exercice
			</Button>
			<Button variant="outline" href="/python-exercises/mine">
				<BookOpen class="mr-1 h-4 w-4" /> Mes exercices
			</Button>
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">
			La création d'exercices est réservée aux enseignants.
		</p>
	{/if}
</div>
