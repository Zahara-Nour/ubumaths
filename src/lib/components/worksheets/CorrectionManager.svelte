<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Eye, Loader2, EyeOff, Settings2, FileText, AlertTriangle } from 'lucide-svelte';
	import type { WorksheetAssignmentRow, CorrectionReleaseMode } from '$lib/types/worksheets';

	// Typst library type
	type TypstLibrary = {
		setCompilerInitOptions: (options: { getModule: () => string }) => void;
		setRendererInitOptions: (options: { getModule: () => string }) => void;
		pdf: (options: { mainContent: string }) => Promise<Uint8Array>;
	};

	interface ExerciseWithVisibility {
		id: string;
		exercise_id: string;
		position: number;
		title: string | null;
		show_correction: boolean;
	}

	interface CorrectionStatus {
		mode: CorrectionReleaseMode;
		isReleased: boolean;
		releaseAt: string | null;
		studentsWithAccess: number;
		totalStudents: number;
	}

	interface ClassInfo {
		id: string;
		name: string;
	}

	interface StudentInfo {
		id: string;
	}

	interface Props {
		assignment: WorksheetAssignmentRow;
		correctionStatus?: CorrectionStatus | null;
		worksheetId: string;
		classes?: ClassInfo[];
		students?: StudentInfo[];
		onUpdate?: () => void;
	}

	let {
		assignment,
		correctionStatus,
		worksheetId,
		classes = [],
		students = [],
		onUpdate
	}: Props = $props();

	// Audience text (compact)
	let audienceText = $derived.by(() => {
		if (classes.length === 1) return classes[0].name;
		if (classes.length > 1) return `${classes.length} classes`;
		if (students.length > 0) return `${students.length} eleve(s)`;
		return '';
	});

	// State
	let releaseMode = $state<CorrectionReleaseMode>(assignment.correction_release_mode);
	let scheduledDate = $state<string>(
		assignment.correction_release_at
			? new Date(assignment.correction_release_at).toISOString().slice(0, 16)
			: ''
	);

	let isUpdating = $state(false);
	let isReleasing = $state(false);
	let isRevoking = $state(false);
	let isPreviewing = $state(false);
	let isLoadingExercises = $state(false);
	let isTogglingExercise = $state<string | null>(null);
	let isTypstLoaded = $state(false);
	let isTypstLoading = $state(false);

	let exercises = $state<ExerciseWithVisibility[]>([]);
	let exercisePopoverOpen = $state(false);

	let visibleCorrectionsCount = $derived(exercises.filter((e) => e.show_correction).length);
	let isCorrectionsReleased = $derived(correctionStatus?.isReleased ?? false);
	let hasChanges = $derived(
		releaseMode !== assignment.correction_release_mode ||
			(releaseMode === 'scheduled' &&
				scheduledDate !==
					(assignment.correction_release_at
						? new Date(assignment.correction_release_at).toISOString().slice(0, 16)
						: ''))
	);

	const releaseModeItems = [
		{ value: 'manual', label: 'Manuel' },
		{ value: 'scheduled', label: 'Programme' },
		{ value: 'immediate', label: 'Immediat' }
	];

	onMount(() => {
		loadExercisesWithSettings();
	});

	async function loadExercisesWithSettings() {
		isLoadingExercises = true;
		try {
			const exercisesRes = await fetch(`/api/worksheets/${worksheetId}/exercises`);
			if (!exercisesRes.ok) throw new Error('Erreur chargement');
			const exercisesData = await exercisesRes.json();

			const settingsRes = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignment.id}/corrections`
			);
			if (!settingsRes.ok) throw new Error('Erreur chargement');
			const settingsData = await settingsRes.json();

			const settingsMap = new SvelteMap<string, boolean>();
			for (const setting of settingsData.exercise_settings || []) {
				settingsMap.set(setting.worksheet_exercise_id, setting.show_correction);
			}

			exercises = (exercisesData.exercises || [])
				.sort(
					(a: { position: number }, b: { position: number }) =>
						(a.position ?? 0) - (b.position ?? 0)
				)
				.map(
					(ex: {
						id: string;
						exercise_id: string;
						position: number;
						correction_visible: boolean;
						exercise?: { title: string | null };
					}) => ({
						id: ex.id,
						exercise_id: ex.exercise_id,
						position: ex.position,
						title: ex.exercise?.title ?? null,
						show_correction: settingsMap.has(ex.id)
							? settingsMap.get(ex.id)!
							: (ex.correction_visible ?? true)
					})
				);
		} catch (err) {
			console.error('Error:', err);
		} finally {
			isLoadingExercises = false;
		}
	}

	async function handleToggleExercise(exerciseId: string, newValue: boolean) {
		isTogglingExercise = exerciseId;
		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignment.id}/corrections`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ worksheet_exercise_id: exerciseId, show_correction: newValue })
				}
			);
			if (!response.ok) throw new Error('Erreur');
			exercises = exercises.map((ex) =>
				ex.id === exerciseId ? { ...ex, show_correction: newValue } : ex
			);
		} catch (_err) {
			toaster.error('Erreur lors de la mise a jour');
		} finally {
			isTogglingExercise = null;
		}
	}

	async function handleToggleAll(showAll: boolean) {
		isLoadingExercises = true;
		try {
			const settings = exercises.map((ex) => ({
				worksheet_exercise_id: ex.id,
				show_correction: showAll
			}));
			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignment.id}/corrections`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ settings })
				}
			);
			if (!response.ok) throw new Error('Erreur');
			exercises = exercises.map((ex) => ({ ...ex, show_correction: showAll }));
		} catch (_err) {
			toaster.error('Erreur');
		} finally {
			isLoadingExercises = false;
		}
	}

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
			if (!response.ok) throw new Error('Erreur');
			toaster.success('Enregistre');
			onUpdate?.();
		} catch (_err) {
			toaster.error('Erreur');
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
			if (!response.ok) throw new Error(data.message);
			toaster.success(
				data.affectedStudents ? `Publie pour ${data.affectedStudents} eleve(s)` : 'Publie'
			);
			onUpdate?.();
		} catch (_err) {
			toaster.error('Erreur');
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
			if (!response.ok) throw new Error('Erreur');
			toaster.success('Masque');
			onUpdate?.();
		} catch (_err) {
			toaster.error('Erreur');
		} finally {
			isRevoking = false;
		}
	}

	async function loadTypst(): Promise<void> {
		const existingTypst = (window as { $typst?: TypstLibrary }).$typst;
		if (existingTypst) {
			isTypstLoaded = true;
			return;
		}
		if (isTypstLoaded) return;
		if (isTypstLoading) {
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
			const script = document.createElement('script');
			script.type = 'module';
			script.src =
				'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js';
			script.addEventListener('load', () => {
				setTimeout(() => {
					const typst = (window as { $typst?: TypstLibrary }).$typst;
					if (typst) {
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
							/* already init */
						}
						isTypstLoaded = true;
						isTypstLoading = false;
						resolve();
					} else {
						isTypstLoading = false;
						reject(new Error('Typst not available'));
					}
				}, 100);
			});
			script.addEventListener('error', () => {
				isTypstLoading = false;
				reject(new Error('Failed'));
			});
			document.head.appendChild(script);
		});
	}

	async function handlePreviewCorrection() {
		isPreviewing = true;
		try {
			await loadTypst();
			const response = await fetch(
				`/api/worksheets/assignments/${assignment.id}/correction?format=typst`
			);
			const data = await response.json();
			if (!response.ok) throw new Error(data.message);
			const typst = (window as { $typst?: TypstLibrary }).$typst;
			if (!typst) throw new Error('Typst not loaded');
			const pdfData = await typst.pdf({ mainContent: data.typst });
			const blob = new Blob([pdfData as unknown as BlobPart], { type: 'application/pdf' });
			window.open(URL.createObjectURL(blob), '_blank');
		} catch (_err) {
			toaster.error('Erreur apercu');
		} finally {
			isPreviewing = false;
		}
	}
</script>

<!-- Compact correction manager toolbar -->
<div class="rounded-lg border bg-card">
	<!-- Header row: Status + Audience -->
	<div class="flex items-center justify-between border-b px-4 py-2">
		<div class="flex items-center gap-2">
			{#if isCorrectionsReleased}
				<Eye class="h-4 w-4 text-green-600" />
				<span class="text-sm font-medium text-green-600">Visibles</span>
				<span class="text-xs text-muted-foreground">
					({correctionStatus?.studentsWithAccess}/{correctionStatus?.totalStudents})
				</span>
			{:else}
				<EyeOff class="h-4 w-4 text-muted-foreground" />
				<span class="text-sm font-medium">Masquees</span>
			{/if}
			{#if audienceText}
				<span class="text-xs text-muted-foreground">· {audienceText}</span>
			{/if}
		</div>

		<!-- Main action button -->
		{#if releaseMode === 'manual'}
			{#if isCorrectionsReleased}
				<Button variant="outline" size="sm" onclick={handleRevokeCorrections} disabled={isRevoking}>
					{#if isRevoking}<Loader2 class="mr-1 h-3 w-3 animate-spin" />{/if}
					Masquer
				</Button>
			{:else}
				<Button
					size="sm"
					onclick={handleReleaseCorrections}
					disabled={isReleasing}
					class="bg-green-600 hover:bg-green-700"
				>
					{#if isReleasing}<Loader2 class="mr-1 h-3 w-3 animate-spin" />{/if}
					Publier
				</Button>
			{/if}
		{/if}
	</div>

	<!-- Controls row -->
	<div class="flex flex-wrap items-center gap-3 px-4 py-3">
		<!-- Mode select -->
		<div class="flex items-center gap-2">
			<span class="text-xs text-muted-foreground">Mode:</span>
			<MySelect
				type="single"
				bind:value={releaseMode}
				items={releaseModeItems}
				class="h-8 w-32 text-xs"
			/>
			{#if hasChanges}
				<Button
					size="sm"
					variant="outline"
					onclick={handleSaveSettings}
					disabled={isUpdating}
					class="h-7 px-2 text-xs"
				>
					{#if isUpdating}<Loader2 class="h-3 w-3 animate-spin" />{:else}OK{/if}
				</Button>
			{/if}
		</div>

		<!-- Scheduled date (inline) -->
		{#if releaseMode === 'scheduled'}
			<Input type="datetime-local" bind:value={scheduledDate} class="h-8 w-auto text-xs" />
		{/if}

		<!-- Immediate warning -->
		{#if releaseMode === 'immediate'}
			<Badge variant="destructive" class="gap-1 text-xs">
				<AlertTriangle class="h-3 w-3" />
				Visible immediatement
			</Badge>
		{/if}

		<div class="flex-1"></div>

		<!-- Exercise config popover -->
		<Popover.Root bind:open={exercisePopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm" class="h-8 gap-1.5 text-xs">
						<Settings2 class="h-3.5 w-3.5" />
						Ex: {visibleCorrectionsCount}/{exercises.length}
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-80 p-0" align="end">
				<div class="border-b px-3 py-2">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">Exercices visibles</span>
						<div class="flex gap-1">
							<Button
								variant="ghost"
								size="sm"
								class="h-6 px-2 text-xs"
								onclick={() => handleToggleAll(true)}
								disabled={isLoadingExercises}>Tous</Button
							>
							<Button
								variant="ghost"
								size="sm"
								class="h-6 px-2 text-xs"
								onclick={() => handleToggleAll(false)}
								disabled={isLoadingExercises}>Aucun</Button
							>
						</div>
					</div>
				</div>
				<div class="max-h-64 overflow-y-auto p-2">
					{#if isLoadingExercises}
						<div class="flex items-center justify-center py-4">
							<Loader2 class="h-4 w-4 animate-spin" />
						</div>
					{:else}
						{#each exercises as exercise (exercise.id)}
							<div class="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50">
								<span class="text-sm">
									<span class="text-muted-foreground">#{exercise.position}</span>
									{exercise.title || `Exercice ${exercise.position}`}
								</span>
								<MyCheckbox
									checked={exercise.show_correction}
									onchange={(checked) => handleToggleExercise(exercise.id, checked)}
									disabled={isTogglingExercise === exercise.id}
								/>
							</div>
						{/each}
					{/if}
				</div>
			</Popover.Content>
		</Popover.Root>

		<!-- PDF preview -->
		<Button
			variant="outline"
			size="sm"
			onclick={handlePreviewCorrection}
			disabled={isPreviewing}
			class="h-8 gap-1.5 text-xs"
		>
			{#if isPreviewing}
				<Loader2 class="h-3.5 w-3.5 animate-spin" />
			{:else}
				<FileText class="h-3.5 w-3.5" />
			{/if}
			PDF
		</Button>
	</div>
</div>
