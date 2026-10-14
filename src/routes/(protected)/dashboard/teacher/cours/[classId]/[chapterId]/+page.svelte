<script lang="ts">
	import { lore } from '$lib/config/lore';
	/**
	 * Le chapitre, vu par le professeur
	 * ==================================
	 *
	 * Le PLAN est le seul écran. L'axe de rangement est le MOMENT du cours
	 * (« Préparation », « Le cours »…), pas le type de ressource : les onglets
	 * par type ont disparu, et tout ce qu'ils portaient vit désormais dans le
	 * plan — ajouter depuis une section, publier, supprimer, ouvrir un document,
	 * corriger un objectif.
	 *
	 * Les BOÎTES DE DIALOGUE d'ajout vivent dans `ChapterAddDialogs` (partagé avec
	 * la page du modèle) : la page leur passe les exercices et les fiches
	 * disponibles, et porte les actions de formulaire ; l'éditeur de sections ne
	 * fait que désigner la cible via `onAdd`.
	 *
	 * ⚠️ Rattacher une fiche ne la DISTRIBUE pas — mais la PUBLIER, si. Voir
	 * `PublicationToggle`.
	 *
	 * La progression des élèves n'est pas une ressource : elle ne se range dans
	 * aucune section, d'où sa place à part sous le plan.
	 *
	 * Chapitre lié (ADR 0029) : le contenu du modèle y est RELIÉ, marqué
	 * « Modèle » dans le plan ; il se masque au lieu de se supprimer. Détacher
	 * copie ce contenu dans le chapitre, après confirmation.
	 */

	import { applyAction, enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		ChapterAddDialogs,
		ChapterSectionsEditor,
		StudentProgressTable
	} from '$lib/components/cours/teacher';
	import { ChapterTemplateIndicator } from '$lib/components/templates';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getChapterColorClasses } from '$lib/types/chapters';
	import { BookMarked, Copy, Eye, EyeOff } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let showCreateTemplateDialog = $state(false);
	let showDetachDialog = $state(false);
	let isSubmitting = $state(false);

	/** Les boîtes d'ajout (objectif, exercice, fiche, série, document). */
	let addDialogs: ReturnType<typeof ChapterAddDialogs> | undefined = $state();

	/** Titre du futur modèle, pré-rempli avec celui du chapitre. */
	let templateTitle = $state('');
	let templateDescription = $state('');

	// Chapter color
	let colorClasses = $derived(
		getChapterColorClasses(data.chapter.color as Parameters<typeof getChapterColorClasses>[0])
	);

	// Content counts
	let documentCount = $derived(data.documents.length);
	let checklistCount = $derived(data.checklistItems.length);
	let exerciseCount = $derived(data.exercises.length);
	let worksheetCount = $derived(data.worksheets.length);

	/**
	 * Un chapitre sans contenu ne fait pas un modèle : le serveur refuse de
	 * publier un modèle vide, autant ne pas le laisser créer.
	 *
	 * ⚠️ Les séries n'y comptent PAS (Q128) : un modèle ne les emporte pas, donc
	 * un chapitre qui n'a que des séries donnerait un modèle vide — même règle
	 * que `hasContent(snapshot)` de `chapter-templates.ts`.
	 */
	let hasContent = $derived(documentCount + checklistCount + exerciseCount + worksheetCount > 0);

	// Handle form results
	$effect(() => {
		if (form?.success) {
			const actionMessages: Record<string, string> = {
				addChecklistItem: 'Objectif ajouté',
				updateChecklistItem: 'Objectif mis à jour',
				deleteChecklistItem: 'Objectif supprimé',
				linkExercise: `${lore.learning.exercise} liée`,
				unlinkExercise: `${lore.learning.exercise} retirée`,
				linkWorksheet: 'Fiche rattachée au chapitre',
				unlinkWorksheet: 'Fiche retirée du chapitre',
				linkSeries: 'Série ajoutée au chapitre',
				unlinkSeries: 'Série retirée du chapitre',
				setSeriesForm: 'Forme de la série modifiée',
				addGoogleDriveDocument: 'Document Google Drive ajouté',
				deleteDocument: 'Document supprimé',
				detachFromTemplate: 'Chapitre détaché du modèle : son contenu est maintenant le sien',
				// `setHidden` rend « hide »/« unhide » (élément du modèle, ADR 0029).
				hide: 'Élément masqué dans ce chapitre',
				unhide: 'Élément réaffiché — toujours préparé',
				// `setPublication` rend « publish »/« unpublish », pas son propre
				// nom : sans ces deux lignes, publier disait « Operation reussie ».
				publish: 'Contenu publié — visible par les élèves',
				unpublish: 'Contenu retiré — de nouveau préparé'
			};
			const message = actionMessages[form.action] || 'Opération réussie';

			// ⚠️ Créé, mais PAS rangé. La ressource existe — la création n'a pas
			// échoué — seulement elle a atterri en « Non classé » au lieu de la
			// section visée. Le taire laisserait le professeur la chercher là où
			// il a cliqué.
			if (form.placed === false) {
				toaster.warning(`${message}, mais rangé en « Non classé » — glisse-le dans sa section.`);
			} else {
				toaster.success(message);
			}

			// Q129 (b) : rattachée quand même, mais le professeur doit le savoir.
			if ('warning' in form && typeof form.warning === 'string') {
				toaster.warning(form.warning);
			}

			invalidateAll();
		} else if (form?.error) {
			toaster.error(form.error);
		}
		isSubmitting = false;
	});

	// Navigating state (reserved for future loading indicators)
	let _isNavigating = $derived(!!$navigating);

	// Le formulaire caché de « Détacher du modèle », envoyé après confirmation.
	let detachForm: HTMLFormElement | undefined = $state();

	function confirmerDetachement() {
		detachForm?.requestSubmit();
	}
</script>

<svelte:head>
	<title>{data.chapter.title} - Édition | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-6">
	<BackLink
		href={data.classData
			? `/dashboard/teacher/cours/${data.classData.id}`
			: '/dashboard/teacher/cours'}
		label={data.classData ? `Retour à ${data.classData.name}` : 'Retour aux cours'}
	/>

	<!-- Chapter Header -->
	<Card.Root class="mb-6 {colorClasses.border} border-2">
		<Card.Header class={colorClasses.bg}>
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-center gap-3">
					<BookMarked class="h-8 w-8 {colorClasses.text}" />
					<div>
						<Card.Title class="text-2xl"
							><h1 class="text-2xl! leading-none!">{data.chapter.title}</h1></Card.Title
						>
						{#if data.chapter.description}
							<Card.Description class="mt-1">
								{data.chapter.description}
							</Card.Description>
						{/if}
						<!-- Template indicator -->
						{#if data.templateInstantiation}
							<div class="mt-2">
								<ChapterTemplateIndicator
									instantiation={data.templateInstantiation}
									onDetach={() => (showDetachDialog = true)}
								/>
							</div>
						{/if}
					</div>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<!--
						Faire un modèle de ce chapitre : c'est le seul chemin qui
						remplit un modèle, le contenu y entre par capture.
					-->
					<Button
						variant="outline"
						size="sm"
						disabled={!hasContent}
						onclick={() => {
							templateTitle = data.chapter.title;
							templateDescription = data.chapter.description ?? '';
							showCreateTemplateDialog = true;
						}}
						title={hasContent
							? 'Créer un modèle réutilisable à partir de ce chapitre'
							: 'Ajoutez du contenu au chapitre avant d’en faire un modèle'}
					>
						<Copy class="mr-2 h-4 w-4" />
						Faire un modèle
					</Button>

					<Badge
						variant={data.chapter.isVisible ? 'default' : 'secondary'}
						class="flex items-center gap-1"
					>
						{#if data.chapter.isVisible}
							<Eye class="h-3 w-3" />
							Visible
						{:else}
							<EyeOff class="h-3 w-3" />
							Invisible des élèves
						{/if}
					</Badge>
				</div>
			</div>
		</Card.Header>
	</Card.Root>

	<!--
		Le PLAN du chapitre : on y ajoute, on y range, on y publie et on y
		supprime. C'est le seul endroit — il n'y a plus d'onglets par type.
	-->
	<section class="mb-8 space-y-3">
		<div>
			<h2 class="text-xl font-semibold">Plan du chapitre</h2>
			<p class="text-sm text-muted-foreground">
				Ajoutez chaque ressource dans la section où elle intervient, et déplacez-la au
				glisser-déposer. Les sections se renomment, se réordonnent, s'ajoutent et se suppriment —
				supprimer une section ne supprime jamais ses ressources.
			</p>
		</div>

		<ChapterSectionsEditor
			chapterId={data.chapter.id}
			sections={data.sections}
			documents={data.documents}
			exercises={data.exercises}
			checklistItems={data.checklistItems}
			worksheets={data.worksheets}
			chapterSeries={data.chapterSeries}
			exerciseDetails={data.exerciseDetails}
			distributedWorksheetIds={data.distributedWorksheetIds}
			onAdd={(kind, sectionId) => addDialogs?.ouvrirAjout(kind, sectionId)}
			onEditChecklistItem={(item) => addDialogs?.modifierObjectif(item)}
		/>
	</section>

	<!--
		La progression n'est pas une ressource du chapitre : elle ne se range dans
		aucune section, et c'est pourquoi elle vit ici, sous le plan, plutôt que
		dedans.
	-->
	<section class="space-y-3">
		<div>
			<h2 class="text-xl font-semibold">Progression des {lore.entities.student}s</h2>
			<p class="text-sm text-muted-foreground">
				Où en est chacun sur les objectifs publiés de ce chapitre.
			</p>
		</div>
		<StudentProgressTable
			students={data.students}
			checklistItems={data.checklistItems}
			progress={data.checklistProgress}
		/>
	</section>
</main>

<!-- Faire un modèle de ce chapitre -->
<Dialog.Root bind:open={showCreateTemplateDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Faire un modèle de ce chapitre</Dialog.Title>
			<Dialog.Description>
				Le contenu du chapitre est copié dans le modèle, fichiers compris.
				{#if data.templateInstantiation && !data.templateInstantiation.isDetached}
					Ce chapitre reste lié à son modèle actuel.
				{:else}
					Ce chapitre devient ensuite un chapitre lié au nouveau modèle, sans que ses publications
					changent.
				{/if}
				Le modèle naît en brouillon, et rien n'est distribué aux élèves.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/createTemplate"
			use:enhance={() => {
				isSubmitting = true;

				return async ({ result }) => {
					isSubmitting = false;

					// Ce formulaire quitte la page : laisser l'effet global le
					// traiter lancerait un rechargement de la page courante en même
					// temps que la navigation, et les deux se bloqueraient.
					if (result.type === 'success' && result.data?.templateId) {
						showCreateTemplateDialog = false;
						toaster.success('Modèle créé à partir de ce chapitre');
						await goto(`/dashboard/teacher/contenu/templates/${result.data.templateId}`);
						return;
					}

					await applyAction(result);
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="template-title">Titre du modèle</Label>
				<Input
					id="template-title"
					name="title"
					bind:value={templateTitle}
					maxlength={200}
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="template-description">Description (facultative)</Label>
				<Textarea
					id="template-description"
					name="description"
					bind:value={templateDescription}
					maxlength={2000}
					rows={3}
				/>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showCreateTemplateDialog = false)}>
					Annuler
				</Button>
				<Button type="submit" disabled={isSubmitting || !templateTitle.trim()}>
					{isSubmitting ? 'Création...' : 'Créer le modèle'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<ChapterAddDialogs
	bind:this={addDialogs}
	chapterId={data.chapter.id}
	supabase={data.supabase}
	availableExercises={data.availableExercises}
	availableWorksheets={data.availableWorksheets}
	availableSeries={data.availableSeries}
	takenExerciseIds={data.exercises.map((e) => e.exerciseId)}
	takenWorksheetIds={data.worksheets.map((w) => w.worksheetId)}
	takenSeriesIds={data.chapterSeries.map((cs) => cs.seriesId)}
	onDocumentAdded={() => invalidateAll()}
/>

<!--
	Détacher du modèle : le contenu relié est COPIÉ dans le chapitre (fichiers
	compris), qui ne suivra plus le modèle. La confirmation le dit, avant.
-->
{#if data.templateInstantiation && !data.templateInstantiation.isDetached}
	<ConfirmDialog
		bind:open={showDetachDialog}
		title="Détacher ce chapitre du modèle ?"
		description="Le contenu du modèle est copié dans ce chapitre, fichiers compris, avec ses publications, ses sections et son ordre : les élèves ne perdent rien. Le chapitre ne suivra plus le modèle : une correction du modèle n'y arrivera plus. Les éléments masqués reviennent dans le plan, non publiés."
		confirmLabel="Détacher"
		variant="default"
		onConfirm={confirmerDetachement}
	/>

	<form
		bind:this={detachForm}
		method="POST"
		action="?/detachFromTemplate"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
			};
		}}
		class="hidden"
	></form>
{/if}
