<!--
	ChapterSectionsEditor
	=====================

	Range les ressources d'un chapitre par MOMENT du cours (« Préparation »,
	« Le cours »…) plutôt que par type. Une section accueille les cinq types
	côte à côte.

	⚠️ L'ordre à l'intérieur d'une section est porté par `sectionOrder`, et NON
	par `displayOrder` : ce dernier reste l'ordre par type, et les cinq types
	vivent dans cinq tables. Seul `sectionOrder` les range ensemble.

	Le réordonnancement se fait par boutons ↑/↓ et non par glisser-déposer :
	c'est l'idiome du dépôt (cf. ChecklistEditor), ça marche au doigt comme au
	clavier, et ça reste testable.

	@module components/cours/teacher/ChapterSectionsEditor
-->
<script lang="ts">
	import type {
		ChapterSection,
		ChapterDocument,
		ChapterExercise,
		ChapterChecklistItem,
		ChapterQuizQuestion,
		ChapterWorksheet
	} from '$lib/types/chapters';
	import type { SectionContentKind } from '$lib/server/validation/chapter-sections';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, Check, X } from '@lucide/svelte';

	type WorksheetRow = ChapterWorksheet & { title: string | null; status: string | null };

	interface Props {
		chapterId: string;
		sections: ChapterSection[];
		documents: ChapterDocument[];
		exercises: ChapterExercise[];
		checklistItems: ChapterChecklistItem[];
		quizQuestions: ChapterQuizQuestion[];
		worksheets: WorksheetRow[];
		/** Titres des modèles de quiz, par identifiant de modèle. */
		questionTemplates?: Record<string, { title: string }>;
		/** Titres des exercices, par identifiant d'exercice. */
		exerciseDetails?: Record<string, { title: string | null }>;
	}

	let {
		chapterId,
		sections,
		documents,
		exercises,
		checklistItems,
		quizQuestions,
		worksheets,
		questionTemplates = {},
		exerciseDetails = {}
	}: Props = $props();

	/** Vue unifiée d'une ressource, tous types confondus. */
	type Ressource = {
		kind: SectionContentKind;
		id: string;
		label: string;
		typeLabel: string;
		sectionId: string | null;
		sectionOrder: number;
		publishedAt: string | null;
	};

	/** Sentinelle du sélecteur : « Non classé » n'est pas un identifiant. */
	const NON_CLASSE = '__non-classe__';

	let busy = $state(false);
	let editingSectionId = $state<string | null>(null);
	let editTitle = $state('');
	let isAddingSection = $state(false);
	let newSectionTitle = $state('');

	const sortedSections = $derived([...sections].sort((a, b) => a.displayOrder - b.displayOrder));

	const ressources = $derived<Ressource[]>([
		...documents.map((d) => ({
			kind: 'document' as const,
			id: d.id,
			label: d.title,
			typeLabel: 'Document',
			sectionId: d.sectionId,
			sectionOrder: d.sectionOrder,
			publishedAt: d.publishedAt
		})),
		...exercises.map((e) => ({
			kind: 'exercise' as const,
			id: e.id,
			// Un exercice sans titre reste un exercice : mieux vaut un repère que
			// une ligne vide que le professeur ne saura pas identifier.
			label: exerciseDetails[e.exerciseId]?.title ?? 'Exercice sans titre',
			typeLabel: 'Exercice',
			sectionId: e.sectionId,
			sectionOrder: e.sectionOrder,
			publishedAt: e.publishedAt
		})),
		...checklistItems.map((c) => ({
			kind: 'checklistItem' as const,
			id: c.id,
			label: c.content,
			typeLabel: 'Objectif',
			sectionId: c.sectionId,
			sectionOrder: c.sectionOrder,
			publishedAt: c.publishedAt
		})),
		...quizQuestions.map((q) => ({
			kind: 'quizQuestion' as const,
			id: q.id,
			label: questionTemplates[q.questionTemplateId]?.title ?? 'Question de quiz',
			typeLabel: 'Quiz',
			sectionId: q.sectionId,
			sectionOrder: q.sectionOrder,
			publishedAt: q.publishedAt
		})),
		...worksheets.map((w) => ({
			kind: 'worksheet' as const,
			id: w.id,
			label: w.title ?? 'Fiche sans titre',
			typeLabel: 'Fiche',
			sectionId: w.sectionId,
			sectionOrder: w.sectionOrder,
			publishedAt: w.publishedAt
		}))
	]);

	/**
	 * Les ressources d'une section, ordonnées. Le tri secondaire sur le libellé
	 * rend l'affichage stable : `section_order` vaut 0 par défaut, donc tout ce
	 * qui n'a jamais été rangé est à égalité.
	 */
	function ressourcesDe(sectionId: string | null): Ressource[] {
		return ressources
			.filter((r) => r.sectionId === sectionId)
			.sort((a, b) => a.sectionOrder - b.sectionOrder || a.label.localeCompare(b.label, 'fr'));
	}

	const nonClassees = $derived(ressourcesDe(null));

	const itemsDeSection = $derived([
		...sortedSections.map((s) => ({ value: s.id, label: s.title })),
		{ value: NON_CLASSE, label: 'Non classé' }
	]);

	async function appeler(url: string, init: RequestInit, echec: string): Promise<boolean> {
		busy = true;
		try {
			const reponse = await fetch(url, {
				headers: { 'Content-Type': 'application/json' },
				...init
			});

			if (!reponse.ok) {
				// Le serveur rend un message utile (« cette section n'appartient pas
				// à ce chapitre ») : le montrer plutôt qu'un texte générique.
				const corps = await reponse.json().catch(() => null);
				toaster.error(corps?.message ?? echec);
				return false;
			}

			await invalidateAll();
			return true;
		} catch {
			toaster.error(echec);
			return false;
		} finally {
			busy = false;
		}
	}

	async function ajouterSection() {
		const titre = newSectionTitle.trim();
		if (!titre) return;

		const ok = await appeler(
			`/api/teacher/chapters/${chapterId}/sections`,
			{ method: 'POST', body: JSON.stringify({ title: titre }) },
			'Impossible de créer la section'
		);

		if (ok) {
			newSectionTitle = '';
			isAddingSection = false;
			toaster.success('Section ajoutée');
		}
	}

	async function renommerSection(sectionId: string) {
		const titre = editTitle.trim();
		if (!titre) return;

		const ok = await appeler(
			`/api/teacher/chapters/${chapterId}/sections/${sectionId}`,
			{ method: 'PATCH', body: JSON.stringify({ title: titre }) },
			'Impossible de renommer la section'
		);

		if (ok) editingSectionId = null;
	}

	async function supprimerSection(sectionId: string) {
		const ok = await appeler(
			`/api/teacher/chapters/${chapterId}/sections/${sectionId}`,
			{ method: 'DELETE' },
			'Impossible de supprimer la section'
		);

		// Le message dit ce qui NE s'est pas passé : la crainte, ici, c'est de
		// perdre des ressources avec la section.
		if (ok) toaster.success('Section supprimée — ses ressources sont passées en « Non classé »');
	}

	async function deplacerSection(index: number, direction: -1 | 1) {
		const voisine = sortedSections[index + direction];
		const courante = sortedSections[index];
		if (!voisine || !courante) return;

		await appeler(
			`/api/teacher/chapters/${chapterId}/sections/reorder`,
			{
				method: 'POST',
				body: JSON.stringify({
					sections: [
						{ id: courante.id, displayOrder: voisine.displayOrder },
						{ id: voisine.id, displayOrder: courante.displayOrder }
					]
				})
			},
			'Impossible de réordonner les sections'
		);
	}

	async function ranger(ressource: Ressource, valeur: string) {
		const sectionId = valeur === NON_CLASSE ? null : valeur;
		if (sectionId === ressource.sectionId) return;

		// Placée en fin de section d'arrivée : sinon elle s'insérerait au hasard
		// au milieu de ressources déjà ordonnées.
		const arrivee = ressourcesDe(sectionId);
		const ordre = arrivee.length ? arrivee[arrivee.length - 1].sectionOrder + 1 : 0;

		await appeler(
			`/api/teacher/chapters/${chapterId}/sections/assign`,
			{
				method: 'POST',
				body: JSON.stringify({
					sectionId,
					items: [{ kind: ressource.kind, id: ressource.id, sectionOrder: ordre }]
				})
			},
			'Impossible de ranger la ressource'
		);
	}

	async function deplacerRessource(sectionId: string | null, index: number, direction: -1 | 1) {
		const liste = ressourcesDe(sectionId);
		const courante = liste[index];
		const voisine = liste[index + direction];
		if (!courante || !voisine) return;

		// ⚠️ Les deux ordres peuvent être ÉGAUX (0 par défaut) : un simple
		// échange ne changerait alors rien. On renumérote la liste entière, ce
		// qui est aussi l'occasion de la rendre déterministe une fois pour
		// toutes.
		const reordonnee = [...liste];
		reordonnee[index] = voisine;
		reordonnee[index + direction] = courante;

		await appeler(
			`/api/teacher/chapters/${chapterId}/sections/assign`,
			{
				method: 'POST',
				body: JSON.stringify({
					sectionId,
					items: reordonnee.map((r, i) => ({ kind: r.kind, id: r.id, sectionOrder: i }))
				})
			},
			'Impossible de réordonner les ressources'
		);
	}

	function commencerEdition(section: ChapterSection) {
		editingSectionId = section.id;
		editTitle = section.title;
	}
</script>

{#snippet listeRessources(sectionId: string | null)}
	{@const liste = ressourcesDe(sectionId)}
	{#if liste.length === 0}
		<p class="px-3 py-4 text-sm text-muted-foreground italic">
			Aucune ressource dans cette section.
		</p>
	{:else}
		<ul class="divide-y divide-border">
			{#each liste as ressource, index (ressource.kind + ressource.id)}
				<li class="flex items-center gap-2 px-3 py-2">
					<div class="flex flex-col">
						<Button
							variant="ghost"
							size="icon"
							class="h-5 w-5"
							disabled={busy || index === 0}
							aria-label="Monter {ressource.label}"
							onclick={() => deplacerRessource(sectionId, index, -1)}
						>
							<ChevronUp class="h-3 w-3" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							class="h-5 w-5"
							disabled={busy || index === liste.length - 1}
							aria-label="Descendre {ressource.label}"
							onclick={() => deplacerRessource(sectionId, index, 1)}
						>
							<ChevronDown class="h-3 w-3" />
						</Button>
					</div>

					<Badge variant="secondary" class="shrink-0">{ressource.typeLabel}</Badge>

					<span class="min-w-0 flex-1 truncate text-sm">{ressource.label}</span>

					{#if !ressource.publishedAt}
						<Badge variant="outline" class="shrink-0">Préparé</Badge>
					{/if}

					<div class="w-44 shrink-0">
						<MySelect
							type="single"
							value={ressource.sectionId ?? NON_CLASSE}
							items={itemsDeSection}
							onValueChange={(v: string) => ranger(ressource, v)}
						/>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<div class="space-y-4">
	{#each sortedSections as section, index (section.id)}
		<Card.Root>
			<Card.Header class="flex flex-row items-center gap-2 space-y-0">
				<div class="flex flex-col">
					<Button
						variant="ghost"
						size="icon"
						class="h-5 w-5"
						disabled={busy || index === 0}
						aria-label="Monter la section {section.title}"
						onclick={() => deplacerSection(index, -1)}
					>
						<ChevronUp class="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="h-5 w-5"
						disabled={busy || index === sortedSections.length - 1}
						aria-label="Descendre la section {section.title}"
						onclick={() => deplacerSection(index, 1)}
					>
						<ChevronDown class="h-3 w-3" />
					</Button>
				</div>

				{#if editingSectionId === section.id}
					<Input
						bind:value={editTitle}
						class="flex-1"
						aria-label="Titre de la section"
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === 'Enter') renommerSection(section.id);
							if (e.key === 'Escape') editingSectionId = null;
						}}
					/>
					<Button
						variant="ghost"
						size="icon"
						disabled={busy}
						aria-label="Valider le titre"
						onclick={() => renommerSection(section.id)}
					>
						<Check class="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Annuler"
						onclick={() => (editingSectionId = null)}
					>
						<X class="h-4 w-4" />
					</Button>
				{:else}
					<Card.Title class="flex-1 text-lg">{section.title}</Card.Title>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Renommer la section {section.title}"
						onclick={() => commencerEdition(section)}
					>
						<Pencil class="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						disabled={busy}
						aria-label="Supprimer la section {section.title}"
						onclick={() => supprimerSection(section.id)}
					>
						<Trash2 class="h-4 w-4 text-destructive" />
					</Button>
				{/if}
			</Card.Header>

			<Card.Content class="p-0 pb-3">
				{@render listeRessources(section.id)}
			</Card.Content>
		</Card.Root>
	{/each}

	<!--
		« Non classé » n'apparaît que s'il contient quelque chose : un chapitre
		bien rangé ne doit pas traîner une boîte vide en permanence.
	-->
	{#if nonClassees.length > 0}
		<Card.Root class="border-dashed">
			<Card.Header class="space-y-1">
				<Card.Title class="text-lg">Non classé</Card.Title>
				<Card.Description>
					Ces ressources ne sont dans aucune section. Les élèves les voient en fin de chapitre.
				</Card.Description>
			</Card.Header>
			<Card.Content class="p-0 pb-3">
				{@render listeRessources(null)}
			</Card.Content>
		</Card.Root>
	{/if}

	{#if isAddingSection}
		<div class="flex items-center gap-2">
			<Input
				bind:value={newSectionTitle}
				placeholder="Nom de la section"
				aria-label="Nom de la nouvelle section"
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter') ajouterSection();
					if (e.key === 'Escape') isAddingSection = false;
				}}
			/>
			<Button disabled={busy || !newSectionTitle.trim()} onclick={ajouterSection}>Ajouter</Button>
			<Button variant="ghost" onclick={() => (isAddingSection = false)}>Annuler</Button>
		</div>
	{:else}
		<Button variant="outline" onclick={() => (isAddingSection = true)}>
			<Plus class="mr-2 h-4 w-4" />
			Ajouter une section
		</Button>
	{/if}
</div>
