<script lang="ts">
	/**
	 * Les Mathoux d'une Chatterie, rangés par race : partagé par la page de
	 * l'élève et la vue du professeur.
	 *
	 * « Faire grandir » (v1.1) : chaque Mathou né mène à un Entraînement sur sa
	 * notion (catégories calculées au serveur, lien construit ici) ; un Mathou endormi sans
	 * carte due se réveille par ce même Entraînement (« Réveiller » seul, sans
	 * « Faire grandir »), sinon par les révisions.
	 *
	 * `readOnly` (vue du professeur) : ni « Réveiller » ni « Faire grandir », ce
	 * sont des actions de l'élève.
	 *
	 * Décorations de panse (lot B des accessoires) : chaque Mathou porte la sienne,
	 * vue du prof comprise ; `ondecorate` (page de l'élève) ajoute « Décorer » sur
	 * chaque Mathou né.
	 *
	 * Mots du lore uniquement (chaton, matou, sieste…), jamais XP, niveau ni
	 * score (Compendium § IX).
	 */

	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import MathouAvatar from '$lib/components/mathoux/MathouAvatar.svelte';
	import { getMathouRace } from '$lib/components/mathoux/mathou-races';
	import {
		starGradeLabel,
		trainingQuery,
		type Mathou,
		type MathouGrowth,
		type MathouRaceGroup
	} from '$lib/mathoux/collection-logic';

	// La révision espacée du programme : c'est elle qui fait tomber les cartes dues.
	const REVISION_HREF = '/dashboard/revisions/decks/programme';

	const GROWTH_LABEL: Record<MathouGrowth, string> = {
		a_decouvrir: 'À découvrir',
		chaton: 'Chaton',
		matou: 'Matou',
		grand_matou: 'Grand matou'
	};

	let {
		races,
		readOnly = false,
		ondecorate
	}: {
		races: MathouRaceGroup[];
		readOnly?: boolean;
		/** « Décorer » ce Mathou ; absent = pas de bouton */
		ondecorate?: (mathou: Mathou) => void;
	} = $props();

	/** Lien de l'Entraînement d'un Mathou, construit au rendu (`trainingQuery`). */
	function trainingLink(mathou: Mathou): string | null {
		const query = trainingQuery(mathou.trainingCategories);
		return query ? `${resolve('/automaths/test')}?${query}` : null;
	}

	/**
	 * « Réveiller » : les révisions s'il y a une carte due ; sinon (endormi par un
	 * point perdu seul) l'Entraînement de la notion, dont les sessions ne
	 * dépendent pas des cartes dues ; sans Entraînement possible, aucun lien (une
	 * révision n'aurait rien à proposer).
	 */
	function wakeLink(mathou: Mathou): string | null {
		if (mathou.dueForRevision) return resolve(REVISION_HREF);
		return trainingLink(mathou);
	}

	/** Texte du dessin : le stade, sans répéter le nom affiché à côté. */
	function avatarLabel(mathou: Mathou): string {
		if (mathou.growth === 'a_decouvrir') return 'Silhouette d’un Mathou à découvrir';
		const stage = GROWTH_LABEL[mathou.growth].toLowerCase();
		return mathou.asleep ? `Dessin d’un ${stage} endormi` : `Dessin d’un ${stage}`;
	}
</script>

<div class="space-y-8">
	{#each races as race (race.branchId)}
		<section aria-labelledby="race-{race.branchId}">
			<!-- Une race par branche : elle se lit ici, une fois, pas sur chaque carte -->
			<header class="mb-3 flex flex-wrap items-baseline gap-x-2">
				<h2 id="race-{race.branchId}" class="text-xl font-semibold">{race.branchName}</h2>
				<p class="text-muted-foreground italic">{getMathouRace(race.raceIndex).name}</p>
			</header>
			<ul class="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3">
				{#each race.mathoux as mathou (mathou.notionId)}
					{@const toDiscover = mathou.growth === 'a_decouvrir'}
					<li
						class="flex items-start gap-3 rounded-lg border border-border bg-card p-3 {toDiscover
							? 'opacity-75'
							: ''}"
					>
						<!-- Le stade sous le dessin -->
						<div class="flex shrink-0 flex-col items-center gap-1">
							<MathouAvatar
								raceIndex={mathou.raceIndex}
								stage={mathou.growth === 'a_decouvrir' ? 'chaton' : mathou.growth}
								asleep={mathou.asleep}
								silhouette={toDiscover}
								decoration={mathou.decoration}
								collar={mathou.collar}
								glasses={mathou.glasses}
								hat={mathou.hat}
								size={80}
								label={avatarLabel(mathou)}
							/>
							<p class="text-sm text-muted-foreground">{GROWTH_LABEL[mathou.growth]}</p>
						</div>
						<!-- Partie droite centrée -->
						<div class="min-w-0 flex-1 text-center">
							{#if toDiscover}
								<p class="font-medium break-words">{mathou.notionName}</p>
							{:else}
								<!-- « Tangentin », puis la notion qu'il incarne, en petites capitales -->
								<p class="text-lg font-semibold break-words">{mathou.name}</p>
								<p
									class="text-xs font-semibold tracking-wide break-words text-muted-foreground uppercase"
								>
									{mathou.notionName}
								</p>
							{/if}
							{#if mathou.stars.length > 0}
								<!-- Une étoile par classe où la notion a été entièrement acquise (mémoire) -->
								<ul class="flex flex-wrap justify-center gap-x-2 text-sm" aria-label="Étoiles">
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
							{/if}
							{#if !toDiscover && !readOnly}
								{@const wake = mathou.asleep ? wakeLink(mathou) : null}
								<!-- Endormi sans carte due : « Réveiller » mène déjà à l'Entraînement, un seul bouton -->
								{@const grow =
									mathou.asleep && !mathou.dueForRevision ? null : trainingLink(mathou)}
								{#if wake || grow || ondecorate}
									<div class="mt-1 flex flex-wrap justify-center gap-2">
										{#if wake}
											<Button
												href={wake}
												size="sm"
												variant="outline"
												aria-label="Réveiller {mathou.name}"
											>
												Réveiller
											</Button>
										{/if}
										{#if grow}
											<Button
												href={grow}
												size="sm"
												variant="outline"
												aria-label="Faire grandir {mathou.name}"
											>
												Faire grandir
											</Button>
										{/if}
										{#if ondecorate}
											<Button
												size="sm"
												variant="outline"
												aria-label="Décorer {mathou.name}"
												onclick={() => ondecorate(mathou)}
											>
												Décorer
											</Button>
										{/if}
									</div>
								{/if}
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
