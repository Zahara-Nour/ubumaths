<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import * as Alert from '$lib/components/ui/alert';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		FileCheck,
		Lock,
		Unlock,
		Eye,
		Loader2,
		AlertCircle,
		CheckCircle2,
		Info
	} from 'lucide-svelte';
	import type { WorksheetAssignmentRow, CorrectionReleaseMode } from '$lib/types/worksheets';

	// Typst library type
	type TypstLibrary = {
		setCompilerInitOptions: (options: { getModule: () => string }) => void;
		setRendererInitOptions: (options: { getModule: () => string }) => void;
		pdf: (options: { mainContent: string }) => Promise<Uint8Array>;
	};

	// ============================================================================
	// PROPS AND STATE
	// ============================================================================

	interface CorrectionStatus {
		mode: CorrectionReleaseMode;
		isReleased: boolean;
		releaseAt: string | null;
		studentsWithAccess: number;
		totalStudents: number;
	}

	interface Props {
		assignment: WorksheetAssignmentRow;
		correctionStatus?: CorrectionStatus | null;
		worksheetId: string;
		onUpdate?: () => void;
	}

	let { assignment, correctionStatus, worksheetId: _worksheetId, onUpdate }: Props = $props();

	// Local state for editing
	let releaseMode = $state<CorrectionReleaseMode>(assignment.correction_release_mode);
	let scheduledDate = $state<string>(
		assignment.correction_release_at
			? new Date(assignment.correction_release_at).toISOString().slice(0, 16)
			: ''
	);

	// Loading states
	let isUpdating = $state(false);
	let isReleasing = $state(false);
	let isRevoking = $state(false);
	let isPreviewing = $state(false);

	// Typst state
	let isTypstLoaded = $state(false);
	let isTypstLoading = $state(false);

	// Track if settings have changed
	let hasChanges = $derived(
		releaseMode !== assignment.correction_release_mode ||
			(releaseMode === 'scheduled' &&
				scheduledDate !==
					(assignment.correction_release_at
						? new Date(assignment.correction_release_at).toISOString().slice(0, 16)
						: ''))
	);

	// Release mode options (sans after_due car pas de rendu)
	const releaseModeItems = [
		{ value: 'manual', label: 'Manuel' },
		{ value: 'immediate', label: 'Immediat' },
		{ value: 'scheduled', label: 'Programme' }
	];

	// Status derived values
	let isCorrectionsReleased = $derived(correctionStatus?.isReleased ?? false);
	let releaseStatusText = $derived(getStatusText());
	let releaseStatusVariant = $derived(getStatusVariant());

	// ============================================================================
	// HANDLERS
	// ============================================================================

	async function handleSaveSettings() {
		if (!hasChanges) return;

		isUpdating = true;
		try {
			const response = await fetch(`/api/worksheets/assignments/${assignment.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					correction_release_mode: releaseMode,
					correction_release_at:
						releaseMode === 'scheduled' && scheduledDate
							? new Date(scheduledDate).toISOString()
							: null
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Erreur lors de la mise a jour');
			}

			toaster.success('Parametres de correction mis a jour');
			onUpdate?.();
		} catch (err) {
			console.error('Error updating correction settings:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la mise a jour');
		} finally {
			isUpdating = false;
		}
	}

	async function handleReleaseCorrections() {
		isReleasing = true;
		try {
			const response = await fetch(`/api/worksheets/assignments/${assignment.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'release_corrections' })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Erreur lors de la publication');
			}

			toaster.success(
				data.affectedStudents
					? `Corrections publiees pour ${data.affectedStudents} eleve(s)`
					: 'Corrections publiees'
			);
			onUpdate?.();
		} catch (err) {
			console.error('Error releasing corrections:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la publication');
		} finally {
			isReleasing = false;
		}
	}

	async function handleRevokeCorrections() {
		isRevoking = true;
		try {
			const response = await fetch(`/api/worksheets/assignments/${assignment.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'revoke_corrections' })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Erreur lors de la revocation');
			}

			toaster.success('Acces aux corrections revoque');
			onUpdate?.();
		} catch (err) {
			console.error('Error revoking corrections:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la revocation');
		} finally {
			isRevoking = false;
		}
	}

	/**
	 * Load Typst.js library from CDN
	 */
	async function loadTypst(): Promise<void> {
		// Check if already loaded globally
		const existingTypst = (window as { $typst?: TypstLibrary }).$typst;
		if (existingTypst) {
			isTypstLoaded = true;
			return;
		}

		if (isTypstLoaded) return;
		if (isTypstLoading) {
			// Wait for existing load
			await new Promise<void>((resolve) => {
				const check = setInterval(() => {
					if (isTypstLoaded || (window as { $typst?: TypstLibrary }).$typst) {
						clearInterval(check);
						isTypstLoaded = true;
						resolve();
					}
				}, 100);
			});
			return;
		}

		isTypstLoading = true;

		return new Promise((resolve, reject) => {
			// Check for existing typst script
			const existingScript = document.querySelector('script[src*="typst.ts"]');
			if (existingScript) {
				// Wait for it to load
				const checkTypst = setInterval(() => {
					const typst = (window as { $typst?: TypstLibrary }).$typst;
					if (typst) {
						clearInterval(checkTypst);
						isTypstLoaded = true;
						isTypstLoading = false;
						resolve();
					}
				}, 100);
				// Timeout after 10 seconds
				setTimeout(() => {
					clearInterval(checkTypst);
					if (!isTypstLoaded) {
						isTypstLoading = false;
						reject(new Error('Typst library load timeout'));
					}
				}, 10000);
				return;
			}

			const script = document.createElement('script');
			script.type = 'module';
			script.src =
				'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js';
			script.id = 'typst-script-correction';

			script.addEventListener('load', () => {
				// Wait a bit for typst to initialize itself
				setTimeout(() => {
					const typst = (window as { $typst?: TypstLibrary }).$typst;
					if (typst) {
						// Only set options if not already initialized
						try {
							typst.setCompilerInitOptions({
								getModule: () =>
									'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm'
							});
							typst.setRendererInitOptions({
								getModule: () =>
									'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm'
							});
						} catch {
							// Already initialized, that's OK
						}
						isTypstLoaded = true;
						isTypstLoading = false;
						resolve();
					} else {
						isTypstLoading = false;
						reject(new Error('Typst library not available'));
					}
				}, 100);
			});

			script.addEventListener('error', () => {
				isTypstLoading = false;
				reject(new Error('Failed to load Typst library'));
			});

			document.head.appendChild(script);
		});
	}

	async function handlePreviewCorrection() {
		isPreviewing = true;
		try {
			// Load Typst.js if needed
			await loadTypst();

			// Get Typst content from API
			const response = await fetch(
				`/api/worksheets/assignments/${assignment.id}/correction?format=typst`
			);

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Erreur lors de la generation');
			}

			// Generate PDF client-side
			const typst = (window as { $typst?: TypstLibrary }).$typst;
			if (!typst) {
				throw new Error('Typst library not loaded');
			}

			const pdfData = await typst.pdf({ mainContent: data.typst });

			// Create blob and open
			const blob = new Blob([pdfData as unknown as BlobPart], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);

			window.open(url, '_blank');

			// Cleanup after a delay
			setTimeout(() => URL.revokeObjectURL(url), 60000);
		} catch (err) {
			console.error('Error previewing correction:', err);
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'apercu");
		} finally {
			isPreviewing = false;
		}
	}

	// ============================================================================
	// UTILITY FUNCTIONS
	// ============================================================================

	function getStatusText(): string {
		if (!correctionStatus) return 'Statut inconnu';

		if (correctionStatus.isReleased) {
			return `Visibles (${correctionStatus.studentsWithAccess}/${correctionStatus.totalStudents} eleves)`;
		}

		switch (correctionStatus.mode) {
			case 'immediate':
				return 'Visibles immediatement';
			case 'scheduled':
				if (correctionStatus.releaseAt) {
					const date = new Date(correctionStatus.releaseAt);
					return `Programmees pour le ${date.toLocaleDateString('fr-FR')} a ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
				}
				return 'Date non definie';
			case 'manual':
			default:
				return 'En attente de publication manuelle';
		}
	}

	function getStatusVariant(): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (!correctionStatus) return 'outline';
		return correctionStatus.isReleased ? 'default' : 'secondary';
	}

	function getModeDescription(mode: CorrectionReleaseMode): string {
		switch (mode) {
			case 'immediate':
				return "Les corrections sont visibles des l'assignation";
			case 'scheduled':
				return 'Les corrections seront visibles a la date et heure specifiees';
			case 'manual':
			default:
				return 'Vous pourrez publier les corrections manuellement quand vous le souhaitez';
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<FileCheck class="h-5 w-5" />
			Gestion des corrections
		</Card.Title>
		<Card.Description>
			Configurez quand les corrections sont visibles pour les eleves
		</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-6">
		<!-- Current Status -->
		<div class="flex items-center justify-between rounded-lg border p-4">
			<div class="space-y-1">
				<p class="text-sm font-medium">Statut actuel</p>
				<div class="flex items-center gap-2">
					{#if isCorrectionsReleased}
						<CheckCircle2 class="h-4 w-4 text-green-600" />
					{:else}
						<Lock class="h-4 w-4 text-muted-foreground" />
					{/if}
					<Badge variant={releaseStatusVariant}>{releaseStatusText}</Badge>
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="flex gap-2">
				{#if releaseMode === 'manual'}
					{#if isCorrectionsReleased}
						<Button
							variant="outline"
							size="sm"
							onclick={handleRevokeCorrections}
							disabled={isRevoking}
						>
							{#if isRevoking}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<Lock class="mr-2 h-4 w-4" />
							{/if}
							Revoquer
						</Button>
					{:else}
						<Button size="sm" onclick={handleReleaseCorrections} disabled={isReleasing}>
							{#if isReleasing}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<Unlock class="mr-2 h-4 w-4" />
							{/if}
							Publier
						</Button>
					{/if}
				{/if}

				<Button
					variant="outline"
					size="sm"
					onclick={handlePreviewCorrection}
					disabled={isPreviewing}
				>
					{#if isPreviewing}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<Eye class="mr-2 h-4 w-4" />
					{/if}
					Apercu
				</Button>
			</div>
		</div>

		<Separator />

		<!-- Release Mode Configuration -->
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="release-mode">Mode de publication</Label>
				<MySelect type="single" bind:value={releaseMode} items={releaseModeItems} />
				<p class="text-sm text-muted-foreground">
					{getModeDescription(releaseMode)}
				</p>
			</div>

			<!-- Scheduled Date (only for scheduled mode) -->
			{#if releaseMode === 'scheduled'}
				<div class="space-y-2">
					<Label for="scheduled-date">Date et heure de publication</Label>
					<Input
						id="scheduled-date"
						type="datetime-local"
						bind:value={scheduledDate}
						class="w-full md:w-auto"
					/>
				</div>
			{/if}

			<!-- Warning for immediate mode -->
			{#if releaseMode === 'immediate'}
				<Alert.Root>
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>Attention</Alert.Title>
					<Alert.Description>
						En mode immediat, les eleves verront les corrections des qu'ils accedent a la feuille.
					</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<!-- Save Button -->
		{#if hasChanges}
			<div class="flex justify-end pt-4">
				<Button onclick={handleSaveSettings} disabled={isUpdating}>
					{#if isUpdating}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Enregistrement...
					{:else}
						Enregistrer les modifications
					{/if}
				</Button>
			</div>
		{/if}

		<!-- Information Panel -->
		<Alert.Root variant="default">
			<Info class="h-4 w-4" />
			<Alert.Title>Information</Alert.Title>
			<Alert.Description>
				Chaque eleve recevra une correction personnalisee correspondant a sa version de la feuille.
			</Alert.Description>
		</Alert.Root>
	</Card.Content>
</Card.Root>
