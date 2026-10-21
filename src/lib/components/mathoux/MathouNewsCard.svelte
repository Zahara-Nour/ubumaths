<!--
	MathouNewsCard
	==============
	Fin de séance : ce qui est nouveau à la Chatterie (naissance, croissance,
	étoile), sous la carte du Palotin. Partagé par l'Entraînement / la Course aux
	nombres (`TestResults`) et la séance de révision (`ReviewSession`).

	Props :
	- news : `fetchMathouNews()` ; `null` ou rien de nouveau → rien n'est affiché.
	  Premier passage avec plusieurs Mathoux : une seule phrase, pas de liste.
-->

<script lang="ts">
	import { resolve } from '$app/paths';
	import MathouAvatar from './MathouAvatar.svelte';
	import {
		firstVisitPhrase,
		isFirstVisitGroup,
		moreNewsPhrase,
		newsItemPhrase,
		type MathouNews
	} from '$lib/mathoux/news';

	// Types
	interface Props {
		news: MathouNews | null;
	}

	let { news }: Props = $props();

	const remaining = $derived(news ? news.total - news.items.length : 0);
</script>

{#if news && news.total > 0 && news.items.length > 0}
	<section
		class="space-y-2 rounded-lg border bg-muted/40 p-3"
		aria-label="Du nouveau à la Chatterie"
		aria-live="polite"
		data-testid="mathou-news-card"
	>
		{#if isFirstVisitGroup(news)}
			<div class="flex items-center gap-3">
				<MathouAvatar
					raceIndex={news.items[0].raceIndex}
					stage={news.items[0].stage}
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
							size={40}
							label={item.name}
						/>
						<p class="text-sm font-medium">{newsItemPhrase(item)}</p>
					</li>
				{/each}
			</ul>
			{#if remaining > 0}
				<p class="text-sm text-muted-foreground">{moreNewsPhrase(remaining)}</p>
			{/if}
		{/if}
		<a
			href={resolve('/dashboard/student/chatterie')}
			class="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
		>
			Voir la Chatterie
		</a>
	</section>
{/if}
