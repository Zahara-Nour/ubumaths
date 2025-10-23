<!--
	Teacher Riddles Management Page
	================================
	Lists all riddles created by the teacher with management actions
-->

<script lang="ts">
	import type { PageData } from './$types';
	import type { DbRiddle } from '$lib/types/riddle';
	import {
		getDifficultyLabel,
		getDifficultyColor,
		getStatusLabel,
		getStatusColor
	} from '$lib/types/riddle';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { invalidateAll } from '$app/navigation';
	import {
		Plus,
		MoreVertical,
		Edit,
		Trash2,
		Users,
		Eye,
		FileCheck,
		Lightbulb
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Delete riddle
	async function handleDelete(riddle: DbRiddle) {
		if (
			!confirm(
				`Êtes-vous sûr de vouloir supprimer l'énigme "${riddle.title}" ?\n\nCette action est irréversible.`
			)
		) {
			return;
		}

		const formData = new FormData();
		formData.append('riddle_id', riddle.id);

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (result.type === 'success') {
			toaster.success('Énigme supprimée');
			await invalidateAll();
		} else {
			toaster.error('Erreur lors de la suppression');
		}
	}

	// Toggle status
	async function handleToggleStatus(riddle: DbRiddle) {
		const formData = new FormData();
		formData.append('riddle_id', riddle.id);
		formData.append('current_status', riddle.status);

		const response = await fetch('?/toggleStatus', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (result.type === 'success') {
			toaster.success(
				riddle.status === 'draft' ? 'Énigme publiée' : 'Énigme mise en brouillon'
			);
			await invalidateAll();
		} else {
			toaster.error('Erreur lors de la mise à jour');
		}
	}
</script>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-2 text-3xl font-bold">
				<Lightbulb class="h-8 w-8 text-primary" />
				Énigmes Mathématiques
			</h1>
			<p class="mt-2 text-muted-foreground">
				Gérez votre banque d'énigmes et créez des défis pour vos élèves
			</p>
		</div>
		<Button href="/dashboard/teacher/riddles/new">
			<Plus class="mr-2 h-4 w-4" />
			Créer une énigme
		</Button>
	</div>

	<!-- Stats Cards -->
	<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="text-2xl font-bold">{data.riddles.length}</div>
				<p class="text-xs text-muted-foreground">Total d'énigmes</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="text-2xl font-bold">
					{data.riddles.filter((r) => r.status === 'published').length}
				</div>
				<p class="text-xs text-muted-foreground">Publiées</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="text-2xl font-bold">
					{data.riddles.filter((r) => r.status === 'draft').length}
				</div>
				<p class="text-xs text-muted-foreground">Brouillons</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="text-2xl font-bold">0</div>
				<p class="text-xs text-muted-foreground">Validations en attente</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Riddles List -->
	{#if data.riddles.length === 0}
		<Card.Root class="border-dashed">
			<Card.Content class="flex flex-col items-center justify-center gap-4 py-12">
				<Lightbulb class="h-16 w-16 text-muted-foreground/50" />
				<div class="text-center">
					<h3 class="text-lg font-semibold">Aucune énigme</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Commencez par créer votre première énigme mathématique
					</p>
				</div>
				<Button href="/dashboard/teacher/riddles/new">
					<Plus class="mr-2 h-4 w-4" />
					Créer une énigme
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-4">
			{#each data.riddles as riddle (riddle.id)}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Header>
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 space-y-2">
								<!-- Title and Number -->
								<div class="flex items-start gap-3">
									<Badge variant="outline" class="shrink-0">#{riddle.riddle_number}</Badge>
									<Card.Title class="text-xl">{riddle.title}</Card.Title>
								</div>

								<!-- Badges -->
								<div class="flex flex-wrap gap-2">
									<Badge class={getStatusColor(riddle.status)}>
										{getStatusLabel(riddle.status)}
									</Badge>
									<Badge class={getDifficultyColor(riddle.difficulty)}>
										{getDifficultyLabel(riddle.difficulty)}
									</Badge>
									{#if riddle.genre}
										<Badge variant="outline">{riddle.genre}</Badge>
									{/if}
									{#if riddle.answer}
										<Badge variant="outline" class="bg-blue-50 dark:bg-blue-950">
											Validation auto
										</Badge>
									{/if}
								</div>
							</div>

							<!-- Actions Dropdown -->
							<DropdownMenu.Root>
								<DropdownMenu.Trigger asChild let:builder>
									<Button builders={[builder]} variant="ghost" size="icon">
										<MoreVertical class="h-4 w-4" />
									</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item href="/dashboard/teacher/riddles/{riddle.id}/edit">
										<Edit class="mr-2 h-4 w-4" />
										Modifier
									</DropdownMenu.Item>
									<DropdownMenu.Item href="/dashboard/teacher/riddles/{riddle.id}/assign">
										<Users class="mr-2 h-4 w-4" />
										Assigner
									</DropdownMenu.Item>
									<DropdownMenu.Item onclick={() => handleToggleStatus(riddle)}>
										<FileCheck class="mr-2 h-4 w-4" />
										{riddle.status === 'draft' ? 'Publier' : 'Mettre en brouillon'}
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item onclick={() => handleDelete(riddle)} class="text-destructive">
										<Trash2 class="mr-2 h-4 w-4" />
										Supprimer
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					</Card.Header>

					<Card.Content>
						<!-- Statement Preview (truncated) -->
						<div class="prose dark:prose-invert prose-sm max-w-none line-clamp-2">
							{@html riddle.statement}
						</div>
					</Card.Content>

					<Card.Footer class="flex flex-wrap gap-2 text-sm text-muted-foreground">
						<div class="flex items-center gap-1">
							<Eye class="h-4 w-4" />
							<span>0 tentatives</span>
						</div>
						<span>•</span>
						<div class="flex items-center gap-1">
							<FileCheck class="h-4 w-4" />
							<span>0% réussite</span>
						</div>
						<span>•</span>
						<div>Créée le {new Date(riddle.created_at).toLocaleDateString('fr-FR')}</div>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
