<!--
	Tuteur Page
	===========

	Dedicated page for free-form tutoring with Père Ubu.
	Students can ask math questions without exercise context.

	FEATURES:
	- Full-screen tutor chat interface
	- Informational header
	- Grade-level adapted responses
	- No exercise context (general help)

	SECURITY:
	- Protected route (requires authentication)
	- Rate limiting via TutorChat component
	- Cheat detection via tutor API

	@route (protected)/tuteur
-->

<script lang="ts">
	import TutorChat from '$lib/components/tutor/TutorChat.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { studentGrade } = data;
</script>

<svelte:head>
	<title>Père Ubu - Tuteur | UbuMaths</title>
	<meta
		name="description"
		content="Pose tes questions de mathématiques au Père Ubu. Ton tuteur personnel t'aidera à comprendre sans te donner les réponses."
	/>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<Card class="mx-auto max-w-4xl">
		<CardHeader class="space-y-2">
			<CardTitle
				class="flex items-center gap-2"
				style="font-size: calc(1.5rem * var(--font-scale)); line-height: calc(2rem * var(--font-scale));"
			>
				<span class="text-3xl">🎓</span>
				<span>Père Ubu - Tuteur Pédagogique</span>
			</CardTitle>
			<div
				class="space-y-2 text-muted-foreground"
				style="font-size: calc(0.875rem * var(--font-scale)); line-height: calc(1.25rem * var(--font-scale));"
			>
				<p>
					Pose tes questions de mathématiques au Père Ubu. Il t'aidera à <strong
						>comprendre les concepts</strong
					> sans te donner directement la réponse !
				</p>
				<div
					class="rounded-md border border-border bg-muted/50 p-3"
					style="font-size: calc(0.8125rem * var(--font-scale)); line-height: calc(1.125rem * var(--font-scale));"
				>
					<p class="font-medium text-foreground">Comment ça marche ?</p>
					<ul class="mt-1 list-inside list-disc space-y-1">
						<li>Pose une question claire et précise</li>
						<li>Le Père Ubu te guidera avec des indices progressifs</li>
						<li>Si tu essaies de tricher, il le saura !</li>
						<li>Plus tu réfléchis, plus tu apprends 🧠</li>
					</ul>
				</div>
			</div>
		</CardHeader>
		<CardContent class="p-0">
			<div class="h-[calc(100vh-350px)] min-h-[500px]">
				<TutorChat exerciseContext={{ statement: '', studentGrade }} />
			</div>
		</CardContent>
	</Card>
</div>

<style>
	/* Ensure consistent spacing */
	:global(.container) {
		max-width: 100%;
	}

	@media (min-width: 1280px) {
		:global(.container) {
			max-width: 1280px;
		}
	}
</style>
