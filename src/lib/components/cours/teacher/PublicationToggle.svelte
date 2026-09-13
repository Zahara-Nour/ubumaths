<!--
	PublicationToggle
	=================

	Met un contenu de chapitre à disposition des élèves, ou l'en retire.

	Le même geste pour les cinq types de contenu : documents, exercices,
	objectifs, questions de quiz et fiches. Le type part dans le formulaire sous
	forme de clé, jamais de nom de table — le serveur le traduit contre une liste
	fermée.

	⚠️ **Une fiche cumule deux gardes.** Publier la range dans le cours ; l'élève
	ne la verra que si elle lui a AUSSI été distribuée. Le libellé le dit, parce
	que le professeur croirait sinon avoir donné la fiche.

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

	// Une fiche publiée mais non distribuée reste invisible : le dire ici évite
	// que le professeur attende un effet qui ne viendra pas.
	const invisibleMalgrePublication = $derived(
		published && contentType === 'worksheet' && distributed === false
	);
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
			title={published ? 'Retirer de la vue des élèves' : 'Mettre à disposition des élèves'}
		>
			{#if published}
				<EyeOff class="mr-1 h-4 w-4" />
				Retirer
			{:else}
				<Eye class="mr-1 h-4 w-4" />
				Publier
			{/if}
		</Button>
	</form>
</div>
