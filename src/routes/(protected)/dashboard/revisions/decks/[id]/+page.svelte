<script lang="ts">
	/**
	 * Deck Detail Page — gestion d'un deck personnel avec sections manuelles.
	 *
	 * Affiche les cartes regroupées par section (+ section "Non rangées" pour
	 * celles sans section_id). Permet CRUD sections + assignation d'une carte
	 * à une section.
	 */

	import { invalidateAll, goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		ChevronLeft,
		Plus,
		PlayCircle,
		Pencil,
		Trash2,
		BookOpen,
		FileText
	} from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';
	import type { DeckSection, DeckCardLite } from './+page.server';
	import { UNASSIGNED_KEY } from './constants';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// État local pour les dialogues
	let showCreateDialog = $state(false);
	let editingSection = $state<DeckSection | null>(null);
	let newName = $state('');
	let newDescription = $state('');
	let newOrder = $state(0);
	let busy = $state(false);

	// Options du select pour déplacer une carte
	const sectionOptions = $derived([
		{ value: UNASSIGNED_KEY, label: 'Non rangées' },
		...data.sections.map((s) => ({ value: s.id, label: s.name }))
	]);

	const isReadOnly = $derived(data.deck.isAssigned);

	const unassignedCards = $derived(data.cardsBySection[UNASSIGNED_KEY] ?? []);

	function openCreate() {
		editingSection = null;
		newName = '';
		newDescription = '';
		newOrder = data.sections.length;
		showCreateDialog = true;
	}

	function openEdit(section: DeckSection) {
		editingSection = section;
		newName = section.name;
		newDescription = section.description ?? '';
		newOrder = section.display_order;
		showCreateDialog = true;
	}

	async function saveSection() {
		if (!newName.trim()) {
			toaster.error('Le nom est requis.');
			return;
		}
		busy = true;
		try {
			const body = JSON.stringify({
				name: newName.trim(),
				description: newDescription.trim() || undefined,
				display_order: newOrder
			});
			const url = editingSection
				? `/api/srs/decks/${data.deck.id}/sections/${editingSection.id}`
				: `/api/srs/decks/${data.deck.id}/sections`;
			const method = editingSection ? 'PATCH' : 'POST';
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
				toaster.error(err.error ?? 'Erreur inconnue');
				return;
			}
			toaster.success(editingSection ? 'Section modifiée.' : 'Section créée.');
			showCreateDialog = false;
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function deleteSection(section: DeckSection) {
		if (!confirm(`Supprimer la section "${section.name}" ? Les cartes deviendront "Non rangées".`))
			return;
		busy = true;
		try {
			const res = await fetch(`/api/srs/decks/${data.deck.id}/sections/${section.id}`, {
				method: 'DELETE'
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
				toaster.error(err.error ?? 'Erreur inconnue');
				return;
			}
			toaster.success('Section supprimée.');
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function moveCard(card: DeckCardLite, newSectionKey: string) {
		const targetSectionId = newSectionKey === UNASSIGNED_KEY ? null : newSectionKey;
		if (card.sectionId === targetSectionId) return;
		busy = true;
		try {
			const res = await fetch(`/api/srs/cards/${card.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ section_id: targetSectionId })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
				toaster.error(err.error ?? 'Erreur inconnue');
				return;
			}
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	function cardLabel(c: DeckCardLite): string {
		if (c.cardType === 'template') return c.templateSubdomain || 'Variation sans nom';
		return 'Carte personnalisée';
	}

	function startStudy() {
		goto(`/dashboard/revisions/decks/${data.deck.id}/study`).then(() => {});
	}
</script>

<svelte:head>
	<title>{data.deck.name} | Mes révisions | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-6">
	<div class="mb-4">
		<Button variant="ghost" size="sm" href="/dashboard/revisions">
			<ChevronLeft class="h-4 w-4" />
			Mes révisions
		</Button>
	</div>

	<header class="mb-6 flex flex-wrap items-start justify-between gap-3">
		<div class="flex items-start gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<BookOpen class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{data.deck.name}</h1>
				{#if data.deck.description}
					<p class="text-muted-foreground">{data.deck.description}</p>
				{/if}
				<div class="mt-1 flex gap-2">
					<Badge variant="outline" class="text-xs">
						{data.totalCards} carte{data.totalCards > 1 ? 's' : ''}
					</Badge>
					{#if isReadOnly}
						<Badge variant="secondary" class="text-xs">Lecture seule (assigné)</Badge>
					{/if}
				</div>
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button onclick={startStudy} class="gap-1">
				<PlayCircle class="h-4 w-4" />
				Lancer une session
			</Button>
			{#if !isReadOnly}
				<Button variant="outline" onclick={openCreate} disabled={busy}>
					<Plus class="h-4 w-4" />
					Nouvelle section
				</Button>
			{/if}
		</div>
	</header>

	<!-- Sections manuelles -->
	<div class="space-y-6">
		{#each data.sections as section (section.id)}
			{@const sectionCards = data.cardsBySection[section.id] ?? []}
			<section>
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div>
						<h2 class="text-lg font-semibold">{section.name}</h2>
						{#if section.description}
							<p class="text-xs text-muted-foreground">{section.description}</p>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Badge variant="outline" class="text-xs">{sectionCards.length}</Badge>
						{#if !isReadOnly}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => openEdit(section)}
								aria-label="Renommer la section"
							>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => deleteSection(section)}
								aria-label="Supprimer la section"
							>
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						{/if}
					</div>
				</div>

				{#if sectionCards.length === 0}
					<p class="text-sm text-muted-foreground italic">Aucune carte dans cette section.</p>
				{:else}
					<div class="space-y-2">
						{#each sectionCards as card (card.id)}
							<Card.Root>
								<Card.Content class="flex flex-wrap items-center justify-between gap-3 p-3">
									<div class="flex items-center gap-2 text-sm">
										<FileText class="h-4 w-4 text-muted-foreground" />
										<span>{cardLabel(card)}</span>
									</div>
									{#if !isReadOnly}
										<MySelect
											type="single"
											value={card.sectionId ?? UNASSIGNED_KEY}
											items={sectionOptions}
											onValueChange={(v) => moveCard(card, v)}
											triggerClass="w-48 text-xs"
										/>
									{/if}
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				{/if}
			</section>
		{/each}

		<!-- Cartes non rangées -->
		<section>
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-muted-foreground">Non rangées</h2>
				<Badge variant="outline" class="text-xs">{unassignedCards.length}</Badge>
			</div>
			{#if unassignedCards.length === 0}
				<p class="text-sm text-muted-foreground italic">Toutes les cartes sont rangées.</p>
			{:else}
				<div class="space-y-2">
					{#each unassignedCards as card (card.id)}
						<Card.Root>
							<Card.Content class="flex flex-wrap items-center justify-between gap-3 p-3">
								<div class="flex items-center gap-2 text-sm">
									<FileText class="h-4 w-4 text-muted-foreground" />
									<span>{cardLabel(card)}</span>
								</div>
								{#if !isReadOnly && data.sections.length > 0}
									<MySelect
										type="single"
										value={UNASSIGNED_KEY}
										items={sectionOptions}
										onValueChange={(v) => moveCard(card, v)}
										triggerClass="w-48 text-xs"
									/>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</main>

<!-- Dialog création/modification section -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>
				{editingSection ? 'Modifier la section' : 'Nouvelle section'}
			</Dialog.Title>
			<Dialog.Description>
				Donne un nom à ta section pour mieux organiser tes cartes.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-3">
			<div>
				<Label for="section-name">Nom</Label>
				<Input
					id="section-name"
					bind:value={newName}
					maxlength={50}
					placeholder="ex: Symétries, Triangles, ..."
				/>
			</div>
			<div>
				<Label for="section-description">Description (facultatif)</Label>
				<Textarea
					id="section-description"
					bind:value={newDescription}
					maxlength={200}
					placeholder="Optionnel"
				/>
			</div>
			<div>
				<Label for="section-order">Ordre d'affichage</Label>
				<Input id="section-order" type="number" min={0} bind:value={newOrder} />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showCreateDialog = false)} disabled={busy}>
				Annuler
			</Button>
			<Button onclick={saveSection} disabled={busy}>
				{editingSection ? 'Enregistrer' : 'Créer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
