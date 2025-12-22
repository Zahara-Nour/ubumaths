<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import * as Alert from '$lib/components/ui/alert';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		Download,
		Upload,
		Database,
		FileJson,
		FileCode,
		Loader2,
		AlertCircle,
		CheckCircle2,
		RefreshCw
	} from 'lucide-svelte';
	import type { BackupStats, RestoreResult } from '$lib/server/validation/backup';

	let { data } = $props();

	// Export state
	let exportingJson = $state(false);
	let exportingSql = $state(false);

	// Import state
	let importFile = $state<File | null>(null);
	let importing = $state(false);
	let dragOver = $state(false);

	// Restore options
	let conflictStrategy = $state<'skip' | 'replace'>('skip');
	let reassignOrphans = $state(false);

	// Result state
	let restoreResult = $state<RestoreResult | null>(null);

	// Stats from server
	let stats = $state<BackupStats>(data.stats);

	// Items for conflict strategy select
	const conflictItems = [
		{ value: 'skip', label: 'Ignorer les conflits' },
		{ value: 'replace', label: 'Remplacer les existants' }
	];

	// Refresh stats
	async function refreshStats() {
		try {
			const response = await fetch('/api/admin/exercises/backup-stats');
			if (response.ok) {
				stats = await response.json();
				toaster.success('Statistiques mises a jour');
			}
		} catch {
			toaster.error('Erreur lors de la mise a jour');
		}
	}

	// Helper to download a blob as a file
	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Export JSON
	async function exportJson() {
		exportingJson = true;
		try {
			const response = await fetch('/api/admin/exercises/backup?format=json');
			if (!response.ok) {
				throw new Error('Export failed');
			}

			// Get filename from Content-Disposition header
			const disposition = response.headers.get('Content-Disposition');
			const filenameMatch = disposition?.match(/filename="(.+)"/);
			const filename = filenameMatch?.[1] ?? 'ubumaths-exercises-backup.json';

			// Download file
			const blob = await response.blob();
			downloadBlob(blob, filename);

			toaster.success('Export JSON telecharge');
		} catch {
			toaster.error("Erreur lors de l'export JSON");
		} finally {
			exportingJson = false;
		}
	}

	// Export SQL
	async function exportSql() {
		exportingSql = true;
		try {
			const response = await fetch('/api/admin/exercises/backup?format=sql');
			if (!response.ok) {
				throw new Error('Export failed');
			}

			// Get filename from Content-Disposition header
			const disposition = response.headers.get('Content-Disposition');
			const filenameMatch = disposition?.match(/filename="(.+)"/);
			const filename = filenameMatch?.[1] ?? 'ubumaths-exercises-backup.sql';

			// Download file
			const blob = await response.blob();
			downloadBlob(blob, filename);

			toaster.success('Export SQL telecharge');
		} catch {
			toaster.error("Erreur lors de l'export SQL");
		} finally {
			exportingSql = false;
		}
	}

	// Handle file drop
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;

		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (file.name.endsWith('.json')) {
				importFile = file;
				restoreResult = null;
			} else {
				toaster.error('Seuls les fichiers JSON sont acceptes');
			}
		}
	}

	// Handle file input change
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			importFile = files[0];
			restoreResult = null;
		}
	}

	// Restore from backup
	async function restore() {
		if (!importFile) return;

		importing = true;
		restoreResult = null;

		try {
			// Read file content
			const content = await importFile.text();
			const backup = JSON.parse(content);

			// Call restore API
			const response = await fetch('/api/admin/exercises/backup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					backup,
					options: {
						conflict_strategy: conflictStrategy,
						reassign_orphans_to_admin: reassignOrphans
					}
				})
			});

			const result: RestoreResult = await response.json();
			restoreResult = result;

			if (result.success) {
				toaster.success('Restauration terminee avec succes');
				await refreshStats();
			} else {
				toaster.warning('Restauration terminee avec des erreurs');
			}
		} catch (err) {
			console.error('Restore error:', err);
			toaster.error('Erreur lors de la restauration');
		} finally {
			importing = false;
		}
	}

	// Clear import state
	function clearImport() {
		importFile = null;
		restoreResult = null;
	}

	// Compute total stats from result
	function getTotalStats(result: RestoreResult) {
		const s = result.stats;
		return {
			imported:
				s.exercises.imported +
				s.exercise_templates.imported +
				s.exercise_favorites.imported +
				s.exercise_share_tokens.imported,
			skipped:
				s.exercises.skipped +
				s.exercise_templates.skipped +
				s.exercise_favorites.skipped +
				s.exercise_share_tokens.skipped,
			replaced:
				s.exercises.replaced +
				s.exercise_templates.replaced +
				s.exercise_favorites.replaced +
				s.exercise_share_tokens.replaced,
			failed:
				s.exercises.failed +
				s.exercise_templates.failed +
				s.exercise_favorites.failed +
				s.exercise_share_tokens.failed
		};
	}
</script>

<svelte:head>
	<title>Backup Exercices - Admin</title>
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Backup & Restauration des Exercices</h1>
			<p class="text-muted-foreground">Sauvegardez et restaurez les donnees d'exercices</p>
		</div>
		<Button variant="outline" size="sm" onclick={refreshStats}>
			<RefreshCw class="mr-2 h-4 w-4" />
			Actualiser
		</Button>
	</div>

	<!-- Statistics Overview -->
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
		<Card.Root>
			<Card.Content class="pt-4">
				<div class="text-center">
					<div class="text-2xl font-bold">{stats.exercises}</div>
					<div class="text-muted-foreground text-sm">Exercices</div>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="pt-4">
				<div class="text-center">
					<div class="text-2xl font-bold">{stats.exercise_templates}</div>
					<div class="text-muted-foreground text-sm">Templates</div>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="pt-4">
				<div class="text-center">
					<div class="text-2xl font-bold">{stats.exercise_favorites}</div>
					<div class="text-muted-foreground text-sm">Favoris</div>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="pt-4">
				<div class="text-center">
					<div class="text-2xl font-bold">{stats.exercise_share_tokens}</div>
					<div class="text-muted-foreground text-sm">Tokens partage</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Export Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Download class="h-5 w-5" />
				Exporter un backup
			</Card.Title>
			<Card.Description>
				Telechargez une sauvegarde complete des exercices. Le format JSON peut etre restaure via
				cette interface, le SQL est pour backup technique.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-4">
				<Button onclick={exportJson} disabled={exportingJson || exportingSql}>
					{#if exportingJson}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<FileJson class="mr-2 h-4 w-4" />
					{/if}
					Telecharger JSON
				</Button>
				<Button variant="outline" onclick={exportSql} disabled={exportingJson || exportingSql}>
					{#if exportingSql}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<FileCode class="mr-2 h-4 w-4" />
					{/if}
					Telecharger SQL
				</Button>
			</div>
			<p class="text-muted-foreground mt-4 text-sm">
				<Database class="mr-1 inline h-4 w-4" />
				Total: {stats.total} enregistrements dans 4 tables
			</p>
		</Card.Content>
	</Card.Root>

	<!-- Import Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Upload class="h-5 w-5" />
				Restaurer depuis un backup
			</Card.Title>
			<Card.Description>
				Importez un fichier de backup JSON pour restaurer les exercices.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Drop zone -->
			<div
				class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
					? 'border-primary bg-primary/5'
					: 'border-muted-foreground/25'}"
				ondragover={(e) => {
					e.preventDefault();
					dragOver = true;
				}}
				ondragleave={() => (dragOver = false)}
				ondrop={handleDrop}
				role="button"
				tabindex="0"
				aria-label="Zone de depot pour fichier JSON de backup"
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						document.getElementById('file-input')?.click();
					}
				}}
			>
				{#if importFile}
					<div class="space-y-2">
						<FileJson class="mx-auto h-12 w-12 text-green-500" />
						<p class="font-medium">{importFile.name}</p>
						<p class="text-muted-foreground text-sm">
							{(importFile.size / 1024).toFixed(1)} Ko
						</p>
						<Button variant="ghost" size="sm" onclick={clearImport}>Changer de fichier</Button>
					</div>
				{:else}
					<div class="space-y-2">
						<Upload class="text-muted-foreground mx-auto h-12 w-12" />
						<p class="text-muted-foreground">
							Glissez un fichier JSON ici ou
							<label class="text-primary cursor-pointer underline">
								parcourez
								<input
									id="file-input"
									type="file"
									accept=".json"
									class="hidden"
									onchange={handleFileChange}
								/>
							</label>
						</p>
					</div>
				{/if}
			</div>

			<!-- Options -->
			{#if importFile}
				<Separator />

				<div class="space-y-4">
					<div>
						<Label>Strategie en cas de conflit d'ID</Label>
						<MySelect type="single" bind:value={conflictStrategy} items={conflictItems} />
					</div>

					<MyCheckbox bind:checked={reassignOrphans} label="Reassigner les exercices orphelins a l'admin actuel" />

					<p class="text-muted-foreground text-sm">
						Les exercices dont le createur n'existe plus seront reassignes a votre compte si cette
						option est activee.
					</p>
				</div>

				<Button onclick={restore} disabled={importing} class="w-full">
					{#if importing}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Restauration en cours...
					{:else}
						<Upload class="mr-2 h-4 w-4" />
						Restaurer
					{/if}
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Restore Result -->
	{#if restoreResult}
		{@const totals = getTotalStats(restoreResult)}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					{#if restoreResult.success}
						<CheckCircle2 class="h-5 w-5 text-green-500" />
						Restauration reussie
					{:else}
						<AlertCircle class="h-5 w-5 text-yellow-500" />
						Restauration terminee avec des erreurs
					{/if}
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Summary badges -->
				<div class="flex flex-wrap gap-2">
					<Badge variant="default">{totals.imported} importes</Badge>
					<Badge variant="secondary">{totals.skipped} ignores</Badge>
					<Badge variant="outline">{totals.replaced} remplaces</Badge>
					{#if totals.failed > 0}
						<Badge variant="destructive">{totals.failed} echecs</Badge>
					{/if}
				</div>

				<!-- Details per table -->
				<div class="grid gap-2 text-sm">
					<div class="flex justify-between">
						<span>Exercices:</span>
						<span>
							{restoreResult.stats.exercises.imported} /
							{restoreResult.stats.exercises.skipped} /
							{restoreResult.stats.exercises.replaced} /
							{restoreResult.stats.exercises.failed}
						</span>
					</div>
					<div class="flex justify-between">
						<span>Templates:</span>
						<span>
							{restoreResult.stats.exercise_templates.imported} /
							{restoreResult.stats.exercise_templates.skipped} /
							{restoreResult.stats.exercise_templates.replaced} /
							{restoreResult.stats.exercise_templates.failed}
						</span>
					</div>
					<div class="flex justify-between">
						<span>Favoris:</span>
						<span>
							{restoreResult.stats.exercise_favorites.imported} /
							{restoreResult.stats.exercise_favorites.skipped} /
							{restoreResult.stats.exercise_favorites.replaced} /
							{restoreResult.stats.exercise_favorites.failed}
						</span>
					</div>
					<div class="flex justify-between">
						<span>Tokens:</span>
						<span>
							{restoreResult.stats.exercise_share_tokens.imported} /
							{restoreResult.stats.exercise_share_tokens.skipped} /
							{restoreResult.stats.exercise_share_tokens.replaced} /
							{restoreResult.stats.exercise_share_tokens.failed}
						</span>
					</div>
				</div>
				<p class="text-muted-foreground text-xs">Format: importes / ignores / remplaces / echecs</p>

				<!-- Errors -->
				{#if restoreResult.errors.length > 0}
					<Alert.Root variant="destructive">
						<AlertCircle class="h-4 w-4" />
						<Alert.Title>Erreurs ({restoreResult.errors.length})</Alert.Title>
						<Alert.Description>
							<ul class="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-sm">
								{#each restoreResult.errors.slice(0, 10) as error, i (i)}
									<li>
										<span class="font-mono">{error.table}</span>
										{#if error.record_id}
											<span class="text-muted-foreground">({error.record_id.slice(0, 8)}...)</span>
										{/if}
										: {error.error}
									</li>
								{/each}
								{#if restoreResult.errors.length > 10}
									<li class="text-muted-foreground">
										... et {restoreResult.errors.length - 10} autres erreurs
									</li>
								{/if}
							</ul>
						</Alert.Description>
					</Alert.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
