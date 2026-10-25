<script lang="ts">
	/**
	 * Vitrine « Décorations des Mathoux » de l'onglet Boutique du Marché (lots B, C
	 * et D des accessoires, décisions de David du 2026-10-24 et du 2026-10-25) : les
	 * six décorations de panse, les quatre colliers, les cinq lunettes et les cinq
	 * chapeaux sur un Mathou d'exemple, avec leur prix, et le lien « Décorer mes
	 * Mathoux ».
	 *
	 * AUCUN achat ici : le Marché peut être fermé (`check_marketplace_enabled`),
	 * la Chatterie reste la voie d'achat (chaque décoration s'achète pour un Mathou).
	 */

	import { resolve } from '$app/paths';
	import { Cat } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import MathouAvatar from './MathouAvatar.svelte';
	import { MATHOU_RACES } from './mathou-races';
	import gidouilleImage from '$lib/assets/images/gidouille.png';
	import {
		MATHOU_COLLARS,
		MATHOU_DECORATIONS,
		MATHOU_GLASSES,
		MATHOU_HATS
	} from '$lib/mathoux/decorations';

	// Constantes
	// Le Mathou d'exemple : un matou noir uni, où chaque décoration se voit bien
	const SAMPLE_RACE = Math.max(
		0,
		MATHOU_RACES.findIndex((race) => race.pattern === 'uni')
	);
</script>

{#snippet priced(name: string, price: number)}
	<p class="font-medium">{name}</p>
	<p class="flex items-center gap-1 text-sm">
		{price}
		<img src={gidouilleImage} alt="gidouilles" class="h-4 w-4" />
	</p>
{/snippet}

<section aria-labelledby="vitrine-decorations" class="space-y-4">
	<h2 id="vitrine-decorations" class="flex items-center gap-2 text-2xl font-bold">
		<Cat class="h-6 w-6 text-primary" aria-hidden="true" />
		Décorations des Mathoux
	</h2>
	<p class="text-muted-foreground">
		Une décoration se pose sur la panse d’un de tes Mathoux, un collier à son cou, des lunettes sur
		ses yeux et un chapeau sur sa tête. Chacun s’achète une fois, dans la Chatterie, et se change de
		Mathou gratuitement.
	</p>

	<h3 class="font-semibold">Sur la panse</h3>
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
		{#each MATHOU_DECORATIONS as info (info.id)}
			<li
				class="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center"
			>
				<MathouAvatar
					raceIndex={SAMPLE_RACE}
					stage="matou"
					animated={false}
					decoration={info.id}
					size={80}
					label={`Un Mathou avec : ${info.name}`}
				/>
				{@render priced(info.name, info.price)}
			</li>
		{/each}
	</ul>

	<h3 class="font-semibold">Au cou</h3>
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		{#each MATHOU_COLLARS as info (info.id)}
			<li
				class="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center"
			>
				<MathouAvatar
					raceIndex={SAMPLE_RACE}
					stage="matou"
					animated={false}
					collar={info.id}
					size={80}
					label={`Un Mathou avec : ${info.name}`}
				/>
				{@render priced(info.name, info.price)}
			</li>
		{/each}
	</ul>

	<h3 class="font-semibold">Sur les yeux</h3>
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		{#each MATHOU_GLASSES as info (info.id)}
			<li
				class="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center"
			>
				<MathouAvatar
					raceIndex={SAMPLE_RACE}
					stage="matou"
					animated={false}
					glasses={info.id}
					size={80}
					label={`Un Mathou avec : ${info.name}`}
				/>
				{@render priced(info.name, info.price)}
			</li>
		{/each}
	</ul>

	<h3 class="font-semibold">Sur la tête</h3>
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		{#each MATHOU_HATS as info (info.id)}
			<li
				class="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center"
			>
				<MathouAvatar
					raceIndex={SAMPLE_RACE}
					stage="matou"
					animated={false}
					hat={info.id}
					size={80}
					label={`Un Mathou avec : ${info.name}`}
				/>
				{@render priced(info.name, info.price)}
			</li>
		{/each}
	</ul>

	<Button href={resolve('/dashboard/student/chatterie')} variant="outline">
		Décorer mes Mathoux
	</Button>
</section>
