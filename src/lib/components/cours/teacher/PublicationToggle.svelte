<!--
	PublicationToggle
	=================

	Met un contenu de chapitre à disposition des élèves, ou l'en retire.

	Le même geste pour les quatre types de contenu : documents, exercices,
	objectifs et fiches. Le quiz de chapitre était le cinquième ; il a été retiré
	par la migration `20260915340000`, le moteur de questions l'ayant remplacé.
	Le type part dans le formulaire sous
	forme de clé, jamais de nom de table — le serveur le traduit contre une liste
	fermée.

	⚠️ **Publier une fiche la DISTRIBUE** à la classe du chapitre, immédiatement
	et sans confirmation (tranché par David le 2026-09-13). Le bouton le dit :
	un clic donne la fiche à toute la classe.

	Dépublier, en revanche, ne reprend rien : l'affectation reste, l'élève garde
	la fiche dans « Mon travail ». On n'interrompt pas un travail en cours.

	@module components/cours/teacher/PublicationToggle
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Eye, EyeOff } from '@lucide/svelte';
	import type { ChapterContentType } from '$lib/types/chapters';

	interface Props {
		contentType: ChapterContentType;
		itemId: string;
		/** Date de mise à disposition, ou `null` si le contenu est encore préparé. */
		publishedAt: string | null;
		/**
		 * Pour une fiche seulement : a-t-elle été distribuée ? Publier sans
		 * distribuer ne la montre à personne.
		 */
		distributed?: boolean;
	}

	let { contentType, itemId, publishedAt, distributed }: Props = $props();

	let isSubmitting = $state(false);

	const published = $derived(publishedAt !== null);

	// Une fiche publiée AVANT la phase 4 peut être restée non distribuée : le
	// dire plutôt que d'afficher « visible par les élèves » pour une fiche que
	// personne ne peut ouvrir.
	const invisibleMalgrePublication = $derived(
		published && contentType === 'worksheet' && distributed === false
	);

	const estFiche = $derived(contentType === 'worksheet');
</script>

<div class="flex items-center gap-2">
	{#if invisibleMalgrePublication}
		<Badge variant="outline" class="border-amber-500/60 text-amber-700 dark:text-amber-400">
			Publiée, pas encore distribuée
		</Badge>
	{:else if published}
		<Badge variant="outline" class="border-green-500/60 text-green-700 dark:text-green-400">
			Visible par les élèves
		</Badge>
	{:else}
		<Badge variant="secondary">Préparé</Badge>
	{/if}

	<form
		method="POST"
		action="?/setPublication"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
	>
		<input type="hidden" name="contentType" value={contentType} />
		<input type="hidden" name="itemId" value={itemId} />
		<input type="hidden" name="published" value={published ? 'false' : 'true'} />
		<Button
			type="submit"
			variant="ghost"
			size="sm"
			disabled={isSubmitting}
			title={published
				? estFiche
					? 'Retirer du chapitre — les élèves la gardent dans « Mon travail »'
					: 'Retirer de la vue des élèves'
				: estFiche
					? 'Publier ET distribuer à toute la classe, immédiatement'
					: 'Mettre à disposition des élèves'}
		>
			{#if published}
				<EyeOff class="mr-1 h-4 w-4" />
				Retirer
			{:else}
				<Eye class="mr-1 h-4 w-4" />
				{estFiche ? 'Publier et distribuer' : 'Publier'}
			{/if}
		</Button>
	</form>
</div>
