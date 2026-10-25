<!--
	MathouNewsCard
	==============
	Fin de séance : ce qui est nouveau à la Chatterie (naissance, croissance,
	étoile), sous la carte du Palotin. Partagé par l'Entraînement / la Course aux
	nombres (`TestResults`) et la séance de révision (`ReviewSession`).

	Props :
	- news : `fetchMathouNews()` ; `null` ou rien de nouveau → rien n'est affiché.
	  Premier passage avec plusieurs Mathoux : une seule phrase, pas de liste.
	  Gidouilles versées pour les étapes : une ligne sous les nouveautés, ou seule
	  (rattrapage, sans nouveauté détaillée).
-->

<script lang="ts">
	import { resolve } from '$app/paths';
	import MathouAvatar from './MathouAvatar.svelte';
	import {
		firstVisitPhrase,
		gidouillesPhrase,
		hasNews,
		isFirstVisitGroup,
		moreNewsPhrase,
		newsGidouilles,
		newsItemPhrase,
		type MathouNews,
		type MathouNewsKind
	} from '$lib/mathoux/news';
	import type { MathouReaction } from './mathou-races';

	// Types
	interface Props {
		news: MathouNews | null;
	}

	// Constantes
	/** Naissance : il apparaît dans la fête ; croissance : il se transforme en bondissant ; étoile : un bond */
	const REACTION: Record<MathouNewsKind, MathouReaction> = {
		birth: 'apparition',
		growth: 'bond',
		wake: 'reveil',
		star: 'bond'
	};

	let { news }: Props = $props();

	const remaining = $derived(news ? news.total - news.items.length : 0);
	const hasItems = $derived(news !== null && news.total > 0 && news.items.length > 0);
	const gidouilles = $derived(news ? newsGidouilles(news) : 0);
</script>

{#if news && hasNews(news)}
	<section
		class="space-y-2 rounded-lg border bg-muted/40 p-3"
		aria-label="Du nouveau à la Chatterie"
		aria-live="polite"
		data-testid="mathou-news-card"
	>
		{#if !hasItems}
			<!-- Rattrapage : des gidouilles sans nouveauté détaillée -->
		{:else if isFirstVisitGroup(news)}
			<div class="flex items-center gap-3">
				<MathouAvatar
					raceIndex={news.items[0].raceIndex}
					stage={news.items[0].stage}
					decoration={news.items[0].decoration}
					collar={news.items[0].collar}
					glasses={news.items[0].glasses}
					hat={news.items[0].hat}
					size={40}
					label="Un Mathou de la Chatterie"
				/>
				<p class="text-sm font-medium">{firstVisitPhrase(news.total)}</p>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each news.items as item (item.notionId)}
					<li class="flex items-center gap-3">
						<MathouAvatar
							raceIndex={item.raceIndex}
							stage={item.stage}
							decoration={item.decoration}
							collar={item.collar}
							glasses={item.glasses}
							hat={item.hat}
							size={40}
							label={item.name}
							reaction={REACTION[item.kind]}
							growFrom={item.previousStage}
						/>
						<p class="text-sm font-medium">{newsItemPhrase(item)}</p>
					</li>
				{/each}
			</ul>
			{#if remaining > 0}
				<p class="text-sm text-muted-foreground">{moreNewsPhrase(remaining)}</p>
			{/if}
		{/if}
		{#if gidouilles > 0}
			<p class="text-sm font-medium" data-testid="mathou-news-gidouilles">
				{gidouillesPhrase(gidouilles, !hasItems)}
			</p>
		{/if}
		<a
			href={resolve('/dashboard/student/chatterie')}
			class="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
		>
			Voir la Chatterie
		</a>
	</section>
{/if}
