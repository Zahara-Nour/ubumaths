<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let editingSchool = $state<any>(null);
	let activeTab = $state<'single' | 'bulk'>('single');
	let bulkData = $state('');
	let parsedSchools = $state<any[]>([]);
	let parseError = $state('');

	let formData = $state({
		name: '',
		city: '',
		country: '',
		address: '',
		logo_url: '',
		is_active: true
	});

	function openCreateModal() {
		editingSchool = null;
		activeTab = 'single';
		bulkData = '';
		parsedSchools = [];
		parseError = '';
		formData = {
			name: '',
			city: '',
			country: '',
			address: '',
			logo_url: '',
			is_active: true
		};
		showModal = true;
	}


	function openEditModal(school: any) {
		editingSchool = school;
		activeTab = 'single';
		formData = {
			name: school.name,
			city: school.city,
			country: school.country,
			address: school.address || '',
			logo_url: school.logo_url || '',
			is_active: school.is_active
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingSchool = null;
		bulkData = '';
		parsedSchools = [];
		parseError = '';
	}

	function parseBulkData() {
		parseError = '';
		parsedSchools = [];

		if (!bulkData.trim()) {
			parseError = 'Please paste data from your spreadsheet';
			return;
		}

		const lines = bulkData.trim().split('\n');
		const schools: any[] = [];

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
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">School Management</h1>
			<p class="mt-2 text-muted-foreground">
				Manage schools in the system
			</p>
		</div>
		<Button onclick={openCreateModal}>
			+ Add School
		</Button>
	</div>

	<!-- Schools Table -->
	<div class="bg-card rounded-lg shadow border border-border overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-muted border-b border-border">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
							School Name
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Location
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Address
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Périodes
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Status
						</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each data.schools as school (school.id)}
						<tr class="hover:bg-muted/50 transition-colors">
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex items-center">
									{#if school.logo_url}
										<img src={school.logo_url} alt={school.name} class="h-8 w-8 rounded mr-3" />
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
								<div class="text-sm text-muted-foreground">
									{school.timetable?.periods?.length || 0} période{(school.timetable?.periods?.length || 0) !== 1 ? 's' : ''}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								{#if school.is_active}
									<span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
										Active
									</span>
								{:else}
									<span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
										Inactive
									</span>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
								<a href="/dashboard/admin/schools/{school.id}/timetable">
									<Button variant="ghost" size="sm">
										Emploi du Temps
									</Button>
								</a>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => openEditModal(school)}
								>
									Modifier
								</Button>
								<form method="POST" action="?/delete" use:enhance class="inline">
									<input type="hidden" name="id" value={school.id} />
									<Button
										type="submit"
										variant="ghost"
										size="sm"
										class="text-destructive hover:text-destructive"
										onclick={(e) => {
											if (!confirm('Êtes-vous sûr de vouloir supprimer cette école ?')) {
												e.preventDefault();
											}
										}}
									>
										Supprimer
									</Button>
								</form>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-6 py-8 text-center text-muted-foreground">
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
	<div class="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
		<div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 sm:p-0">
			<!-- Background overlay -->
			<div
				class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
				aria-hidden="true"
				onclick={closeModal}
			></div>

			<!-- Modal panel -->
			<div class="relative inline-block align-middle bg-card rounded-lg text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full border border-border">
				<!-- Modal Header -->
				<div class="bg-card px-6 pt-6 pb-4 border-b border-border">
					<h3 class="text-lg font-medium text-foreground" id="modal-title">
						{editingSchool ? 'Edit School' : 'Add School(s)'}
					</h3>

					<!-- Tabs (only show for new schools, not editing) -->
					{#if !editingSchool}
						<div class="mt-4 flex space-x-1 bg-muted p-1 rounded-lg">
							<button
								type="button"
								onclick={() => activeTab = 'single'}
								class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
								style="background-color: {activeTab === 'single' ? '#2563eb' : 'transparent'}; color: {activeTab === 'single' ? 'white' : '#9ca3af'}; box-shadow: {activeTab === 'single' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};"
							>
								Single Entry
							</button>

							<button
								type="button"
								onclick={() => activeTab = 'bulk'}
								class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
								style="background-color: {activeTab === 'bulk' ? '#2563eb' : 'transparent'}; color: {activeTab === 'bulk' ? 'white' : '#9ca3af'}; box-shadow: {activeTab === 'bulk' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};"
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
							<div>
								<label for="name" class="block text-sm font-medium text-foreground mb-1">
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
									<label for="city" class="block text-sm font-medium text-foreground mb-1">
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
									<label for="country" class="block text-sm font-medium text-foreground mb-1">
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
								<label for="address" class="block text-sm font-medium text-foreground mb-1">
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
								<label for="logo_url" class="block text-sm font-medium text-foreground mb-1">
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

							{#if editingSchool}
								<div class="flex items-center gap-2">
									<input
										type="checkbox"
										name="is_active"
										id="is_active"
										value="true"
										bind:checked={formData.is_active}
										class="h-4 w-4 rounded border-input"
									/>
									<label for="is_active" class="text-sm text-foreground">
										School is active
									</label>
								</div>
							{/if}
						</div>
					</div>

					<div class="bg-muted px-6 py-3 flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onclick={closeModal}
						>
							Cancel
						</Button>
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
								<label for="bulk-data" class="block text-sm font-medium text-foreground mb-2">
									Paste from Spreadsheet
								</label>
								<p class="text-xs text-muted-foreground mb-2">
									Paste data from Excel/Google Sheets with columns: Name | City | Country | Address (optional) | Logo URL (optional)
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
								<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
									{parseError}
								</div>
							{/if}

							{#if parsedSchools.length > 0}
								<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
									✓ Found {parsedSchools.length} school{parsedSchools.length !== 1 ? 's' : ''} to import
								</div>

								<!-- Preview -->
								<div class="border border-border rounded-md overflow-hidden">
									<div class="bg-muted px-3 py-2 text-sm font-medium text-foreground">
										Preview
									</div>
									<div class="max-h-48 overflow-y-auto">
										<table class="w-full text-sm">
											<thead class="bg-muted">
												<tr>
													<th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
													<th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">City</th>
													<th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Country</th>
												</tr>
											</thead>
											<tbody>
												{#each parsedSchools as school}
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

					<div class="bg-muted px-6 py-3 flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onclick={closeModal}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={parsedSchools.length === 0}
						>
							Import {parsedSchools.length} School{parsedSchools.length !== 1 ? 's' : ''}
						</Button>
					</div>
				</form>
				{/if}
			</div>
		</div>
	</div>
{/if}
