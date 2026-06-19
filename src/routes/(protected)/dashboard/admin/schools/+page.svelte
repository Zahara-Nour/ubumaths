<script lang="ts">
	import type { PageData } from './$types';
	import type { Database } from '$lib/types/database';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import SchoolConfigModal from '$lib/components/admin/SchoolConfigModal.svelte';
	import TypedConfirmDialog from '$lib/components/admin/TypedConfirmDialog.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';

	let { data }: { data: PageData } = $props();

	// Mirrors the normalized payload from GET /api/admin/annuaire/search.
	type AnnuaireSchool = {
		uai: string;
		name: string;
		type: string;
		city: string;
		postalCode: string;
		address: string;
		academy: string;
	};

	let showModal = $state(false);
	let editingSchool = $state<Database['public']['Tables']['schools']['Row'] | null>(null);
	let activeTab = $state<'single' | 'bulk'>('single');
	let bulkData = $state('');
	let parsedSchools = $state<
		Array<{ name: string; city?: string; country?: string; address?: string; logo_url?: string }>
	>([]);
	let parseError = $state('');

	// Configuration modal state
	let showConfigModal = $state(false);
	let configuringSchool = $state<(typeof data.schools)[number] | null>(null);

	let formData = $state({
		name: '',
		city: '',
		country: '',
		address: '',
		logo_url: '',
		uai: '',
		is_active: true
	});

	// Annuaire de l'éducation autocomplete (auto-fills UAI + coordinates).
	let annuaireQuery = $state('');
	let annuaireResults = $state<AnnuaireSchool[]>([]);
	let annuaireLoading = $state(false);
	let annuaireOpen = $state(false);
	let annuaireTimer: ReturnType<typeof setTimeout> | undefined;
	// Monotonic token: drops responses from superseded (slower) requests.
	let annuaireSeq = 0;

	function resetAnnuaire() {
		clearTimeout(annuaireTimer);
		annuaireQuery = '';
		annuaireResults = [];
		annuaireOpen = false;
		annuaireLoading = false;
	}

	function openCreateModal() {
		editingSchool = null;
		activeTab = 'single';
		bulkData = '';
		parsedSchools = [];
		parseError = '';
		resetAnnuaire();
		formData = {
			name: '',
			city: '',
			country: '',
			address: '',
			logo_url: '',
			uai: '',
			is_active: true
		};
		showModal = true;
	}

	function openEditModal(school: (typeof data.schools)[number]) {
		editingSchool = school;
		activeTab = 'single';
		resetAnnuaire();
		formData = {
			name: school.name,
			city: school.city,
			country: school.country,
			address: school.address || '',
			logo_url: school.logo_url || '',
			uai: school.uai || '',
			is_active: school.is_active
		};
		showModal = true;
	}

	function onAnnuaireInput() {
		clearTimeout(annuaireTimer);
		const q = annuaireQuery.trim();
		if (q.length < 2) {
			annuaireResults = [];
			annuaireOpen = false;
			return;
		}
		annuaireTimer = setTimeout(searchAnnuaire, 300);
	}

	async function searchAnnuaire() {
		const q = annuaireQuery.trim();
		if (q.length < 2) return;
		const seq = ++annuaireSeq;
		annuaireLoading = true;
		annuaireOpen = true;
		try {
			const res = await fetch(`/api/admin/annuaire/search?q=${encodeURIComponent(q)}`);
			const results = res.ok ? ((await res.json()).schools ?? []) : [];
			if (seq !== annuaireSeq) return; // superseded by a newer search
			annuaireResults = results;
		} catch {
			if (seq === annuaireSeq) annuaireResults = [];
		} finally {
			if (seq === annuaireSeq) annuaireLoading = false;
		}
	}

	function selectAnnuaireSchool(school: AnnuaireSchool) {
		formData.uai = school.uai;
		if (school.name) formData.name = school.name;
		if (school.city) formData.city = school.city;
		if (!formData.country) formData.country = 'France';
		if (school.address) {
			formData.address = [school.address, school.postalCode, school.city]
				.filter(Boolean)
				.join(', ');
		}
		resetAnnuaire();
	}

	function closeModal() {
		showModal = false;
		editingSchool = null;
		bulkData = '';
		parsedSchools = [];
		parseError = '';
		resetAnnuaire();
	}

	function parseBulkData() {
		parseError = '';
		parsedSchools = [];

		if (!bulkData.trim()) {
			parseError = 'Please paste data from your spreadsheet';
			return;
		}

		const lines = bulkData.trim().split('\n');
		const schools: {
			name: string;
			city?: string;
			country?: string;
			address?: string;
			logo_url?: string;
		}[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			// Split by tab (from spreadsheet) or multiple spaces
			const columns = line.split(/\t+/);

			if (columns.length < 3) {
				parseError = `Line ${i + 1}: Need at least 3 columns (Name, City, Country)`;
				return;
			}

			schools.push({
				name: columns[0]?.trim() || '',
				city: columns[1]?.trim() || '',
				country: columns[2]?.trim() || '',
				address: columns[3]?.trim() || '',
				logo_url: columns[4]?.trim() || ''
			});
		}

		if (schools.length === 0) {
			parseError = 'No valid schools found in the pasted data';
			return;
		}

		parsedSchools = schools;
	}

	function openConfigModal(school: (typeof data.schools)[number]) {
		configuringSchool = school;
		showConfigModal = true;
	}

	function handleConfigSave(updatedSchool: (typeof data.schools)[number]) {
		// Update local school data
		data.schools = data.schools.map((s) => (s.id === updatedSchool.id ? updatedSchool : s));
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">School Management</h1>
			<p class="mt-2 text-muted-foreground">Manage schools in the system</p>
		</div>
		<Button onclick={openCreateModal}>+ Add School</Button>
	</div>

	<!-- Schools Table -->
	<div class="overflow-hidden rounded-lg border border-border bg-card shadow">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="border-b border-border bg-muted">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							School Name
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Location
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Address
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							UAI / RNE
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Périodes
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Status
						</th>
						<th
							class="px-6 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each data.schools as school (school.id)}
						<tr class="transition-colors hover:bg-muted/50">
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex items-center">
									{#if school.logo_url}
										<img src={school.logo_url} alt={school.name} class="mr-3 h-8 w-8 rounded" />
									{/if}
									<div class="text-sm font-medium text-foreground">{school.name}</div>
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-muted-foreground">
									{school.city}, {school.country}
								</div>
							</td>
							<td class="px-6 py-4">
								<div class="text-sm text-muted-foreground">
									{school.address || '—'}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="font-mono text-sm text-muted-foreground">
									{school.uai || '—'}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-muted-foreground">
									{school.timetable?.periods?.length || 0} période{(school.timetable?.periods
										?.length || 0) !== 1
										? 's'
										: ''}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								{#if school.is_active}
									<span
										class="inline-flex rounded-full bg-success/10 px-2 py-1 text-xs leading-5 font-semibold text-success"
									>
										Active
									</span>
								{:else}
									<span
										class="inline-flex rounded-full bg-muted px-2 py-1 text-xs leading-5 font-semibold text-muted-foreground"
									>
										Inactive
									</span>
								{/if}
							</td>
							<td class="space-x-2 px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
								<a
									href="/dashboard/admin/schools/{school.id}/organisation"
									data-sveltekit-preload-data="hover"
								>
									<Button variant="ghost" size="sm">Organisation</Button>
								</a>
								<Button variant="ghost" size="sm" onclick={() => openConfigModal(school)}>
									Configuration
								</Button>
								<Button variant="ghost" size="sm" onclick={() => openEditModal(school)}>
									Modifier
								</Button>
								<TypedConfirmDialog
									expected={school.name}
									action="?/delete"
									title="Supprimer l'école « {school.name} »"
									description="Cette action est irréversible. L'école et sa configuration seront supprimées."
									successMessage="École supprimée"
								>
									{#snippet trigger(props)}
										<Button
											{...props}
											variant="ghost"
											size="sm"
											class="text-destructive hover:text-destructive"
										>
											Supprimer
										</Button>
									{/snippet}
									{#snippet hiddenFields()}
										<input type="hidden" name="id" value={school.id} />
									{/snippet}
								</TypedConfirmDialog>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-6 py-8 text-center text-muted-foreground">
								Aucune école trouvée. Cliquez sur "Add School" pour en créer une.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal -->
{#if showModal}
	<div
		class="fixed inset-0 z-[100] overflow-y-auto"
		aria-labelledby="modal-title"
		role="dialog"
		aria-modal="true"
	>
		<div class="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 sm:p-0">
			<!-- Background overlay -->
			<div
				class="bg-opacity-50 fixed inset-0 bg-black transition-opacity"
				aria-hidden="true"
				onclick={closeModal}
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block transform overflow-visible rounded-lg border border-border bg-card text-left align-middle shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl"
			>
				<!-- Modal Header -->
				<div class="border-b border-border bg-card px-6 pt-6 pb-4">
					<h3 class="text-lg font-medium text-foreground" id="modal-title">
						{editingSchool ? 'Edit School' : 'Add School(s)'}
					</h3>

					<!-- Tabs (only show for new schools, not editing) -->
					{#if !editingSchool}
						<div class="mt-4 flex space-x-1 rounded-lg bg-muted p-1">
							<button
								type="button"
								onclick={() => (activeTab = 'single')}
								class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 {activeTab ===
								'single'
									? 'bg-primary text-primary-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'}"
							>
								Single Entry
							</button>

							<button
								type="button"
								onclick={() => (activeTab = 'bulk')}
								class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 {activeTab ===
								'bulk'
									? 'bg-primary text-primary-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'}"
							>
								Bulk Import
							</button>
						</div>
					{/if}
				</div>

				<!-- Tab Content -->
				{#if activeTab === 'single' || editingSchool}
					<form
						method="POST"
						action="?/{editingSchool ? 'update' : 'create'}"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update();
								if (result.type === 'success') {
									closeModal();
								}
							};
						}}
					>
						{#if editingSchool}
							<input type="hidden" name="id" value={editingSchool.id} />
						{/if}

						<div class="bg-card px-6 py-4">
							<div class="space-y-4">
								<!-- Annuaire de l'éducation lookup -->
								<div class="rounded-md border border-dashed border-border p-3">
									<label for="annuaire" class="mb-1 block text-sm font-medium text-foreground">
										Rechercher dans l'Annuaire de l'Éducation nationale
									</label>
									<p class="mb-2 text-xs text-muted-foreground">
										Sélectionnez l'établissement pour remplir automatiquement l'UAI/RNE et les
										coordonnées.
									</p>
									<div class="relative">
										<Input
											id="annuaire"
											type="text"
											autocomplete="off"
											bind:value={annuaireQuery}
											oninput={onAnnuaireInput}
											placeholder="Nom de l'établissement (ex. Collège Jean Moulin)"
										/>
										{#if annuaireOpen}
											<div
												class="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg"
											>
												{#if annuaireLoading}
													<div class="px-3 py-2 text-sm text-muted-foreground">Recherche…</div>
												{:else if annuaireResults.length === 0}
													<div class="px-3 py-2 text-sm text-muted-foreground">
														Aucun établissement trouvé.
													</div>
												{:else}
													{#each annuaireResults as school (school.uai)}
														<button
															type="button"
															onclick={() => selectAnnuaireSchool(school)}
															class="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
														>
															<span class="font-medium text-foreground">{school.name}</span>
															<span class="text-muted-foreground"> — {school.city}</span>
															<span class="ml-1 text-xs text-muted-foreground"
																>({school.uai}{school.type ? ` · ${school.type}` : ''})</span
															>
														</button>
													{/each}
												{/if}
											</div>
										{/if}
									</div>
								</div>

								<div>
									<label for="name" class="mb-1 block text-sm font-medium text-foreground">
										School Name *
									</label>
									<Input
										type="text"
										name="name"
										id="name"
										required
										bind:value={formData.name}
										placeholder="Enter school name"
									/>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="city" class="mb-1 block text-sm font-medium text-foreground">
											City *
										</label>
										<Input
											type="text"
											name="city"
											id="city"
											required
											bind:value={formData.city}
											placeholder="Enter city"
										/>
									</div>

									<div>
										<label for="country" class="mb-1 block text-sm font-medium text-foreground">
											Country *
										</label>
										<Input
											type="text"
											name="country"
											id="country"
											required
											bind:value={formData.country}
											placeholder="Enter country"
										/>
									</div>
								</div>

								<div>
									<label for="address" class="mb-1 block text-sm font-medium text-foreground">
										Address
									</label>
									<Textarea
										name="address"
										id="address"
										rows={2}
										bind:value={formData.address}
										placeholder="Enter full address (optional)"
									/>
								</div>

								<div>
									<label for="logo_url" class="mb-1 block text-sm font-medium text-foreground">
										Logo URL
									</label>
									<Input
										type="url"
										name="logo_url"
										id="logo_url"
										bind:value={formData.logo_url}
										placeholder="https://example.com/logo.png"
									/>
								</div>

								<div>
									<label for="uai" class="mb-1 block text-sm font-medium text-foreground">
										UAI / RNE
									</label>
									<Input
										type="text"
										name="uai"
										id="uai"
										maxlength={8}
										bind:value={formData.uai}
										placeholder="0750001H"
									/>
									<p class="mt-1 text-xs text-muted-foreground">
										Code établissement (7 chiffres + 1 lettre). Rempli automatiquement via
										l'Annuaire.
									</p>
								</div>

								{#if editingSchool}
									<div>
										<!-- Hidden field carries the value to the form action (MyCheckbox renders a button). -->
										<input type="hidden" name="is_active" value={formData.is_active} />
										<MyCheckbox bind:checked={formData.is_active} label="School is active" />
									</div>
								{/if}
							</div>
						</div>

						<div class="flex justify-end gap-2 bg-muted px-6 py-3">
							<Button type="button" variant="outline" onclick={closeModal}>Cancel</Button>
							<Button type="submit">
								{editingSchool ? 'Update' : 'Create'}
							</Button>
						</div>
					</form>
				{:else}
					<!-- Bulk Import Tab -->
					<form
						method="POST"
						action="?/bulk_create"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update();
								if (result.type === 'success') {
									closeModal();
								}
							};
						}}
					>
						<div class="bg-card px-6 py-4">
							<div class="space-y-4">
								<div>
									<label for="bulk-data" class="mb-2 block text-sm font-medium text-foreground">
										Paste from Spreadsheet
									</label>
									<p class="mb-2 text-xs text-muted-foreground">
										Paste data from Excel/Google Sheets with columns: Name | City | Country |
										Address (optional) | Logo URL (optional)
									</p>
									<Textarea
										id="bulk-data"
										bind:value={bulkData}
										oninput={parseBulkData}
										rows={8}
										placeholder="School Name	City	Country	Address	Logo URL
Example School	Paris	France	123 Main St
Another School	London	UK		"
										class="font-mono text-sm"
									/>
								</div>

								{#if parseError}
									<div
										class="rounded border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive"
									>
										{parseError}
									</div>
								{/if}

								{#if parsedSchools.length > 0}
									<div
										class="rounded border border-success/50 bg-success/10 px-4 py-3 text-success"
									>
										✓ Found {parsedSchools.length} school{parsedSchools.length !== 1 ? 's' : ''} to import
									</div>

									<!-- Preview -->
									<div class="overflow-hidden rounded-md border border-border">
										<div class="bg-muted px-3 py-2 text-sm font-medium text-foreground">
											Preview
										</div>
										<div class="max-h-48 overflow-y-auto">
											<table class="w-full text-sm">
												<thead class="bg-muted">
													<tr>
														<th
															class="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
															>Name</th
														>
														<th
															class="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
															>City</th
														>
														<th
															class="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
															>Country</th
														>
													</tr>
												</thead>
												<tbody>
													{#each parsedSchools as school (school.name)}
														<tr class="border-t border-border">
															<td class="px-3 py-2 text-foreground">{school.name}</td>
															<td class="px-3 py-2 text-muted-foreground">{school.city}</td>
															<td class="px-3 py-2 text-muted-foreground">{school.country}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>

									<!-- Hidden input with JSON data -->
									<input type="hidden" name="schools" value={JSON.stringify(parsedSchools)} />
								{/if}
							</div>
						</div>

						<div class="flex justify-end gap-2 bg-muted px-6 py-3">
							<Button type="button" variant="outline" onclick={closeModal}>Cancel</Button>
							<Button type="submit" disabled={parsedSchools.length === 0}>
								Import {parsedSchools.length} School{parsedSchools.length !== 1 ? 's' : ''}
							</Button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Configuration Modal -->
{#if configuringSchool}
	<SchoolConfigModal
		bind:open={showConfigModal}
		school={configuringSchool}
		onsave={handleConfigSave}
	/>
{/if}
