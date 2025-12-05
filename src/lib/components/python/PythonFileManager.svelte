<script lang="ts">
	/**
	 * PythonFileManager - Dialog for managing Python files
	 *
	 * Provides tabs for:
	 * - My Files: User's own saved Python files
	 * - Assigned Files: Files assigned by teachers (for students)
	 * - Student Files: View student files (for teachers)
	 */

	// Imports
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { FileCode, FolderOpen, Trash2, Loader2, RefreshCw, Clock, BookOpen } from 'lucide-svelte';
	import { pythonStore, type PythonFile } from '$lib/stores/pythonPlayground.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { Database } from '$lib/types/database';

	// Types
	type Profile = Database['public']['Tables']['profiles']['Row'];

	interface AssignedFile {
		file: PythonFile;
		instructions: string | null;
		due_date: string | null;
		assigned_at: string;
	}

	// Props
	let {
		open = $bindable(false),
		profile,
		onFileOpened
	}: {
		open: boolean;
		profile: Profile | null;
		onFileOpened?: () => void;
	} = $props();

	// State
	let activeTab = $state('my-files');
	let myFiles = $state<PythonFile[]>([]);
	let assignedFiles = $state<AssignedFile[]>([]);
	let isLoading = $state(false);
	let deleteConfirmId = $state<string | null>(null);
	let isDeleting = $state(false);

	// Derived
	let _isTeacher = $derived(profile?.role === 'teacher' || profile?.role === 'admin');
	let isStudent = $derived(profile?.role === 'student');

	// Load files when dialog opens
	$effect(() => {
		if (open) {
			loadMyFiles();
			if (isStudent) {
				loadAssignedFiles();
			}
		}
	});

	// Functions
	async function loadMyFiles(): Promise<void> {
		isLoading = true;

		try {
			const response = await fetch('/api/python-files');

			if (!response.ok) {
				throw new Error('Erreur lors du chargement des fichiers');
			}

			const data = await response.json();
			myFiles = data.files ?? [];
		} catch (error) {
			console.error('Load error:', error);
			toaster.error('Erreur lors du chargement des fichiers');
			myFiles = [];
		} finally {
			isLoading = false;
		}
	}

	async function loadAssignedFiles(): Promise<void> {
		try {
			const response = await fetch('/api/python-files/assigned');

			if (!response.ok) {
				throw new Error('Erreur lors du chargement des fichiers assignes');
			}

			const data = await response.json();
			assignedFiles = data.files ?? [];
		} catch (error) {
			console.error('Load assigned error:', error);
			// Silent fail for assigned files
			assignedFiles = [];
		}
	}

	function handleOpenFile(file: PythonFile): void {
		pythonStore.loadCloudFile(file);
		toaster.success(`Fichier "${file.title}" charge`);
		open = false;
		onFileOpened?.();
	}

	function handleOpenAssignedFile(assignedFile: AssignedFile): void {
		pythonStore.loadCloudFile(assignedFile.file);
		if (assignedFile.instructions) {
			toaster.info(assignedFile.instructions);
		} else {
			toaster.success(`Fichier "${assignedFile.file.title}" charge`);
		}
		open = false;
		onFileOpened?.();
	}

	async function handleDeleteFile(id: string): Promise<void> {
		isDeleting = true;

		try {
			const success = await pythonStore.deleteCloudFile(id);

			if (success) {
				myFiles = myFiles.filter((f) => f.id !== id);
				toaster.success('Fichier supprime');
				deleteConfirmId = null;
			} else if (pythonStore.cloudError) {
				toaster.error(pythonStore.cloudError);
			}
		} catch (error) {
			console.error('Delete error:', error);
			toaster.error('Erreur lors de la suppression');
		} finally {
			isDeleting = false;
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[85vh] overflow-hidden sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<FolderOpen class="size-5" />
				Mes fichiers Python
			</Dialog.Title>
			<Dialog.Description>Gerez vos fichiers Python sauvegardes dans le cloud.</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root bind:value={activeTab} class="mt-4">
			<Tabs.List class="grid w-full {isStudent ? 'grid-cols-2' : 'grid-cols-1'}">
				<Tabs.Trigger value="my-files">
					<FileCode class="mr-2 size-4" />
					Mes fichiers ({myFiles.length})
				</Tabs.Trigger>
				{#if isStudent}
					<Tabs.Trigger value="assigned">
						<BookOpen class="mr-2 size-4" />
						Fichiers assignes ({assignedFiles.length})
					</Tabs.Trigger>
				{/if}
			</Tabs.List>

			<Tabs.Content value="my-files" class="mt-4 max-h-[50vh] overflow-y-auto">
				{#if isLoading}
					<div class="flex items-center justify-center py-12">
						<Loader2 class="size-8 animate-spin text-muted-foreground" />
					</div>
				{:else if myFiles.length === 0}
					<div class="py-12 text-center text-muted-foreground">
						<FileCode class="mx-auto size-12 opacity-50" />
						<p class="mt-4 font-medium">Aucun fichier sauvegarde</p>
						<p class="text-sm">Sauvegardez votre code pour le retrouver ici</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each myFiles as file (file.id)}
							<div
								class="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
							>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<FileCode class="size-4 shrink-0 text-muted-foreground" />
										<h4 class="truncate font-medium">{file.title}</h4>
										{#if file.is_public}
											<span class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
												Public
											</span>
										{/if}
									</div>
									{#if file.description}
										<p class="mt-1 truncate text-sm text-muted-foreground">
											{file.description}
										</p>
									{/if}
									<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
										<Clock class="size-3" />
										<span>{formatDate(file.updated_at)}</span>
									</div>
								</div>

								<div class="ml-4 flex shrink-0 items-center gap-2">
									{#if deleteConfirmId === file.id}
										<span class="text-sm text-destructive">Supprimer ?</span>
										<Button
											variant="destructive"
											size="sm"
											onclick={() => handleDeleteFile(file.id)}
											disabled={isDeleting}
										>
											{#if isDeleting}
												<Loader2 class="size-4 animate-spin" />
											{:else}
												Oui
											{/if}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onclick={() => (deleteConfirmId = null)}
											disabled={isDeleting}
										>
											Non
										</Button>
									{:else}
										<Button variant="outline" size="sm" onclick={() => handleOpenFile(file)}>
											Ouvrir
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="size-8 text-muted-foreground hover:text-destructive"
											onclick={() => (deleteConfirmId = file.id)}
											aria-label="Supprimer le fichier"
										>
											<Trash2 class="size-4" />
										</Button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				{#if !isLoading && myFiles.length > 0}
					<div class="mt-4 flex justify-center">
						<Button variant="ghost" size="sm" onclick={loadMyFiles}>
							<RefreshCw class="mr-2 size-4" />
							Actualiser
						</Button>
					</div>
				{/if}
			</Tabs.Content>

			{#if isStudent}
				<Tabs.Content value="assigned" class="mt-4 max-h-[50vh] overflow-y-auto">
					{#if assignedFiles.length === 0}
						<div class="py-12 text-center text-muted-foreground">
							<BookOpen class="mx-auto size-12 opacity-50" />
							<p class="mt-4 font-medium">Aucun fichier assigne</p>
							<p class="text-sm">Les fichiers assignes par vos professeurs apparaitront ici</p>
						</div>
					{:else}
						<div class="space-y-2">
							{#each assignedFiles as assignedFile (assignedFile.file.id)}
								<div
									class="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
								>
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<BookOpen class="size-4 shrink-0 text-primary" />
											<h4 class="truncate font-medium">{assignedFile.file.title}</h4>
										</div>
										{#if assignedFile.instructions}
											<p class="mt-1 truncate text-sm text-muted-foreground">
												{assignedFile.instructions}
											</p>
										{/if}
										<div
											class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
										>
											<span class="flex items-center gap-1">
												<Clock class="size-3" />
												Assigne le {formatDate(assignedFile.assigned_at)}
											</span>
											{#if assignedFile.due_date}
												<span class="text-warning flex items-center gap-1">
													<Clock class="size-3" />
													Echeance : {formatDate(assignedFile.due_date)}
												</span>
											{/if}
										</div>
									</div>

									<div class="ml-4 shrink-0">
										<Button
											variant="default"
											size="sm"
											onclick={() => handleOpenAssignedFile(assignedFile)}
										>
											Ouvrir
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Tabs.Content>
			{/if}
		</Tabs.Root>

		<Dialog.Footer class="mt-4">
			<Button variant="outline" onclick={() => (open = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
