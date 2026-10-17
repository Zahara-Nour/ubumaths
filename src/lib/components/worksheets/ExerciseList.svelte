<!--
	ExerciseList Component
	======================

	La fiche telle qu'elle sera imprimée : les sections dans leur ordre, chacune
	avec son titre, ses instructions et ses corvées, puis « Sans section ».
	Les sections se gèrent ICI (il n'y a plus de carte « Sections » à part,
	2026-10-16 : elles apparaissaient deux fois).

	Features:
	- Sections : créer, modifier (titre, instructions, anglais), supprimer
	  (ses corvées passent dans « Sans section »), déplacer par l'en-tête
	- Corvées : déplacer dans leur section ou vers une autre (glisser-déposer),
	  numéro continu, points, indispensable, réglages, retrait
	- Cadres de réponse en lignes sous chaque exercice, si la fiche a « réponses
	  sur le sujet » (`AnswerFrameLinesEditor`, ADR 0030 lot 4)

	Glisser-déposer : `svelte-dnd-action`, comme `ChapterSectionsEditor`. Pendant
	un geste, les zones touchées s'affichent depuis un état local
	(`zonesEnGlisser`, `sectionsEnGlisser`) ; à la dépose, on compare la zone
	déposée aux PROPS (`worksheet-outline.ts`) — jamais à l'état du geste, où
	l'ombre de la bibliothèque porte déjà l'identifiant de l'élément tiré.

	Usage:
	```svelte
	<ExerciseList
		worksheetId={worksheet.id}
		exercises={worksheet.exercises}
		sections={worksheet.sections}
		readonly={worksheet.status !== 'draft'}
		onExercisesChange={handleExercisesChange}
		onSectionsChange={handleSectionsChange}
		onEditExercise={handleEditExercise}
	>
		{#snippet actions()}<ExerciseSelector … />{/snippet}
	</ExerciseList>
	```
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { SvelteSet } from 'svelte/reactivity';
	import { dndzone, SHADOW_PLACEHOLDER_ITEM_ID, TRIGGERS, type DndEvent } from 'svelte-dnd-action';
	import { lore } from '$lib/config/lore';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		GripVertical,
		Trash2,
		Loader2,
		Settings2,
		Star,
		Pencil,
		Plus,
		Save,
		X
	} from '@lucide/svelte';
	import { exerciseEditHref } from '$lib/worksheets/exercise-edit-link';
	import {
		applyPlacements,
		applySectionOrder,
		placementsAfterDrop,
		sectionOrderAfterDrop,
		worksheetOutline,
		type ExercisePlacement,
		type SectionPlacement
	} from '$lib/worksheets/worksheet-outline';
	import { estOmbre } from '$lib/components/cours/teacher/section-dnd';
	import AnswerFrameLinesEditor from './AnswerFrameLinesEditor.svelte';
	import type {
		AnswerFrameLines,
		AnswerFrameMode,
		RowTranslations,
		WorksheetExerciseWithExercise,
		WorksheetSectionRow
	} from '$lib/types/worksheets';
	import type { ContentLocale } from '$lib/types/locale';

	// Types
	interface Props {
		worksheetId: string;
		exercises?: WorksheetExerciseWithExercise[];
		sections: WorksheetSectionRow[];
		readonly?: boolean;
		onExercisesChange?: (exercises: WorksheetExerciseWithExercise[]) => void;
		onSectionsChange?: (sections: WorksheetSectionRow[]) => void;
		onEditExercise?: (exercise: WorksheetExerciseWithExercise) => void;
		/** Boutons d'en-tête fournis par la page (« Ajouter des corvées ») */
		actions?: Snippet;
		/** La fiche a « réponses sur le sujet » : le réglage des cadres s'affiche */
		answersOnSheet?: boolean;
		/** Cadre après chaque question (défaut) ou un seul après l'exercice */
		answerFrameMode?: AnswerFrameMode;
		/** Langue de la fiche : celle de l'énoncé dont on estime les cadres */
		language?: ContentLocale;
		/** Délai avant sauvegarde des cadres (tests : 0) */
		frameSaveDelayMs?: number;
	}

	/** Ce que manipule une zone de dépose : un identifiant, rien d'autre. */
	type ZoneItem = { id: string };

	// Constantes
	const FLIP_MS = 150;
	/** Clé de la zone « Sans section » (une section a un UUID, jamais ce texte). */
	const SANS_SECTION = 'sans-section';
	const CORVEE = lore.learning.exercise;
	const corvee = CORVEE.toLowerCase();

	// Props
	let {
		worksheetId,
		exercises = $bindable([]),
		sections = $bindable([]),
		readonly = false,
		onExercisesChange,
		onSectionsChange,
		onEditExercise,
		actions,
		answersOnSheet = false,
		answerFrameMode = 'question',
		language = 'fr',
		frameSaveDelayMs
	}: Props = $props();

	const isEnglishWorksheet = $derived(language === 'en');

	// Le plan tel que les props le décrivent : toutes les sections, vides
	// comprises, puis « Sans section ».
	let outline = $derived(worksheetOutline(exercises, sections));
	let exerciseById = $derived(new Map(exercises.map((x) => [x.id, x])));
	let sectionById = $derived(new Map(sections.map((x) => [x.id, x])));
	let numberById = $derived(
		new Map(outline.flatMap((z) => z.exercises.map((x) => [x.exercise.id, x.number] as const)))
	);

	// Glisser-déposer : les zones touchées par le geste en cours (sinon `null`)
	let zonesEnGlisser = $state<Record<string, ZoneItem[]> | null>(null);
	let sectionsEnGlisser = $state<ZoneItem[] | null>(null);
	let isSaving = $state(false);

	// Ajout d'une section
	let isAdding = $state(false);
	let isSubmitting = $state(false);
	let newSectionTitle = $state('');
	let newSectionInstructions = $state('');

	// Modification d'une section
	let editingSectionId = $state<string | null>(null);
	let editTitle = $state('');
	let editInstructions = $state('');
	let editTitleEn = $state('');
	let editInstructionsEn = $state('');
	let isSavingEdit = $state(false);

	// Suppression d'une section
	let deletingSectionId = $state<string | null>(null);
	let deleteSectionOpen = $state(false);
	let isDeletingSection = $state(false);

	// Retrait d'une corvée
	let deletingExerciseId = $state<string | null>(null);
	let deleteConfirmOpen = $state(false);
	let isDeleting = $state(false);

	// Bascules « indispensable » en cours (plusieurs à la fois possibles)
	const togglingEssentialIds = new SvelteSet<string>();

	let sectionZoneItems = $derived(
		sectionsEnGlisser ?? outline.flatMap((z) => (z.section ? [{ id: z.section.id }] : []))
	);

	let deletingSectionCount = $derived(
		deletingSectionId ? exercises.filter((x) => x.section_id === deletingSectionId).length : 0
	);

	let deleteSectionDescription = $derived(
		deletingSectionCount === 0
			? 'Cette section est vide.'
			: deletingSectionCount === 1
				? `La ${corvee} de cette section passera dans « Sans section ». Aucune ${corvee} n'est supprimée.`
				: `Les ${deletingSectionCount} ${corvee}s de cette section passeront dans « Sans section ». Aucune ${corvee} n'est supprimée.`
	);

	// ===== Zones =====

	function zoneKey(sectionId: string | null): string {
		return sectionId ?? SANS_SECTION;
	}

	/** Les corvées d'une zone : celles du geste en cours, sinon celles des props. */
	function zoneItems(sectionId: string | null): ZoneItem[] {
		const enCours = zonesEnGlisser?.[zoneKey(sectionId)];
		if (enCours) return enCours;
		const zone = outline.find((z) => (z.section?.id ?? null) === sectionId);
		return zone?.exercises.map((x) => ({ id: x.exercise.id })) ?? [];
	}

	function exerciseCount(sectionId: string | null): number {
		return outline.find((z) => (z.section?.id ?? null) === sectionId)?.exercises.length ?? 0;
	}

	// `Set` natif : local à cette fonction pure, jamais lu de façon réactive.
	function dedupeById<T extends { id: string }>(items: T[]): T[] {
		const vus = new Set<string>();
		return items.filter((item) => (vus.has(item.id) ? false : (vus.add(item.id), true)));
	}

	function dndKey(item: ZoneItem): string {
		return estOmbre(item) ? `${item.id}_dnd-shadow` : item.id;
	}

	function isShadow(item: ZoneItem): boolean {
		return estOmbre(item) || item.id === SHADOW_PLACEHOLDER_ITEM_ID;
	}

	// ===== Glisser-déposer : les corvées =====

	function exercisesConsider(sectionId: string | null, event: CustomEvent<DndEvent<ZoneItem>>) {
		zonesEnGlisser = {
			...zonesEnGlisser,
			[zoneKey(sectionId)]: dedupeById(event.detail.items)
		};
	}

	async function exercisesFinalize(
		sectionId: string | null,
		event: CustomEvent<DndEvent<ZoneItem>>
	) {
		// La zone de départ reçoit aussi un `finalize` (après celle d'arrivée à la
		// souris, avant au clavier) : seule la zone d'arrivée décide, et
		// `placementsAfterDrop` renumérote la zone quittée.
		if (event.detail.info.trigger === TRIGGERS.DROPPED_INTO_ANOTHER) return;

		const ids = event.detail.items.map((item) => item.id);
		zonesEnGlisser = null;

		const placements = placementsAfterDrop(exercises, sections, sectionId, ids);
		if (placements.length === 0) return;

		const previous = exercises;
		setExercises(applyPlacements(exercises, placements));
		await saveExerciseOrder(placements, previous);
	}

	/** Enregistre le rangement des corvées ; retour arrière si refusé. */
	async function saveExerciseOrder(
		updates: ExercisePlacement[],
		previousExercises: WorksheetExerciseWithExercise[]
	) {
		isSaving = true;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/exercises`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exercises: updates })
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la sauvegarde');
			}
		} catch (err) {
			console.error('Error saving exercise order:', err);
			setExercises(previousExercises);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	// ===== Glisser-déposer : les sections =====

	function sectionsConsider(event: CustomEvent<DndEvent<ZoneItem>>) {
		sectionsEnGlisser = dedupeById(event.detail.items);
	}

	async function sectionsFinalize(event: CustomEvent<DndEvent<ZoneItem>>) {
		const ids = event.detail.items.map((item) => item.id);
		sectionsEnGlisser = null;

		const placements = sectionOrderAfterDrop(sections, ids);
		if (placements.length === 0) return;

		const previous = sections;
		setSections(applySectionOrder(sections, placements));
		await saveSectionOrder(placements, previous);
	}

	/** Enregistre l'ordre des sections ; retour arrière si refusé. */
	async function saveSectionOrder(
		updates: SectionPlacement[],
		previousSections: WorksheetSectionRow[]
	) {
		isSaving = true;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/sections`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sections: updates })
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la sauvegarde');
			}
		} catch (err) {
			console.error('Error saving section order:', err);
			setSections(previousSections);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	// ===== État partagé avec la page =====

	function setExercises(next: WorksheetExerciseWithExercise[]) {
		exercises = next;
		onExercisesChange?.(next);
	}

	function setSections(next: WorksheetSectionRow[]) {
		sections = next;
		onSectionsChange?.(next);
	}

	// ===== Sections : créer, modifier, supprimer =====

	function openAddForm() {
		isAdding = true;
		newSectionTitle = '';
		newSectionInstructions = '';
	}

	function cancelAdd() {
		isAdding = false;
		newSectionTitle = '';
		newSectionInstructions = '';
	}

	async function createSection() {
		if (!newSectionTitle.trim()) {
			toaster.error('Le titre est requis');
			return;
		}

		isSubmitting = true;

		try {
			const nextPosition =
				sections.length > 0 ? Math.max(...sections.map((s) => s.position)) + 1 : 1;

			const response = await fetch(`/api/worksheets/${worksheetId}/sections`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newSectionTitle.trim(),
					instructions: newSectionInstructions.trim() || null,
					position: nextPosition
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la création');
			}

			const data = await response.json();
			setSections([...sections, data.section]);

			toaster.success('Section créée');
			cancelAdd();
		} catch (err) {
			console.error('Error creating section:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la création');
		} finally {
			isSubmitting = false;
		}
	}

	function startEdit(section: WorksheetSectionRow) {
		editingSectionId = section.id;
		editTitle = section.title;
		editInstructions = section.instructions || '';
		editTitleEn = section.translations?.en?.title ?? '';
		editInstructionsEn = section.translations?.en?.instructions ?? '';
	}

	function cancelEdit() {
		editingSectionId = null;
		editTitle = '';
		editInstructions = '';
		editTitleEn = '';
		editInstructionsEn = '';
	}

	/**
	 * Les traductions de la section, ou `null` si rien n'est traduit.
	 *
	 * Jamais de conteneur vide : une section dont on a tapé puis effacé les
	 * champs anglais doit rester indiscernable d'une section jamais traduite.
	 */
	function sectionTranslations(): RowTranslations | null {
		const en: RowTranslations['en'] = {};
		if (editTitleEn.trim()) en.title = editTitleEn.trim();
		if (editInstructionsEn.trim()) en.instructions = editInstructionsEn.trim();
		return Object.keys(en).length > 0 ? { en } : null;
	}

	async function saveEdit() {
		// Lu AVANT l'appel : un clic sur le crayon d'une autre section pendant
		// l'enregistrement remplacerait sinon la mauvaise section.
		const sectionId = editingSectionId;
		if (!sectionId || !editTitle.trim()) {
			toaster.error('Le titre est requis');
			return;
		}

		isSavingEdit = true;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/sections/${sectionId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: editTitle.trim(),
					instructions: editInstructions.trim() || null,
					translations: sectionTranslations()
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la mise à jour');
			}

			const data = await response.json();
			setSections(sections.map((s) => (s.id === sectionId ? data.section : s)));

			toaster.success('Section mise à jour');
			cancelEdit();
		} catch (err) {
			console.error('Error updating section:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
		} finally {
			isSavingEdit = false;
		}
	}

	function confirmDeleteSection(sectionId: string) {
		deletingSectionId = sectionId;
		deleteSectionOpen = true;
	}

	async function deleteSection() {
		const sectionId = deletingSectionId;
		if (!sectionId) return;

		isDeletingSection = true;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/sections/${sectionId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la suppression');
			}

			// Comme le serveur : les corvées de la section passent dans « Sans section »
			setExercises(
				exercises.map((x) => (x.section_id === sectionId ? { ...x, section_id: null } : x))
			);
			setSections(sections.filter((s) => s.id !== sectionId));

			toaster.success('Section supprimée');
		} catch (err) {
			console.error('Error deleting section:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
		} finally {
			isDeletingSection = false;
			deletingSectionId = null;
			deleteSectionOpen = false;
		}
	}

	// ===== Corvées : retirer, indispensable, cadres =====

	function confirmDeleteExercise(exerciseId: string) {
		deletingExerciseId = exerciseId;
		deleteConfirmOpen = true;
	}

	async function deleteExercise() {
		if (!deletingExerciseId) return;

		isDeleting = true;

		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/exercises/${deletingExerciseId}`,
				{
					method: 'DELETE'
				}
			);

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la suppression');
			}

			const newExercises = exercises.filter((e) => e.id !== deletingExerciseId);
			onExercisesChange?.(newExercises);

			toaster.success(`${CORVEE} retirée de la feuille`);
		} catch (err) {
			console.error('Error deleting exercise:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
		} finally {
			isDeleting = false;
			deletingExerciseId = null;
			deleteConfirmOpen = false;
		}
	}

	/**
	 * Lignes des cadres d'un exercice changées (optimiste, ou retour arrière)
	 */
	function handleFrameLinesChange(exerciseId: string, lines: AnswerFrameLines | null) {
		exercises = exercises.map((e) =>
			e.id === exerciseId ? { ...e, answer_frame_lines: lines } : e
		);
		onExercisesChange?.(exercises);
	}

	/** Bascule « indispensable » d'une corvée (optimiste). */
	async function toggleEssential(exercise: WorksheetExerciseWithExercise) {
		if (readonly || togglingEssentialIds.has(exercise.id)) return;

		const newValue = !exercise.is_essential;
		togglingEssentialIds.add(exercise.id);

		// Optimiste : affichage immédiat, et la page est prévenue
		exercises = exercises.map((e) => (e.id === exercise.id ? { ...e, is_essential: newValue } : e));
		onExercisesChange?.(exercises);

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/exercises/${exercise.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_essential: newValue })
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la mise a jour');
			}

			toaster.success(newValue ? `${CORVEE} marquée indispensable` : `${CORVEE} non indispensable`);
		} catch (err) {
			console.error('Error toggling essential:', err);
			// Retour arrière de CE champ seulement : un réglage fait entre-temps
			// (cadres de réponse) reste à l'écran
			exercises = exercises.map((e) =>
				e.id === exercise.id ? { ...e, is_essential: !newValue } : e
			);
			onExercisesChange?.(exercises);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la mise a jour');
		} finally {
			togglingEssentialIds.delete(exercise.id);
		}
	}
</script>

{#snippet exerciseRow(exercise: WorksheetExerciseWithExercise)}
	<div class="group flex items-center gap-2 rounded-md border bg-card p-2 hover:bg-muted/50">
		{#if !readonly}
			<div class="cursor-grab text-muted-foreground">
				<GripVertical class="h-4 w-4" />
			</div>
		{/if}

		<!-- Étoile indispensable (lecture seule) -->
		{#if readonly && exercise.is_essential}
			<Star class="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
		{/if}

		<!-- Numéro continu, celui de la fiche imprimée -->
		<div
			class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
		>
			{numberById.get(exercise.id)}
		</div>

		<div class="min-w-0 flex-1">
			<span class="truncate font-medium">
				{exercise.exercise?.title || '(Sans titre)'}
			</span>
		</div>

		<div class="shrink-0 text-sm text-muted-foreground">
			{exercise.points ?? '-'} pts
		</div>

		<!-- Édition de l'exercice lui-même (même onglet, retour à la fiche) :
		     aussi sur une fiche publiée, car on corrige toujours un exercice -->
		<Button
			variant="ghost"
			size="icon"
			class="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
			href={exerciseEditHref(exercise.exercise_id, worksheetId)}
			aria-label="Modifier la {CORVEE}"
			title="Modifier la {CORVEE}"
		>
			<Pencil class="h-3 w-3" />
		</Button>

		{#if !readonly}
			<!-- Étoile : toujours visible si indispensable, au survol sinon -->
			<Button
				variant="ghost"
				size="icon"
				class="h-7 w-7 transition-opacity {exercise.is_essential
					? 'text-amber-500 opacity-100 hover:bg-amber-50 hover:text-amber-600'
					: 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-amber-500'}"
				onclick={() => toggleEssential(exercise)}
				disabled={togglingEssentialIds.has(exercise.id)}
				aria-label={exercise.is_essential ? 'Retirer indispensable' : 'Marquer indispensable'}
			>
				<Star class="h-3.5 w-3.5 {exercise.is_essential ? 'fill-current' : ''}" />
			</Button>
			<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={() => onEditExercise?.(exercise)}
					aria-label="Configurer"
				>
					<Settings2 class="h-3 w-3" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
					onclick={() => confirmDeleteExercise(exercise.id)}
					aria-label="Retirer"
				>
					<Trash2 class="h-3 w-3" />
				</Button>
			</div>
		{/if}
	</div>
	{#if answersOnSheet}
		<AnswerFrameLinesEditor
			{worksheetId}
			{exercise}
			mode={answerFrameMode}
			{language}
			{readonly}
			saveDelayMs={frameSaveDelayMs}
			onchange={(lines) => handleFrameLinesChange(exercise.id, lines)}
		/>
	{/if}
{/snippet}

<!--
	La zone de dépose des corvées d'une section (`null` = « Sans section »).
	⚠️ `dndzone` prend chaque enfant DIRECT pour un élément déplaçable : le
	message « zone vide » est donc posé par-dessus, hors de la zone.
-->
{#snippet exerciseZone(sectionId: string | null)}
	{@const items = zoneItems(sectionId)}
	<div class="relative">
		<div
			class="flex min-h-12 flex-col gap-1 rounded-lg p-1"
			data-zone={zoneKey(sectionId)}
			aria-label="{CORVEE}s de {sectionId
				? (sectionById.get(sectionId)?.title ?? 'la section')
				: '« Sans section »'}"
			use:dndzone={{
				items,
				type: 'worksheet-exercise',
				flipDurationMs: FLIP_MS,
				dragDisabled: readonly || isSaving,
				dropTargetStyle: { outline: '2px dashed var(--color-ring)', outlineOffset: '2px' }
			}}
			onconsider={(e: CustomEvent<DndEvent<ZoneItem>>) => exercisesConsider(sectionId, e)}
			onfinalize={(e: CustomEvent<DndEvent<ZoneItem>>) => exercisesFinalize(sectionId, e)}
		>
			{#each items as item (dndKey(item))}
				{@const exercise = exerciseById.get(item.id)}
				<div
					animate:flip={{ duration: FLIP_MS }}
					class={isShadow(item) ? 'opacity-40' : ''}
					aria-label="{CORVEE} {exercise?.exercise?.title || 'sans titre'}"
				>
					{#if exercise}
						{@render exerciseRow(exercise)}
					{:else}
						<div class="h-11 rounded-md border border-dashed"></div>
					{/if}
				</div>
			{/each}
		</div>
		{#if items.length === 0}
			<p
				class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
			>
				{readonly ? `Aucune ${corvee}` : `Déposer une ${corvee} ici`}
			</p>
		{/if}
	</div>
{/snippet}

{#snippet sectionEditForm(section: WorksheetSectionRow)}
	<div class="space-y-3">
		<div class="space-y-2">
			<Label for="edit-title-{section.id}">Titre</Label>
			<Input id="edit-title-{section.id}" bind:value={editTitle} />
		</div>
		<div class="space-y-2">
			<Label for="edit-instructions-{section.id}">Instructions</Label>
			<Textarea id="edit-instructions-{section.id}" bind:value={editInstructions} rows={2} />
		</div>
		{#if isEnglishWorksheet}
			<div class="space-y-2">
				<Label for="edit-title-en-{section.id}">Titre anglais</Label>
				<Input
					id="edit-title-en-{section.id}"
					bind:value={editTitleEn}
					placeholder="Vide : le titre français est utilisé"
				/>
			</div>
			<div class="space-y-2">
				<Label for="edit-instructions-en-{section.id}">Instructions anglaises</Label>
				<Textarea
					id="edit-instructions-en-{section.id}"
					bind:value={editInstructionsEn}
					rows={2}
					placeholder="Vide : les instructions françaises sont utilisées"
				/>
			</div>
		{/if}
		<div class="flex justify-end gap-2">
			<Button variant="outline" size="sm" onclick={cancelEdit} disabled={isSavingEdit}>
				<X class="mr-1 h-3 w-3" />
				Annuler
			</Button>
			<Button size="sm" onclick={saveEdit} disabled={isSavingEdit || !editTitle.trim()}>
				{#if isSavingEdit}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<Save class="mr-1 h-3 w-3" />
				{/if}
				Enregistrer
			</Button>
		</div>
	</div>
{/snippet}

{#snippet sectionBlock(section: WorksheetSectionRow)}
	{@const isEditing = editingSectionId === section.id}
	<div class="rounded-lg border" data-section={section.id}>
		<!--
			Toute la section se déplace (en-tête, marges) ; prendre une corvée ne
			l'emporte pas : la zone des corvées garde ses propres gestes
			(`stopPropagation` de la bibliothèque).
		-->
		<div
			class="group flex items-start gap-2 rounded-t-lg bg-muted/40 px-3 py-2 {isEditing
				? 'bg-primary/5'
				: ''} {!readonly && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''}"
		>
			{#if !readonly}
				<GripVertical class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			{/if}
			<div class="min-w-0 flex-1">
				{#if isEditing}
					{@render sectionEditForm(section)}
				{:else}
					<h4 class="font-medium">
						<span data-section-title>{section.title}</span>
						<span class="ml-1 text-xs font-normal text-muted-foreground"
							>({exerciseCount(section.id)})</span
						>
					</h4>
					{#if section.instructions}
						<p class="mt-0.5 text-sm text-muted-foreground">{section.instructions}</p>
					{/if}
				{/if}
			</div>
			{#if !readonly && !isEditing}
				<div
					class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
				>
					<Button
						variant="ghost"
						size="icon"
						class="h-7 w-7"
						onclick={() => startEdit(section)}
						aria-label="Modifier la section {section.title}"
					>
						<Pencil class="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
						onclick={() => confirmDeleteSection(section.id)}
						aria-label="Supprimer la section {section.title}"
					>
						<Trash2 class="h-3 w-3" />
					</Button>
				</div>
			{/if}
		</div>
		<div class="p-2">
			{@render exerciseZone(section.id)}
		</div>
	</div>
{/snippet}

<Card.Root>
	<Card.Header>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<Card.Title>{CORVEE}s</Card.Title>
				<Card.Description>
					{exercises.length}
					{CORVEE}(s) dans cette feuille
					{#if isSaving}
						<span class="ml-2 inline-flex items-center text-primary">
							<Loader2 class="mr-1 h-3 w-3 animate-spin" />
							Sauvegarde...
						</span>
					{/if}
				</Card.Description>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#if !readonly}
					<Button variant="outline" onclick={openAddForm} disabled={isAdding}>
						<Plus class="mr-2 h-4 w-4" />
						Ajouter une section
					</Button>
				{/if}
				{@render actions?.()}
			</div>
		</div>
	</Card.Header>
	<Card.Content class="space-y-3">
		{#if exercises.length === 0 && sections.length === 0 && !isAdding}
			<div class="py-8 text-center text-muted-foreground">
				<p>Aucune {CORVEE} dans cette feuille</p>
				{#if !readonly}
					<p class="mt-1 text-sm">
						Utilisez "Ajouter des {CORVEE}s" pour commencer
					</p>
				{/if}
			</div>
		{:else}
			<!-- Les sections, déplaçables avec leurs corvées -->
			<div
				class="space-y-3"
				data-zone="sections"
				aria-label="Sections de la feuille"
				use:dndzone={{
					items: sectionZoneItems,
					type: 'worksheet-section',
					flipDurationMs: FLIP_MS,
					dragDisabled: readonly || isSaving || editingSectionId !== null,
					dropTargetStyle: {}
				}}
				onconsider={sectionsConsider}
				onfinalize={sectionsFinalize}
			>
				{#each sectionZoneItems as item (dndKey(item))}
					{@const section = sectionById.get(item.id)}
					<div
						animate:flip={{ duration: FLIP_MS }}
						class={isShadow(item) ? 'opacity-40' : ''}
						aria-label="Section {section?.title ?? ''}"
					>
						{#if section}
							{@render sectionBlock(section)}
						{:else}
							<div class="h-16 rounded-lg border border-dashed"></div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Nouvelle section : elle arrive en dernier, avant « Sans section » -->
			{#if isAdding}
				<div class="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4">
					<h4 class="mb-3 font-medium">Nouvelle section</h4>
					<div class="space-y-3">
						<div class="space-y-2">
							<Label for="new-section-title">Titre *</Label>
							<Input
								id="new-section-title"
								bind:value={newSectionTitle}
								placeholder="Titre de la section"
							/>
						</div>
						<div class="space-y-2">
							<Label for="new-section-instructions">Instructions (optionnel)</Label>
							<Textarea
								id="new-section-instructions"
								bind:value={newSectionInstructions}
								placeholder="Instructions pour cette section..."
								rows={2}
							/>
						</div>
						<div class="flex justify-end gap-2">
							<Button variant="outline" size="sm" onclick={cancelAdd} disabled={isSubmitting}>
								Annuler
							</Button>
							<Button
								size="sm"
								onclick={createSection}
								disabled={isSubmitting || !newSectionTitle.trim()}
							>
								{#if isSubmitting}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Créer
							</Button>
						</div>
					</div>
				</div>
			{/if}

			<!-- « Sans section » : toujours en dernier, ni déplaçable ni modifiable -->
			{#if sections.length > 0}
				<div class="rounded-lg border border-dashed">
					<h4 class="px-3 pt-2 text-sm font-medium text-muted-foreground">
						<span data-section-title>Sans section</span>
						<span class="ml-1 text-xs">({exerciseCount(null)})</span>
					</h4>
					<div class="p-2">
						{@render exerciseZone(null)}
					</div>
				</div>
			{:else}
				{@render exerciseZone(null)}
			{/if}
		{/if}
	</Card.Content>
</Card.Root>

<ConfirmDialog
	bind:open={deleteSectionOpen}
	title="Supprimer la section"
	description={deleteSectionDescription}
	confirmLabel={isDeletingSection ? 'Suppression...' : 'Supprimer'}
	onConfirm={deleteSection}
	onCancel={() => (deletingSectionId = null)}
/>

<ConfirmDialog
	bind:open={deleteConfirmOpen}
	title="Retirer la {CORVEE}"
	description="La {CORVEE} sera retirée de la feuille mais restera disponible dans la base de {CORVEE}s."
	confirmLabel={isDeleting ? 'Suppression...' : 'Retirer'}
	onConfirm={deleteExercise}
	onCancel={() => (deletingExerciseId = null)}
/>
