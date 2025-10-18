<script lang="ts">
	/**
	 * Student Import Page
	 *
	 * Allows admins to pre-populate students before they authenticate with Google.
	 * Features:
	 * - Unified drop zone for CSV files and spreadsheet paste
	 * - Drag & drop CSV files
	 * - Paste directly from Excel/Google Sheets (Ctrl+V)
	 * - Click to browse for files
	 * - Preview students before importing
	 * - Validate email format and duplicates
	 * - Assign students to classes using join codes
	 * - View pending students (not yet logged in)
	 * - View activated students (already logged in)
	 */

	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PendingStudent, School } from '$lib/types/database';
	import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';

	let { data }: { data: PageData } = $props();

	// Parsed student data (common to both CSV and paste methods)
	type StudentRow = {
		email: string;
		firstname: string;
		lastname: string;
		grade: string | null;
		gender: string | null;
		class_codes: string[];
	};

	let csvPreview = $state<StudentRow[]>([]);
	let showPreview = $state(false);
	let isProcessing = $state(false);

	// CSV Upload State
	let csvFile = $state<File | null>(null);
	let fileInput: HTMLInputElement;

	// Paste State
	let pasteText = $state('');

	// Drag and drop state
	let isDragging = $state(false);

	// Selected school for import
	let selectedSchoolId = $state<string>('');
	let selectedSchool = $derived(data.schools.find((s) => s.id === selectedSchoolId));

	// Class code mapping (join_code -> class_id)
	let classCodeMap = $derived.by(() => {
		const map = new Map<string, string>();
		data.classes.forEach((c) => {
			map.set(c.join_code.toUpperCase(), c.id);
		});
		return map;
	});

	/**
	 * Parse a single line of data (CSV or TSV)
	 */
	function parseLine(line: string): string[] {
		// Try to detect if it's tab-separated (from spreadsheet paste)
		if (line.includes('\t')) {
			return line.split('\t').map((s) => s.trim());
		}
		// Otherwise treat as CSV
		return line.split(',').map((s) => s.trim());
	}

	/**
	 * Parse text data into student objects
	 */
	function parseStudentData(text: string): StudentRow[] {
		const lines = text.split('\n').filter((line) => line.trim());

		// Skip header row if it looks like a header
		const dataLines =
			lines[0]?.toLowerCase().includes('email') ||
			lines[0]?.toLowerCase().includes('prénom') ||
			lines[0]?.toLowerCase().includes('firstname')
				? lines.slice(1)
				: lines;

		const students = dataLines.map((line) => {
			const parts = parseLine(line);
			const [email = '', firstname = '', lastname = '', grade = '', gender = '', ...classCodes] =
				parts;

			return {
				email: email.trim(),
				firstname: firstname.trim(),
				lastname: lastname.trim(),
				grade: grade.trim() || null,
				gender: gender === 'boy' || gender === 'girl' ? gender : null,
				class_codes: classCodes.map((c) => c.trim().toUpperCase()).filter((c) => c.length > 0) // Remove empty codes
			};
		});

		return students.filter((s) => s.email && s.firstname && s.lastname);
	}

	/**
	 * Validate student data
	 */
	function validateStudents(students: StudentRow[]): {
		valid: boolean;
		invalidEmails: number;
		invalidClassCodes: string[];
	} {
		// Check emails
		const invalidEmails = students.filter((s) => !s.email.includes('@')).length;

		// Check class codes
		const invalidClassCodes: string[] = [];
		students.forEach((s) => {
			s.class_codes.forEach((code) => {
				if (!classCodeMap.has(code) && !invalidClassCodes.includes(code)) {
					invalidClassCodes.push(code);
				}
			});
		});

		return {
			valid: invalidEmails === 0 && invalidClassCodes.length === 0,
			invalidEmails,
			invalidClassCodes
		};
	}

	/**
	 * Parse CSV file into array of student objects
	 */
	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		await processFile(file);
	}

	/**
	 * Process a file (from upload or drag-drop)
	 */
	async function processFile(file: File) {
		csvFile = file;
		isProcessing = true;

		try {
			const text = await file.text();
			pasteText = text; // Update textarea with file content
			await processData(text);
			toaster.success(`${csvPreview.length} élève(s) chargé(s) depuis le fichier`);
		} catch (error) {
			toaster.error('Erreur lors de la lecture du fichier');
			console.error(error);
		} finally {
			isProcessing = false;
		}
	}

	/**
	 * Process data (common logic for paste and file upload)
	 */
	async function processData(text: string) {
		const students = parseStudentData(text);

		if (students.length === 0) {
			toaster.error('Aucune donnée valide trouvée');
			return;
		}

		const validation = validateStudents(students);

		if (!validation.valid) {
			if (validation.invalidEmails > 0) {
				toaster.error(`${validation.invalidEmails} email(s) invalide(s) détecté(s)`);
			}
			if (validation.invalidClassCodes.length > 0) {
				toaster.error(`Code(s) de classe invalide(s): ${validation.invalidClassCodes.join(', ')}`);
			}
			return;
		}

		csvPreview = students;
		showPreview = true;
	}

	/**
	 * Handle paste from spreadsheet or analyze button click
	 */
	async function handleAnalyze() {
		if (!pasteText.trim()) {
			toaster.error('Veuillez coller ou glisser des données');
			return;
		}

		isProcessing = true;

		try {
			await processData(pasteText);
			toaster.success(`${csvPreview.length} élève(s) chargé(s)`);
		} catch (error) {
			toaster.error('Erreur lors du traitement des données');
			console.error(error);
		} finally {
			isProcessing = false;
		}
	}

	/**
	 * Handle drag over
	 */
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	/**
	 * Handle drag leave
	 */
	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	/**
	 * Handle file drop
	 */
	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const file = event.dataTransfer?.files?.[0];
		if (!file) return;

		// Only accept CSV files
		if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
			toaster.error('Veuillez glisser un fichier CSV');
			return;
		}

		await processFile(file);
	}

	/**
	 * Handle click on drop zone to open file picker
	 */
	function handleDropZoneClick() {
		fileInput?.click();
	}

	/**
	 * Clear the preview
	 */
	function handleClearPreview() {
		csvFile = null;
		csvPreview = [];
		showPreview = false;
		pasteText = '';
		if (fileInput) fileInput.value = '';
	}

	/**
	 * Get badge class for student status
	 */
	function getStatusBadgeClass(isActivated: boolean): string {
		return isActivated
			? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
			: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
	}

	/**
	 * Format date for display
	 */
	function formatDate(dateString: string | null): string {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	/**
	 * Get class names from codes
	 */
	function getClassNamesFromCodes(codes: string[]): string[] {
		return codes
			.map((code) => {
				const classId = classCodeMap.get(code);
				return classId ? data.classes.find((c) => c.id === classId)?.name : null;
			})
			.filter((name): name is string => !!name);
	}
</script>

<div class="container mx-auto space-y-8 p-6">
	<div class="space-y-2">
		<h1 class="text-3xl font-bold">Importer des élèves</h1>
		<p class="text-muted-foreground">
			Pré-remplissez les données des élèves avant leur première connexion avec Google
		</p>
	</div>

	<!-- Import Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Importer des données</Card.Title>
			<Card.Description>
				Collez depuis un tableur, glissez un fichier CSV, ou cliquez pour parcourir.<br />
				Format: email, prénom, nom, niveau, genre (boy/girl), code_classe1, code_classe2, ...
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- School Selection -->
			<div class="space-y-2">
				<Label for="school">École *</Label>
				<select
					id="school"
					bind:value={selectedSchoolId}
					class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="">Sélectionner une école</option>
					{#each data.schools as school (school.id)}
						<option value={school.id}>{school.name}</option>
					{/each}
				</select>
			</div>

			{#if !selectedSchoolId}
				<p class="text-sm text-muted-foreground">Veuillez d'abord sélectionner une école</p>
			{:else}
				<!-- Unified Drop Zone -->
				<div class="space-y-4">
					<!-- Hidden file input -->
					<input
						bind:this={fileInput}
						type="file"
						accept=".csv"
						onchange={handleFileUpload}
						class="hidden"
					/>

					<!-- Drop zone with textarea -->
					<div class="space-y-2">
						<Label for="drop-zone">Données des élèves</Label>
						<div
							class="relative rounded-lg border-2 border-dashed transition-all {isDragging
								? 'border-primary bg-primary/5'
								: 'border-border hover:border-primary/50'}"
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							ondrop={handleDrop}
						>
							<Textarea
								id="drop-zone"
								bind:value={pasteText}
								placeholder="✍️ Tapez ou collez vos données ici&#10;📋 Copiez-collez (Ctrl+V) depuis Excel/Google Sheets&#10;📁 Ou glissez-déposez un fichier CSV&#10;&#10;Format: email, prénom, nom, niveau, genre, code_classe1, code_classe2, ...&#10;&#10;Exemple:&#10;alice@school.com, Alice, Dupont, 6ème, girl, MATH6A&#10;bob@school.com, Bob, Martin, 6ème, boy, MATH6A, MATH6B"
								class="min-h-[200px] cursor-text resize-none border-0 bg-transparent font-mono text-sm focus:ring-0 focus-visible:ring-0"
								disabled={isProcessing}
							/>
							{#if isDragging}
								<div
									class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10"
								>
									<p class="text-lg font-semibold text-primary">📁 Déposez le fichier CSV ici</p>
								</div>
							{/if}
						</div>
						<div class="flex items-center justify-between">
							<p class="text-xs text-muted-foreground">
								💡 <strong>Astuce :</strong> Tapez, collez depuis un tableur, ou glissez un fichier CSV
							</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onclick={handleDropZoneClick}
								disabled={isProcessing}
							>
								📁 Parcourir
							</Button>
						</div>
					</div>

					<Button onclick={handleAnalyze} disabled={isProcessing || !pasteText.trim()}>
						{isProcessing ? 'Traitement...' : 'Analyser les données'}
					</Button>
				</div>
			{/if}

			<!-- Preview Section -->
			{#if showPreview && csvPreview.length > 0}
				<div class="space-y-4">
					<Separator />
					<div class="space-y-2">
						<h3 class="font-semibold">Aperçu ({csvPreview.length} élèves)</h3>
						<div class="max-h-96 overflow-y-auto rounded-md border">
							<table class="w-full text-sm">
								<thead class="sticky top-0 bg-muted">
									<tr>
										<th class="p-2 text-left">Email</th>
										<th class="p-2 text-left">Prénom</th>
										<th class="p-2 text-left">Nom</th>
										<th class="p-2 text-left">Niveau</th>
										<th class="p-2 text-left">Genre</th>
										<th class="p-2 text-left">Classes</th>
									</tr>
								</thead>
								<tbody>
									{#each csvPreview as student (student.email)}
										<tr class="border-t hover:bg-muted/50">
											<td class="p-2">{student.email}</td>
											<td class="p-2">{student.firstname}</td>
											<td class="p-2">{student.lastname}</td>
											<td class="p-2">{student.grade || '-'}</td>
											<td class="p-2">{student.gender || '-'}</td>
											<td class="p-2">
												{#if student.class_codes.length > 0}
													<div class="flex flex-wrap gap-1">
														{#each student.class_codes as code (code)}
															<Badge variant="outline" class="text-xs">{code}</Badge>
														{/each}
													</div>
												{:else}
													<span class="text-muted-foreground">-</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Import Actions -->
					<form
						method="POST"
						action="?/import"
						use:enhance={() => {
							isProcessing = true;
							return async ({ result, update }) => {
								isProcessing = false;
								if (result.type === 'success') {
									toaster.success('Élèves importés avec succès');
									// Clear entire cache (new students may affect multiple classes)
									teacherStudentsCache.clear();
									handleClearPreview();
								} else if (result.type === 'failure') {
									toaster.error((result.data?.message as string) || "Erreur lors de l'importation");
								}
								await update();
							};
						}}
					>
						<input type="hidden" name="students" value={JSON.stringify(csvPreview)} />
						<input type="hidden" name="school_id" value={selectedSchoolId} />
						<div class="flex gap-2">
							<Button type="submit" disabled={isProcessing}>
								{isProcessing ? 'Importation...' : 'Importer les élèves'}
							</Button>
							<Button type="button" variant="outline" onclick={handleClearPreview}>Annuler</Button>
						</div>
					</form>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Available Classes Reference -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Codes de classe disponibles</Card.Title>
			<Card.Description>Utilisez ces codes pour assigner des élèves aux classes</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.classes.length === 0}
				<p class="py-4 text-center text-muted-foreground">Aucune classe disponible</p>
			{:else}
				<div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
					{#each data.classes as classItem (classItem.id)}
						<div class="flex items-center justify-between rounded-md border p-3">
							<div class="space-y-1">
								<div class="text-sm font-medium">{classItem.name}</div>
								<code class="rounded bg-muted px-2 py-1 font-mono text-xs"
									>{classItem.join_code}</code
								>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Pending Students List -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Élèves en attente</Card.Title>
			<Card.Description>
				Ces élèves ne se sont pas encore connectés pour la première fois
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.pendingStudents.length === 0}
				<p class="py-8 text-center text-muted-foreground">Aucun élève en attente</p>
			{:else}
				<div class="space-y-2">
					{#each data.pendingStudents as student (student.email)}
						<div class="flex items-center justify-between rounded-md border p-3">
							<div class="space-y-1">
								<div class="font-medium">
									{student.firstname}
									{student.lastname}
								</div>
								<div class="text-sm text-muted-foreground">
									{student.email}
								</div>
								<div class="flex flex-wrap gap-1">
									{#if student.grade}
										<Badge variant="outline" class="text-xs">
											{student.grade}
										</Badge>
									{/if}
									{#if student.class_ids && student.class_ids.length > 0}
										{#each getClassNamesFromCodes(student.class_ids
												.map((id: string) => data.classes.find((c) => c.id === id)?.join_code || '')
												.filter((c: string) => c)) as className (className)}
											<Badge variant="secondary" class="text-xs">
												{className}
											</Badge>
										{/each}
									{/if}
								</div>
							</div>
							<Badge class={getStatusBadgeClass(student.is_activated)}>
								{student.is_activated ? 'Activé' : 'En attente'}
							</Badge>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Activated Students List -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Élèves activés</Card.Title>
			<Card.Description>Ces élèves se sont déjà connectés avec Google</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.activatedStudents.length === 0}
				<p class="py-8 text-center text-muted-foreground">Aucun élève activé</p>
			{:else}
				<div class="space-y-2">
					{#each data.activatedStudents as student (student.email)}
						<div class="flex items-center justify-between rounded-md border p-3">
							<div class="space-y-1">
								<div class="font-medium">
									{student.firstname}
									{student.lastname}
								</div>
								<div class="text-sm text-muted-foreground">
									{student.email}
								</div>
								<div class="flex flex-wrap gap-1">
									{#if student.grade}
										<Badge variant="outline" class="text-xs">
											{student.grade}
										</Badge>
									{/if}
									{#if student.class_ids && student.class_ids.length > 0}
										{#each getClassNamesFromCodes(student.class_ids
												.map((id: string) => data.classes.find((c) => c.id === id)?.join_code || '')
												.filter((c: string) => c)) as className (className)}
											<Badge variant="secondary" class="text-xs">
												{className}
											</Badge>
										{/each}
									{/if}
								</div>
							</div>
							<div class="text-right">
								<Badge class={getStatusBadgeClass(student.is_activated)}>Activé</Badge>
								<div class="mt-1 text-xs text-muted-foreground">
									{formatDate(student.activated_at)}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
