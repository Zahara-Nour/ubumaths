<script lang="ts">
	/**
	 * WorksheetCitationsNotice — les séances qui citent cette fiche par numéro.
	 *
	 * `[[worksheet:<uuid>#3,5-7]]` désigne des NUMÉROS : réordonner les exercices
	 * change ce que ces séances désignent. Le choix est assumé, mais il ne doit
	 * pas être invisible — sans cette liste, la conséquence ne se découvre que le
	 * jour où un élève fait le mauvais exercice.
	 *
	 * Affiché à côté de la LISTE D'EXERCICES, là où on réordonne : un
	 * avertissement placé ailleurs ne serait pas lu au moment qui compte.
	 *
	 * @example
	 * <WorksheetCitationsNotice citations={data.citations} />
	 */

	import { resolve } from '$app/paths';
	import type { WorksheetCitation } from '$lib/types/worksheets';

	let {
		citations = [],
		class: className = ''
	}: {
		citations?: WorksheetCitation[];
		class?: string;
	} = $props();

	/**
	 * `2026-09-12` → `jeu. 12 sept.`
	 *
	 * Découpé à la main plutôt que `new Date('2026-09-12')`, qui vaut minuit UTC :
	 * la date reculerait d'un jour à l'ouest de Greenwich. La date d'une séance
	 * n'a pas d'heure, elle ne doit pas dépendre d'un fuseau.
	 */
	function formatDate(iso: string): string {
		const [annee, mois, jour] = iso.split('-').map(Number);
		if (!annee || !mois || !jour) return iso;

		return new Date(annee, mois - 1, jour).toLocaleDateString('fr-FR', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}
</script>

{#if citations.length > 0}
	<div class="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm {className}">
		<p class="font-medium text-foreground">
			{citations.length}
			{citations.length > 1 ? 'séances citent' : 'séance cite'} cette fiche par numéro d'exercice
		</p>
		<p class="mt-1 text-muted-foreground">
			Réordonner les exercices changera ce qu'elles désignent : « exercice 3 » suivra la fiche, pas
			l'exercice.
		</p>

		<ul class="mt-2 space-y-1">
			{#each citations as citation (citation.entryId)}
				<li>
					<a
						href={resolve('/(protected)/dashboard/teacher/cahier-texte/[classId]/[date]', {
							classId: citation.classId,
							date: citation.entryDate
						})}
						class="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60"
					>
						{citation.className} — {formatDate(citation.entryDate)}
					</a>
					<span class="text-muted-foreground">· {citation.selections.join(' · ')}</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}
