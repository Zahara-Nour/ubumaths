<script lang="ts">
	/**
	 * La Chatterie de Faustroll — les Mathoux de l'élève, rangés par race.
	 *
	 * Page de la navigation élève : pas de bouton retour (règle 7). Mots du lore
	 * uniquement (chaton, matou, sieste…), jamais XP, niveau ni score
	 * (Compendium § IX).
	 *
	 * Spec : docs/wip/mathoux-conception.md § 9 · doc : docs/systeme/mathoux.md
	 */

	import { Cat } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import MathouAvatar from '$lib/components/mathoux/MathouAvatar.svelte';
	import {
		collectionCountsPhrase,
		starGradeLabel,
		type Mathou,
		type MathouGrowth
	} from '$lib/mathoux/collection-logic';
	import type { PageData } from './$types';

	// La révision espacée du programme : c'est elle qui fait tomber les cartes dues.
	const REVISION_HREF = '/dashboard/revisions/decks/programme';

	const GROWTH_LABEL: Record<MathouGrowth, string> = {
		a_decouvrir: 'À découvrir',
		chaton: 'Chaton',
		matou: 'Matou',
		grand_matou: 'Grand matou'
	};

	let { data }: { data: PageData } = $props();

	const collection = $derived(data.collection);
	const isEmpty = $derived(collection.races.length === 0);

	/** Texte du dessin : le stade, sans répéter le nom affiché à côté. */
	function avatarLabel(mathou: Mathou): string {
		if (mathou.growth === 'a_decouvrir') return 'Silhouette d’un Mathou à découvrir';
		const stage = GROWTH_LABEL[mathou.growth].toLowerCase();
		return mathou.asleep ? `Dessin d’un ${stage} endormi` : `Dessin d’un ${stage}`;
	}
</script>

<svelte:head>
	<title>La Chatterie de Faustroll | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-6">
	<div class="mb-6 flex items-center gap-3">
		<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
			<Cat class="h-6 w-6 text-primary" aria-hidden="true" />
		</div>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">La Chatterie de Faustroll</h1>
			<p class="text-muted-foreground">
				Chaque notion que tu travailles fait naître un Mathou. Il grandit quand tu la maîtrises, et
				fait la sieste quand il est temps de la revoir.
			</p>
		</div>
	</div>

	{#if data.unavailable}
		<p class="rounded-lg border border-border bg-muted/40 p-4" role="status">
			La Chatterie est fermée pour l’instant : réessaie dans un moment.
		</p>
	{:else if isEmpty}
		<p class="rounded-lg border border-border bg-muted/40 p-4" role="status">
			Aucune notion travaillable pour ta classe pour l’instant. Les Mathoux arriveront avec les
			prochaines questions.
		</p>
	{:else}
		<p class="mb-6 font-medium">{collectionCountsPhrase(collection.counts)}</p>

		<div class="space-y-8">
			{#each collection.races as race (race.branchId)}
				<section aria-labelledby="race-{race.branchId}">
					<h2 id="race-{race.branchId}" class="mb-3 text-xl font-semibold">{race.branchName}</h2>
					<ul class="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3">
						{#each race.mathoux as mathou (mathou.notionId)}
							{@const toDiscover = mathou.growth === 'a_decouvrir'}
							<li
								class="flex items-center gap-3 rounded-lg border border-border bg-card p-3 {toDiscover
									? 'opacity-75'
									: ''}"
							>
								<div class="shrink-0">
									<MathouAvatar
										raceIndex={mathou.raceIndex}
										stage={mathou.growth === 'a_decouvrir' ? 'chaton' : mathou.growth}
										asleep={mathou.asleep}
										silhouette={toDiscover}
										size={64}
										label={avatarLabel(mathou)}
									/>
								</div>
								<div class="min-w-0 flex-1">
									{#if toDiscover}
										<p class="font-medium break-words">{mathou.notionName}</p>
									{:else}
										<p class="font-medium break-words">{mathou.name}</p>
									{/if}
									<p class="text-sm text-muted-foreground">{GROWTH_LABEL[mathou.growth]}</p>
									{#if mathou.stars.length > 0}
										<!-- Une étoile par classe où la notion a été entièrement acquise (mémoire) -->
										<ul class="flex flex-wrap gap-x-2 text-sm" aria-label="Étoiles">
											{#each mathou.stars as grade (grade)}
												<li class="whitespace-nowrap">
													<span aria-hidden="true" class="text-amber-500">★</span>
													{starGradeLabel(grade)}
												</li>
											{/each}
										</ul>
									{/if}
									{#if mathou.asleep}
										<p class="text-sm">Fait la sieste</p>
										<Button
											href={REVISION_HREF}
											size="sm"
											variant="outline"
											class="mt-1"
											aria-label="Réveiller {mathou.name}"
										>
											Réveiller
										</Button>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>
