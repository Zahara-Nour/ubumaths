<!--
	Séance de révision d'un chapitre
	================================

	Paquet CALCULÉ du chapitre (questions de cours, étape 3) : dues + au plus
	10 nouvelles. Même écran de séance que les paquets (`ReviewSession`), avec
	la source « chapitre ».
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ReviewSession from '$lib/components/srs/ReviewSession.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function handleBack() {
		goto(
			resolve('/(protected)/dashboard/student/cours/[chapterId]', { chapterId: data.chapter.id })
		).then(() => {});
	}
</script>

<svelte:head>
	<title>Réviser {data.chapter.title} - Chiphre</title>
</svelte:head>

<div class="mx-auto max-w-6xl p-4">
	<div class="mb-6 flex flex-wrap items-center gap-3">
		<Button onclick={handleBack} variant="ghost">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour au chapitre
		</Button>
		<h1 class="text-xl font-semibold">Réviser : {data.chapter.title}</h1>
	</div>

	{#key data.chapter.id}
		<ReviewSession
			source={{ kind: 'chapter', chapterId: data.chapter.id }}
			emptyTitle="Rien à revoir aujourd'hui"
			backLabel="Retour au chapitre"
			onBack={handleBack}
		/>
	{/key}
</div>
