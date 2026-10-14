<!--
	ChapterAddDialogs
	=================

	Les boîtes de dialogue qui AJOUTENT au plan — objectif (et sa correction),
	exercice, fiche, série, document — pour un chapitre OU un modèle de chapitre
	(ADR 0029 : un seul éditeur, partagé).

	L'éditeur de sections ne fait que désigner la cible (`onAdd`) ; la page
	appelle alors `ouvrirAjout(kind, sectionId)` ou `modifierObjectif(item)`. Les
	formulaires postent aux actions de la page (`?/linkExercise`…), qui portent
	les mêmes noms sur la page du chapitre et sur celle du modèle. Le message de
	succès et le rechargement restent à la page, qui lit `form`.

	@module components/cours/teacher/ChapterAddDialogs
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import DocumentUpload from './DocumentUpload.svelte';
	import type { SectionContentKind } from '$lib/server/validation/chapter-sections';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Database } from '$lib/types/database';

	// Types
	/** Le propriétaire du plan : un chapitre OU un modèle, jamais les deux. */
	type Owner =
		{ chapterId: string; templateId?: undefined } | { templateId: string; chapterId?: undefined };

	type Props = Owner & {
		/** Client Supabase du navigateur : le fichier d'un document part directement au stockage. */
		supabase: SupabaseClient<Database>;
		availableExercises: { id: string; title: string | null }[];
		availableWorksheets: { id: string; title: string | null }[];
		availableSeries: { id: string; title: string; questionCount: number }[];
		/** Ce qui est déjà dans le plan, et ne se propose donc plus. */
		takenExerciseIds: string[];
		takenWorksheetIds: string[];
		takenSeriesIds: string[];
		/** Un document vient d'être ajouté (la page recharge). */
		onDocumentAdded: () => void;
	};

	let {
		chapterId,
		templateId,
		supabase,
		availableExercises,
		availableWorksheets,
		availableSeries,
		takenExerciseIds,
		takenWorksheetIds,
		takenSeriesIds,
		onDocumentAdded
	}: Props = $props();

	// Constantes
	const seriesFormItems = [
		{ value: 'flash', label: 'Flash-cards' },
		{ value: 'interactive', label: 'Entraînement' }
	];

	// Variables
	const isTemplate = $derived(templateId !== undefined);

	let showLinkExerciseDialog = $state(false);
	let showLinkWorksheetDialog = $state(false);
	let showLinkSeriesDialog = $state(false);
	let showChecklistDialog = $state(false);
	let showDocumentDialog = $state(false);

	/**
	 * La section où ira la prochaine ressource créée.
	 *
	 * ⚠️ Posée au moment du clic sur « Ajouter », et relue à l'envoi du
	 * formulaire : c'est elle qui fait la différence entre « créé là où j'ai
	 * cliqué » et « créé en Non classé, débrouille-toi ». `null` est une valeur
	 * légitime — c'est « Non classé ».
	 */
	let targetSectionId = $state<string | null>(null);

	/** Objectif en cours d'écriture — vide pour une création, rempli pour une reprise. */
	let checklistItemId = $state('');
	let checklistContent = $state('');
	let checklistDescription = $state('');

	let selectedExerciseId = $state('');
	let selectedWorksheetId = $state('');
	let selectedSeriesId = $state('');
	/** Q124 (a) : flash-cards par défaut. */
	let selectedSeriesForm = $state('flash');
	let isSubmitting = $state(false);

	let exerciseItems = $derived([
		{ value: '', label: `Choisir une ${lore.learning.exercise}…` },
		...availableExercises
			.filter((e) => !takenExerciseIds.includes(e.id))
			.map((e) => ({
				value: e.id,
				// `exercises.title` est nullable : un libellé de repli vaut mieux
				// qu'une entrée vide dans la liste déroulante.
				label: e.title ?? 'Exercice sans titre'
			}))
	]);

	let worksheetItems = $derived([
		{ value: '', label: 'Choisir une fiche…' },
		...availableWorksheets
			.filter((w) => !takenWorksheetIds.includes(w.id))
			.map((w) => ({ value: w.id, label: w.title ?? 'Fiche sans titre' }))
	]);

	let seriesItems = $derived([
		{ value: '', label: 'Choisir une série…' },
		...availableSeries
			.filter((s) => !takenSeriesIds.includes(s.id))
			.map((s) => ({
				value: s.id,
				label: `${s.title} — ${s.questionCount} question${s.questionCount > 1 ? 's' : ''}`
			}))
	]);

	// Functions
	/**
	 * Le nom accessible d'une liste déroulante : ce qu'elle règle ET ce qui est
	 * choisi — l'invite seule n'annonce jamais le choix (warning-svelte.md).
	 */
	function nomDuChoix(
		nom: string,
		items: { value: string; label: string }[],
		valeur: string
	): string {
		const choix = valeur ? items.find((i) => i.value === valeur)?.label : undefined;
		return choix ? `${nom} : ${choix}` : `${nom} : aucune sélection`;
	}

	/**
	 * Le professeur a choisi un type dans le menu « Ajouter » d'une section.
	 * On retient la cible, puis on ouvre la bonne boîte. Rien n'est créé ici.
	 */
	export function ouvrirAjout(kind: SectionContentKind, sectionId: string | null) {
		targetSectionId = sectionId;

		if (kind === 'checklistItem') {
			checklistItemId = '';
			checklistContent = '';
			checklistDescription = '';
			showChecklistDialog = true;
		} else if (kind === 'exercise') {
			selectedExerciseId = '';
			showLinkExerciseDialog = true;
		} else if (kind === 'worksheet') {
			selectedWorksheetId = '';
			showLinkWorksheetDialog = true;
		} else if (kind === 'series') {
			selectedSeriesId = '';
			selectedSeriesForm = 'flash';
			showLinkSeriesDialog = true;
		} else if (kind === 'document') {
			showDocumentDialog = true;
		}
	}

	/** Reprendre le texte d'un objectif déjà posé. */
	export function modifierObjectif(item: {
		id: string;
		content: string;
		description: string | null;
	}) {
		checklistItemId = item.id;
		checklistContent = item.content;
		checklistDescription = item.description ?? '';
		// La section ne bouge pas : on ne fait que corriger le texte.
		targetSectionId = null;
		showChecklistDialog = true;
	}

	/**
	 * Envoi d'une boîte : elle se ferme sur un succès ; le message et le
	 * rechargement viennent de la page, qui lit `form` après `update()`.
	 */
	function envoi(fermer: () => void): SubmitFunction {
		return () => {
			isSubmitting = true;
			return async ({ result, update }) => {
				isSubmitting = false;
				if (result.type === 'success') fermer();
				await update();
			};
		};
	}
</script>

<Dialog.Root bind:open={showLinkWorksheetDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Rattacher une fiche</Dialog.Title>
			<Dialog.Description>
				{#if isTemplate}
					La fiche est ajoutée au modèle. Chaque chapitre lié la reçoit préparée : rien n'est
					distribué aux élèves.
				{:else}
					La fiche sera rangée dans ce chapitre. Elle n'est pas distribuée pour autant : les élèves
					ne la verront qu'une fois affectée.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/linkWorksheet"
			use:enhance={envoi(() => {
				showLinkWorksheetDialog = false;
				selectedWorksheetId = '';
			})}
			class="space-y-4"
		>
			<input type="hidden" name="sectionId" value={targetSectionId ?? ''} />
			<div class="space-y-2">
				<Label for="add-worksheet">Fiche</Label>
				<MySelect
					id="add-worksheet"
					type="single"
					bind:value={selectedWorksheetId}
					items={worksheetItems}
					triggerAriaLabel={nomDuChoix('Fiche', worksheetItems, selectedWorksheetId)}
				/>
				<input type="hidden" name="worksheetId" value={selectedWorksheetId} />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showLinkWorksheetDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !selectedWorksheetId}>
					{isSubmitting ? 'Rattachement…' : 'Rattacher'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!--
	Série : une série ENREGISTRÉE du professeur (S1), lancée par l'élève dans la
	forme choisie ici (Q124 a), sans note. Le lien suit la série (Q125).
-->
<Dialog.Root bind:open={showLinkSeriesDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Ajouter une série</Dialog.Title>
			<Dialog.Description>
				{#if isTemplate}
					Ajoutée au modèle, elle arrive préparée dans chaque chapitre lié. Une modification de la
					série se verra partout.
				{:else}
					Les élèves la lanceront depuis le chapitre, sans note. Elle reste préparée tant que tu ne
					l’as pas publiée, et une modification de la série se verra dans le chapitre.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/linkSeries"
			use:enhance={envoi(() => {
				showLinkSeriesDialog = false;
				selectedSeriesId = '';
			})}
			class="space-y-4"
		>
			<input type="hidden" name="sectionId" value={targetSectionId ?? ''} />
			<div class="space-y-2">
				<Label for="add-series">Série</Label>
				<MySelect
					id="add-series"
					type="single"
					bind:value={selectedSeriesId}
					items={seriesItems}
					triggerAriaLabel={nomDuChoix('Série', seriesItems, selectedSeriesId)}
				/>
				<input type="hidden" name="seriesId" value={selectedSeriesId} />
				{#if availableSeries.length === 0}
					<p class="text-sm text-muted-foreground">Aucune série enregistrée pour l’instant.</p>
				{/if}
				<a
					href={resolve('/automaths/panier')}
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm text-primary underline-offset-4 hover:underline"
				>
					Composer une nouvelle série au panier
				</a>
			</div>

			<div class="space-y-2">
				<Label for="add-series-form">Forme</Label>
				<MySelect
					id="add-series-form"
					type="single"
					bind:value={selectedSeriesForm}
					items={seriesFormItems}
					triggerAriaLabel={nomDuChoix('Forme', seriesFormItems, selectedSeriesForm)}
				/>
				<input type="hidden" name="form" value={selectedSeriesForm} />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showLinkSeriesDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !selectedSeriesId}>
					{isSubmitting ? 'Ajout…' : 'Ajouter'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showLinkExerciseDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Lier une {lore.learning.exercise}</Dialog.Title>
			<Dialog.Description>
				Sélectionnez une {lore.learning.exercise} existante pour la lier à
				{isTemplate ? 'ce modèle' : 'ce chapitre'}.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/linkExercise"
			use:enhance={envoi(() => {
				showLinkExerciseDialog = false;
				selectedExerciseId = '';
			})}
			class="space-y-4"
		>
			<input type="hidden" name="sectionId" value={targetSectionId ?? ''} />
			<div class="space-y-2">
				<Label for="add-exercise">{lore.learning.exercise}</Label>
				<MySelect
					id="add-exercise"
					type="single"
					bind:value={selectedExerciseId}
					items={exerciseItems}
					triggerAriaLabel={nomDuChoix(lore.learning.exercise, exerciseItems, selectedExerciseId)}
				/>
				<input type="hidden" name="exerciseId" value={selectedExerciseId} />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showLinkExerciseDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !selectedExerciseId}>
					{isSubmitting ? 'Liaison…' : 'Lier'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!--
	Objectif : la MÊME boîte crée et corrige.
	=========================================

	`checklistItemId` fait la bascule — vide, on crée dans la section visée ;
	rempli, on corrige un texte existant sans toucher à son rangement. Deux
	boîtes auraient divergé, et le professeur aurait fini par ne plus savoir
	laquelle ouvre quoi.
-->
<Dialog.Root bind:open={showChecklistDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>
				{checklistItemId ? 'Modifier l’objectif' : 'Ajouter un objectif'}
			</Dialog.Title>
			<Dialog.Description>
				Ce que l’{lore.entities.student} doit savoir faire à la fin du chapitre.
				{#if isTemplate}
					Corrigé ici, il l’est aussitôt dans chaque chapitre lié.
				{:else}
					Il reste préparé tant que tu ne l’as pas publié.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action={checklistItemId ? '?/updateChecklistItem' : '?/addChecklistItem'}
			use:enhance={envoi(() => {
				showChecklistDialog = false;
			})}
			class="space-y-4"
		>
			<input type="hidden" name="sectionId" value={targetSectionId ?? ''} />
			{#if checklistItemId}
				<input type="hidden" name="itemId" value={checklistItemId} />
			{/if}

			<div class="space-y-2">
				<Label for="checklist-content">Objectif</Label>
				<Input
					id="checklist-content"
					name="content"
					bind:value={checklistContent}
					maxlength={500}
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="checklist-description">Précision (facultative)</Label>
				<Textarea
					id="checklist-description"
					name="description"
					bind:value={checklistDescription}
					maxlength={1000}
					rows={2}
				/>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showChecklistDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !checklistContent.trim()}>
					{checklistItemId ? 'Enregistrer' : 'Ajouter'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!--
	Document : l'envoi direct et le lien Drive, tels quels.
	Le fichier ne traverse pas la fonction — il part du navigateur vers le
	stockage, muni d'une autorisation à usage unique, chez son propriétaire.
-->
<Dialog.Root bind:open={showDocumentDialog}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Ajouter un document</Dialog.Title>
			<Dialog.Description>
				Dépose un fichier, ou colle le lien d’un document Google Drive.
			</Dialog.Description>
		</Dialog.Header>

		{#if templateId !== undefined}
			<DocumentUpload
				{templateId}
				{supabase}
				sectionId={targetSectionId}
				onSuccess={() => {
					showDocumentDialog = false;
					onDocumentAdded();
				}}
			/>
		{:else if chapterId !== undefined}
			<DocumentUpload
				{chapterId}
				{supabase}
				sectionId={targetSectionId}
				onSuccess={() => {
					showDocumentDialog = false;
					onDocumentAdded();
				}}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>
