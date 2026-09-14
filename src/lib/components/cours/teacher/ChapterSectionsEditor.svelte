<!--
	ChapterSectionsEditor
	=====================

	Range les ressources d'un chapitre par MOMENT du cours (« Préparation »,
	« Le cours »…) plutôt que par type. Une section accueille les cinq types
	côte à côte, et tout se déplace au glisser-déposer.

	⚠️ L'ordre à l'intérieur d'une section est porté par `sectionOrder`, et NON
	par `displayOrder` : ce dernier reste l'ordre par type, et les cinq types
	vivent dans cinq tables. Seul `sectionOrder` les range ensemble.

	Modèle d'état, repris du kanban (`organisation/kanban/[boardId]`) :
	- l'état LOCAL est la source de vérité de l'affichage — le glisser-déposer
	  le mute directement, sans quoi le geste serait saccadé ;
	- chaque mutation prend un instantané avant d'appeler l'API, et le restaure
	  si l'appel échoue.

	Câblage svelte-dnd-action :
	- `onconsider` met à jour la liste visible PENDANT le geste ;
	- `onfinalize` valide la dépose → on renumérote et on persiste.
	- ⚠️ La bibliothèque injecte une copie « ombre » de l'élément tiré, avec le
	  MÊME identifiant : sans le suffixe dans la clé du `{#each}`, Svelte voit
	  deux éléments identiques. Et il faut TOUJOURS committer le dédoublonnage
	  au finalize, même sur une dépose sans effet, sinon l'ombre reste et
	  l'élément paraît grisé et intraînable.

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
	import {
		dndzone,
		SHADOW_PLACEHOLDER_ITEM_ID,
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		type DndEvent
	} from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { GripVertical, Pencil, Trash2, Plus, Check, X } from '@lucide/svelte';
	import { resolveDrop, type ZonesSnapshot } from './section-dnd';

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

	/**
	 * Vue unifiée d'une ressource.
	 *
	 * ⚠️ `id` est `kind:contentId` et non l'identifiant de la ligne :
	 * svelte-dnd-action exige un `id` unique DANS TOUTE la zone, or les cinq
	 * tables ont chacune leurs propres identifiants. `contentId` garde la vraie
	 * clé, celle que l'API attend.
	 */
	type Ressource = {
		id: string;
		kind: SectionContentKind;
		contentId: string;
		label: string;
		typeLabel: string;
		publishedAt: string | null;
	};

	type SectionLocale = {
		id: string;
		title: string;
		ressources: Ressource[];
	};

	const FLIP_MS = 200;

	// `Set` natif et non `SvelteSet` : il est local à cette fonction pure, jamais
	// lu de façon réactive. Le rendre réactif coûterait sans rien apporter —
	// `dedupeById` du kanban fait le même choix.
	function dedupeById<T extends { id: string }>(items: T[]): T[] {
		const vus = new Set<string>();
		const sortie: T[] = [];
		for (const item of items) {
			if (vus.has(item.id)) continue;
			vus.add(item.id);
			sortie.push(item);
		}
		return sortie;
	}

	function isDndShadow(item: { id: string }): boolean {
		return Boolean((item as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
	}

	function dndKey(item: { id: string }): string {
		return isDndShadow(item) ? `${item.id}_dnd-shadow` : item.id;
	}

	/** Toutes les ressources du chapitre, avec la section où elles sont rangées. */
	function toutesLesRessources(): { ressource: Ressource; sectionId: string | null }[] {
		return (
			[
				...documents.map((d) => ({
					sectionId: d.sectionId,
					ordre: d.sectionOrder,
					ressource: {
						id: `document:${d.id}`,
						kind: 'document' as const,
						contentId: d.id,
						label: d.title,
						typeLabel: 'Document',
						publishedAt: d.publishedAt
					}
				})),
				...exercises.map((e) => ({
					sectionId: e.sectionId,
					ordre: e.sectionOrder,
					ressource: {
						id: `exercise:${e.id}`,
						kind: 'exercise' as const,
						contentId: e.id,
						// Un exercice sans titre reste un exercice : mieux vaut un repère
						// qu'une ligne vide que le professeur ne saura pas identifier.
						label: exerciseDetails[e.exerciseId]?.title ?? 'Exercice sans titre',
						typeLabel: 'Exercice',
						publishedAt: e.publishedAt
					}
				})),
				...checklistItems.map((c) => ({
					sectionId: c.sectionId,
					ordre: c.sectionOrder,
					ressource: {
						id: `checklistItem:${c.id}`,
						kind: 'checklistItem' as const,
						contentId: c.id,
						label: c.content,
						typeLabel: 'Objectif',
						publishedAt: c.publishedAt
					}
				})),
				...quizQuestions.map((q) => ({
					sectionId: q.sectionId,
					ordre: q.sectionOrder,
					ressource: {
						id: `quizQuestion:${q.id}`,
						kind: 'quizQuestion' as const,
						contentId: q.id,
						label: questionTemplates[q.questionTemplateId]?.title ?? 'Question de quiz',
						typeLabel: 'Quiz',
						publishedAt: q.publishedAt
					}
				})),
				...worksheets.map((w) => ({
					sectionId: w.sectionId,
					ordre: w.sectionOrder,
					ressource: {
						id: `worksheet:${w.id}`,
						kind: 'worksheet' as const,
						contentId: w.id,
						label: w.title ?? 'Fiche sans titre',
						typeLabel: 'Fiche',
						publishedAt: w.publishedAt
					}
				}))
			]
				// Tri secondaire sur le libellé : `section_order` vaut 0 par défaut,
				// donc tout ce qui n'a jamais été rangé est à égalité.
				.sort(
					(a, b) => a.ordre - b.ordre || a.ressource.label.localeCompare(b.ressource.label, 'fr')
				)
				.map(({ ressource, sectionId }) => ({ ressource, sectionId }))
		);
	}

	function instantanerSections(): SectionLocale[] {
		const toutes = toutesLesRessources();
		return [...sections]
			.sort((a, b) => a.displayOrder - b.displayOrder)
			.map((s) => ({
				id: s.id,
				title: s.title,
				ressources: toutes.filter((r) => r.sectionId === s.id).map((r) => r.ressource)
			}));
	}

	function instantanerNonClassees(): Ressource[] {
		return toutesLesRessources()
			.filter((r) => r.sectionId === null)
			.map((r) => r.ressource);
	}

	// L'état local est la source de vérité de l'affichage pendant les gestes.
	// Il n'est PAS re-synchronisé depuis le serveur : chaque mutation persiste
	// et se restaure en cas d'échec, comme sur le kanban. Recharger pendant un
	// glisser rendrait le geste saccadé.
	let sectionsLocales = $state<SectionLocale[]>(instantanerSections());
	let nonClassees = $state<Ressource[]>(instantanerNonClassees());

	let busy = $state(false);
	let editingSectionId = $state<string | null>(null);
	let editTitle = $state('');
	let isAddingSection = $state(false);
	let newSectionTitle = $state('');

	async function appeler(url: string, init: RequestInit, echec: string): Promise<boolean> {
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

			return true;
		} catch {
			toaster.error(echec);
			return false;
		}
	}

	/** Persiste l'ordre d'une zone, en renumérotant de 0 à n. */
	async function persisterZone(sectionId: string | null, liste: Ressource[]): Promise<boolean> {
		if (liste.length === 0) return true;

		return appeler(
			`/api/teacher/chapters/${chapterId}/sections/assign`,
			{
				method: 'POST',
				body: JSON.stringify({
					sectionId,
					items: liste.map((r, i) => ({ kind: r.kind, id: r.contentId, sectionOrder: i }))
				})
			},
			'Impossible de ranger les ressources'
		);
	}

	// ===== Glisser-déposer : les ressources =====

	function poserZone(sectionId: string | null, liste: Ressource[]) {
		if (sectionId === null) {
			nonClassees = liste;
			return;
		}
		const section = sectionsLocales.find((s) => s.id === sectionId);
		if (section) section.ressources = liste;
	}

	function ressourcesConsider(sectionId: string | null, event: CustomEvent<DndEvent<Ressource>>) {
		poserZone(sectionId, dedupeById(event.detail.items));
	}

	async function ressourcesFinalize(
		sectionId: string | null,
		event: CustomEvent<DndEvent<Ressource>>
	) {
		// Instantané de TOUTES les zones avant mutation : un déplacement entre
		// sections en touche deux.
		const instantane = {
			sections: sectionsLocales.map((s) => ({ id: s.id, ressources: [...s.ressources] })),
			nonClassees: [...nonClassees]
		};

		const arrivee = dedupeById(event.detail.items);
		// TOUJOURS committer, même sur une dépose sans effet : sinon l'ombre du
		// `consider` précédent reste dans l'état et l'élément paraît grisé.
		poserZone(sectionId, arrivee);

		const deplaceId = event.detail.info.id;

		// La décision vit dans `section-dnd.ts`, où elle est testée sans avoir à
		// fabriquer d'événement de souris.
		const zones: ZonesSnapshot = {
			sections: instantane.sections.map((s) => ({ id: s.id, items: s.ressources })),
			unassigned: instantane.nonClassees
		};
		const issue = resolveDrop(zones, sectionId, arrivee, deplaceId);

		if (issue.kind === 'ignored') return;

		if (issue.kind === 'moved') {
			// La retirer de sa zone d'origine : la bibliothèque ne gère que la
			// zone qui reçoit.
			if (issue.from === null) {
				nonClassees = nonClassees.filter((r) => r.id !== deplaceId);
			} else {
				const source = sectionsLocales.find((s) => s.id === issue.from);
				if (source) source.ressources = source.ressources.filter((r) => r.id !== deplaceId);
			}
		}

		busy = true;
		const ok = await persisterZone(sectionId, arrivee);
		busy = false;

		if (!ok) {
			// Restauration : les deux zones concernées reviennent à l'instantané.
			sectionsLocales = sectionsLocales.map((s) => {
				const snap = instantane.sections.find((i) => i.id === s.id);
				return snap ? { ...s, ressources: snap.ressources } : s;
			});
			nonClassees = instantane.nonClassees;
		}
	}

	// ===== Glisser-déposer : les sections =====

	function sectionsConsider(event: CustomEvent<DndEvent<SectionLocale>>) {
		sectionsLocales = dedupeById(event.detail.items);
	}

	async function sectionsFinalize(event: CustomEvent<DndEvent<SectionLocale>>) {
		const instantane = [...sectionsLocales];
		const apres = dedupeById(event.detail.items);
		sectionsLocales = apres;

		const deplaceId = event.detail.info.id;
		const ancienIndex = instantane.findIndex((s) => s.id === deplaceId);
		const nouvelIndex = apres.findIndex((s) => s.id === deplaceId);
		if (nouvelIndex === -1 || ancienIndex === nouvelIndex) return;

		busy = true;
		const ok = await appeler(
			`/api/teacher/chapters/${chapterId}/sections/reorder`,
			{
				method: 'POST',
				body: JSON.stringify({
					sections: apres.map((s, i) => ({ id: s.id, displayOrder: i }))
				})
			},
			'Impossible de réordonner les sections'
		);
		busy = false;

		if (!ok) sectionsLocales = instantane;
	}

	// ===== Sections : créer, renommer, supprimer =====

	async function ajouterSection() {
		const titre = newSectionTitle.trim();
		if (!titre) return;

		busy = true;
		try {
			const reponse = await fetch(`/api/teacher/chapters/${chapterId}/sections`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: titre })
			});

			if (!reponse.ok) {
				const corps = await reponse.json().catch(() => null);
				toaster.error(corps?.message ?? 'Impossible de créer la section');
				return;
			}

			const { section } = await reponse.json();
			sectionsLocales = [
				...sectionsLocales,
				{ id: section.id, title: section.title, ressources: [] }
			];
			newSectionTitle = '';
			isAddingSection = false;
			toaster.success('Section ajoutée');
		} catch {
			toaster.error('Impossible de créer la section');
		} finally {
			busy = false;
		}
	}

	async function renommerSection(sectionId: string) {
		const titre = editTitle.trim();
		if (!titre) return;

		const section = sectionsLocales.find((s) => s.id === sectionId);
		if (!section) return;
		const ancienTitre = section.title;

		section.title = titre;
		editingSectionId = null;

		busy = true;
		const ok = await appeler(
			`/api/teacher/chapters/${chapterId}/sections/${sectionId}`,
			{ method: 'PATCH', body: JSON.stringify({ title: titre }) },
			'Impossible de renommer la section'
		);
		busy = false;

		if (!ok) section.title = ancienTitre;
	}

	async function supprimerSection(sectionId: string) {
		const instantaneSections = [...sectionsLocales];
		const instantaneNonClassees = [...nonClassees];

		const section = sectionsLocales.find((s) => s.id === sectionId);
		if (!section) return;

		// Ses ressources ne disparaissent PAS : elles retombent en « Non classé »,
		// exactement ce que fait `on delete set null (section_id)` en base.
		nonClassees = [...nonClassees, ...section.ressources];
		sectionsLocales = sectionsLocales.filter((s) => s.id !== sectionId);

		busy = true;
		const ok = await appeler(
			`/api/teacher/chapters/${chapterId}/sections/${sectionId}`,
			{ method: 'DELETE' },
			'Impossible de supprimer la section'
		);
		busy = false;

		if (ok) {
			// Le message dit ce qui NE s'est PAS passé : la crainte, ici, c'est de
			// perdre des ressources avec la section.
			toaster.success('Section supprimée — ses ressources sont passées en « Non classé »');
		} else {
			sectionsLocales = instantaneSections;
			nonClassees = instantaneNonClassees;
		}
	}

	function commencerEdition(section: SectionLocale) {
		editingSectionId = section.id;
		editTitle = section.title;
	}
</script>

{#snippet zoneRessources(sectionId: string | null, liste: Ressource[])}
	<div
		class="flex min-h-16 flex-col gap-1 px-3 py-2"
		use:dndzone={{
			items: liste,
			type: 'chapter-resource',
			flipDurationMs: FLIP_MS,
			dragDisabled: busy,
			dropTargetStyle: { outline: '2px dashed var(--color-ring)', outlineOffset: '4px' }
		}}
		onconsider={(e: CustomEvent<DndEvent<Ressource>>) => ressourcesConsider(sectionId, e)}
		onfinalize={(e: CustomEvent<DndEvent<Ressource>>) => ressourcesFinalize(sectionId, e)}
	>
		{#each liste as ressource (dndKey(ressource))}
			<div
				animate:flip={{ duration: FLIP_MS }}
				class="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5
					{ressource.id === SHADOW_PLACEHOLDER_ITEM_ID || isDndShadow(ressource) ? 'opacity-40' : ''}"
			>
				<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
				<Badge variant="secondary" class="shrink-0">{ressource.typeLabel}</Badge>
				<span class="min-w-0 flex-1 truncate text-sm">{ressource.label}</span>
				{#if !ressource.publishedAt}
					<Badge variant="outline" class="shrink-0">Préparé</Badge>
				{/if}
			</div>
		{/each}

		{#if liste.length === 0}
			<p class="py-3 text-center text-sm text-muted-foreground italic">
				Glissez une ressource ici.
			</p>
		{/if}
	</div>
{/snippet}

<div class="space-y-4">
	<div
		class="space-y-4"
		use:dndzone={{
			items: sectionsLocales,
			type: 'chapter-section',
			flipDurationMs: FLIP_MS,
			dragDisabled: busy || editingSectionId !== null,
			dropTargetStyle: { outline: '2px dashed var(--color-ring)', outlineOffset: '4px' }
		}}
		onconsider={sectionsConsider}
		onfinalize={sectionsFinalize}
	>
		{#each sectionsLocales as section (dndKey(section))}
			<div animate:flip={{ duration: FLIP_MS }}>
				<Card.Root class={isDndShadow(section) ? 'opacity-40' : ''}>
					<Card.Header class="flex flex-row items-center gap-2 space-y-0">
						<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />

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
						{@render zoneRessources(section.id, section.ressources)}
					</Card.Content>
				</Card.Root>
			</div>
		{/each}
	</div>

	<!--
		« Non classé » reste TOUJOURS affiché côté professeur, même vide : c'est
		une cible de dépose. La masquer quand elle est vide retirerait le seul
		endroit où sortir une ressource d'une section.
	-->
	<Card.Root class="border-dashed">
		<Card.Header class="space-y-1">
			<Card.Title class="text-lg">Non classé</Card.Title>
			<Card.Description>
				Ces ressources ne sont dans aucune section. Les élèves les voient en fin de chapitre.
			</Card.Description>
		</Card.Header>
		<Card.Content class="p-0 pb-3">
			{@render zoneRessources(null, nonClassees)}
		</Card.Content>
	</Card.Root>

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
