<script lang="ts">
	/**
	 * User Management Page
	 *
	 * This page provides a card-based interface for administrators to manage user profiles.
	 * Features include:
	 * - Text search by email, firstname, or lastname
	 * - Browse users by class membership
	 * - View and edit user profiles (name, email, role, school, classes)
	 * - Add/remove users from classes with reactive UI updates
	 */

	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	import type { Profile, Class } from '$lib/types/database'; // Types for future features
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import { Upload } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Search state
	let searchTerm = $state(''); // Current text search input
	let searchResults = $state<unknown[]>([]); // Results from text search
	let classResults = $state<unknown[]>([]); // Results from class filter
	let isSearching = $state(false); // Loading state for text search
	let isSearchingClass = $state(false); // Loading state for class filter
	let selectedClassFilter = $state<string>(''); // Currently selected class ID for filtering
	let searchTimeout: NodeJS.Timeout | null = null; // Debounce timer for search

	// User selection and editing state
	let selectedUser = $state<unknown>(null); // Currently viewed user
	let editedUser = $state<unknown>({}); // Copy of user being edited
	let isEditing = $state(false); // Whether edit mode is active
	let classToAdd = $state(''); // Selected class to add to user

	/**
	 * Utility Functions
	 */

	/**
	 * Get user's full display name
	 * Falls back to full_name or email if first/last names not available
	 */
	function getFullName(user: {
		firstname?: string;
		lastname?: string;
		full_name?: string;
		email: string;
	}): string {
		if (user.firstname && user.lastname) {
			return `${user.firstname} ${user.lastname}`;
		}
		return user.full_name || user.email;
	}

	/**
	 * Get Tailwind classes for role badge styling
	 * Returns color classes based on user role (admin/teacher/student)
	 */
	function getRoleBadgeClass(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
			case 'teacher':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'student':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	/**
	 * Convert array of class IDs to array of class names
	 * Filters out any IDs that don't match existing classes
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function getClassNames(classIds: string[]): string[] {
		// For future: Display class names in user cards
		if (!classIds || classIds.length === 0) return [];
		return classIds
			.map((id) => data.classes.find((c) => c.id === id)?.name)
			.filter((name): name is string => !!name);
	}

	/**
	 * Search Handlers
	 */

	/**
	 * Handle text search input with 300ms debounce
	 * Requires minimum 3 characters to trigger search
	 * Clears class filter when searching by text
	 */
	async function handleSearchInput() {
		// Clear previous timeout
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Require minimum 3 characters
		if (searchTerm.length < 3) {
			searchResults = [];
			return;
		}

		isSearching = true;
		searchTimeout = setTimeout(async () => {
			try {
				const response = await fetch(`/api/admin/search-users?q=${encodeURIComponent(searchTerm)}`);
				const result = await response.json();

				if (result.users) {
					searchResults = result.users;
					classResults = []; // Clear class results when searching
					selectedClassFilter = ''; // Clear class filter
				} else {
					searchResults = [];
				}
			} catch (err) {
				console.error('Search fetch error:', err);
				searchResults = [];
			}
			isSearching = false;
		}, 300);
	}

	/**
	 * Fetch all students in a specific class
	 * Clears text search when filtering by class
	 */
	async function handleClassFilter(classId: string) {
		if (!classId) {
			classResults = [];
			return;
		}

		isSearchingClass = true;

		try {
			const response = await fetch(
				`/api/admin/class-students?class_id=${encodeURIComponent(classId)}`
			);
			const result = await response.json();

			if (result.users) {
				classResults = result.users;
				searchResults = []; // Clear search results when filtering by class
				searchTerm = ''; // Clear search term
			} else {
				classResults = [];
			}
		} catch (err) {
			console.error('Class filter error:', err);
			classResults = [];
		}

		isSearchingClass = false;
	}

	/**
	 * User Selection Handlers
	 */

	/**
	 * Select a user to view/edit in the right panel
	 * Resets edit mode when selecting a new user
	 */
	function selectUser(user: (typeof data.users)[number]) {
		selectedUser = user;
		editedUser = { ...user };
		isEditing = false;
	}

	/**
	 * Enter edit mode for the selected user
	 */
	function startEdit() {
		editedUser = { ...selectedUser };
		isEditing = true;
	}

	/**
	 * Cancel editing and revert changes
	 */
	function cancelEdit() {
		editedUser = { ...selectedUser };
		isEditing = false;
	}

	/**
	 * Class Management Handlers
	 */

	/**
	 * Remove a class from the selected user
	 * Updates UI reactively:
	 * - If viewing the removed class's filter, removes user from the list
	 * - Otherwise, updates user's class list in place
	 */
	async function removeClass(classId: string) {
		if (!selectedUser) return;

		try {
			const response = await fetch('/api/admin/remove-from-class', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: selectedUser.id, classId })
			});

			const result = await response.json();
			if (result.success && result.profile) {
				// Update selected user with server response
				selectedUser = result.profile;
				editedUser = { ...selectedUser };

				// Update in search results if present
				const searchIndex = searchResults.findIndex((u) => u.id === selectedUser.id);
				if (searchIndex !== -1) {
					searchResults[searchIndex] = { ...selectedUser };
				}

				// Handle class filter results
				if (selectedClassFilter === classId) {
					// Removed class matches current filter - remove user from list
					classResults = classResults.filter((u) => u.id !== selectedUser.id);
				} else {
					// Update user in class results if present
					const classIndex = classResults.findIndex((u) => u.id === selectedUser.id);
					if (classIndex !== -1) {
						classResults[classIndex] = { ...selectedUser };
					}
				}
			}
		} catch (err) {
			console.error('Remove class error:', err);
		}
	}

	/**
	 * Add a class to the selected user
	 * Updates UI reactively:
	 * - If added class matches current filter, adds user to the list
	 * - Otherwise, updates user's class list in place
	 */
	async function addClassToUser() {
		if (!selectedUser || !classToAdd) return;

		try {
			const response = await fetch('/api/admin/add-to-class', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: selectedUser.id, classId: classToAdd })
			});

			const result = await response.json();
			if (result.success && result.profile) {
				// Update selected user with server response
				selectedUser = result.profile;
				editedUser = { ...selectedUser };

				// Update in search results if present
				const searchIndex = searchResults.findIndex((u) => u.id === selectedUser.id);
				if (searchIndex !== -1) {
					searchResults[searchIndex] = { ...selectedUser };
				}

				// Handle class filter results
				if (selectedClassFilter === classToAdd) {
					// Added class matches current filter
					const classIndex = classResults.findIndex((u) => u.id === selectedUser.id);
					if (classIndex === -1) {
						// User not in list - add them
						classResults = [...classResults, { ...selectedUser }];
					} else {
						// User already in list - update them
						classResults[classIndex] = { ...selectedUser };
					}
				} else {
					// Update user in class results if present
					const classIndex = classResults.findIndex((u) => u.id === selectedUser.id);
					if (classIndex !== -1) {
						classResults[classIndex] = { ...selectedUser };
					}
				}

				// Reset class selector
				classToAdd = '';
			}
		} catch (err) {
			console.error('Add class error:', err);
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Gestion des Utilisateurs</h1>
			<p class="mt-2 text-muted-foreground">Gérer les profils des étudiants et enseignants</p>
		</div>
		<Button href="/dashboard/admin/import-students">
			<Upload class="mr-2 h-4 w-4" />
			Importer des Étudiants
		</Button>
	</div>

	<!-- CARD LAYOUT -->
	<div class="mt-6">
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Left Panel: Search & Browse -->
			<div class="space-y-4 lg:col-span-1">
				<!-- Search -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Rechercher un utilisateur</Card.Title>
					</Card.Header>
					<Card.Content>
						<Label for="search-input">Email, Prénom ou Nom (min 3 caractères)</Label>
						<Input
							id="search-input"
							type="text"
							placeholder="Rechercher..."
							bind:value={searchTerm}
							oninput={handleSearchInput}
						/>
						{#if isSearching}
							<p class="mt-2 text-sm text-muted-foreground">Recherche en cours...</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Browse by Class -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Parcourir par classe</Card.Title>
					</Card.Header>
					<Card.Content>
						<select
							bind:value={selectedClassFilter}
							onchange={() => handleClassFilter(selectedClassFilter)}
							class="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
						>
							<option value="">Sélectionner une classe</option>
							{#each data.classes as classItem (classItem.id)}
								<option value={classItem.id}>{classItem.name}</option>
							{/each}
						</select>
						{#if isSearchingClass}
							<p class="mt-2 text-sm text-muted-foreground">Chargement...</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Search Results List -->
				{#if searchResults.length > 0 || classResults.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title>
								{#if searchResults.length > 0}
									Résultats de recherche ({searchResults.length})
								{:else if classResults.length > 0}
									{@const className =
										data.classes.find((c) => c.id === selectedClassFilter)?.name || 'Classe'}
									Étudiants de {className} ({classResults.length})
								{/if}
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="max-h-96 space-y-2 overflow-y-auto">
								{#each searchResults.length > 0 ? searchResults : classResults as user (user.id)}
									<button
										type="button"
										onclick={() => selectUser(user)}
										class="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted {selectedUser?.id ===
										user.id
											? 'border-primary bg-primary/10'
											: ''}"
									>
										<div class="flex items-center gap-3">
											<Avatar.Root class="h-10 w-10">
												<Avatar.Image
													src={user.avatar_url || getAvatarFallback(user.role, user.gender)}
													alt={getFullName(user)}
												/>
												<Avatar.Fallback
													>{getAvatarInitials(user.firstname, user.lastname)}</Avatar.Fallback
												>
											</Avatar.Root>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-medium text-foreground">
													{getFullName(user)}
												</p>
												<p class="truncate text-xs text-muted-foreground">{user.email}</p>
											</div>
											<Badge class={getRoleBadgeClass(user.role)}>{user.role}</Badge>
										</div>
									</button>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{:else if searchTerm.length >= 3 && !isSearching}
					<Card.Root>
						<Card.Content class="py-6 text-center">
							<p class="text-sm text-muted-foreground">Aucun résultat trouvé</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<!-- Right Panel: User Profile Card -->
			<div class="lg:col-span-2">
				{#if selectedUser}
					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between">
								<Card.Title>Profil de l'utilisateur</Card.Title>
								{#if !isEditing}
									<Button onclick={startEdit} size="sm">Modifier</Button>
								{:else}
									<div class="flex gap-2">
										<Button type="button" variant="outline" size="sm" onclick={cancelEdit}>
											Annuler
										</Button>
									</div>
								{/if}
							</div>
						</Card.Header>
						<Card.Content class="space-y-6">
							<!-- Avatar -->
							<div class="flex items-center gap-4">
								<Avatar.Root class="h-20 w-20">
									<Avatar.Image
										src={(isEditing ? editedUser.avatar_url : selectedUser.avatar_url) ||
											getAvatarFallback(
												isEditing ? editedUser.role : selectedUser.role,
												isEditing ? editedUser.gender : selectedUser.gender
											)}
										alt={getFullName(isEditing ? editedUser : selectedUser)}
									/>
									<Avatar.Fallback class="text-2xl">
										{getAvatarInitials(
											isEditing ? editedUser.firstname : selectedUser.firstname,
											isEditing ? editedUser.lastname : selectedUser.lastname
										)}
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="flex-1">
									{#if isEditing}
										<Label for="avatar-url">URL de l'avatar</Label>
										<Input id="avatar-url" type="url" bind:value={editedUser.avatar_url} />
									{:else}
										<h3 class="text-xl font-semibold">{getFullName(selectedUser)}</h3>
										<p class="text-sm text-muted-foreground">{selectedUser.email}</p>
									{/if}
								</div>
							</div>

							<Separator />

							<!-- Profile Form -->
							<form
								method="POST"
								action="?/update_profile"
								use:enhance={() => {
									return async ({ result, update }) => {
										await update();
										if (result.type === 'success' && result.data?.profile) {
											// Use the profile returned from the server (includes school relation)
											selectedUser = result.data.profile;
											editedUser = { ...selectedUser };

											// Update in searchResults if present
											const searchIndex = searchResults.findIndex((u) => u.id === selectedUser.id);
											if (searchIndex !== -1) {
												searchResults[searchIndex] = { ...selectedUser };
											}

											// Update in classResults if present
											const classIndex = classResults.findIndex((u) => u.id === selectedUser.id);
											if (classIndex !== -1) {
												classResults[classIndex] = { ...selectedUser };
											}

											isEditing = false;
										} else if (result.type === 'success') {
											// Fallback if profile not returned
											selectedUser = { ...selectedUser, ...editedUser };
											isEditing = false;
										}
									};
								}}
							>
								<input type="hidden" name="user_id" value={selectedUser.id} />

								<div class="space-y-4">
									<!-- Personal Info -->
									<div class="grid grid-cols-2 gap-4">
										<div>
											<Label for="firstname">Prénom</Label>
											{#if isEditing}
												<Input
													id="firstname"
													name="firstname"
													type="text"
													bind:value={editedUser.firstname}
												/>
											{:else}
												<p class="mt-1 text-sm">{selectedUser.firstname || '—'}</p>
											{/if}
										</div>

										<div>
											<Label for="lastname">Nom</Label>
											{#if isEditing}
												<Input
													id="lastname"
													name="lastname"
													type="text"
													bind:value={editedUser.lastname}
												/>
											{:else}
												<p class="mt-1 text-sm">{selectedUser.lastname || '—'}</p>
											{/if}
										</div>
									</div>

									<div>
										<Label for="email">Email</Label>
										{#if isEditing}
											<Input id="email" name="email" type="email" bind:value={editedUser.email} />
										{:else}
											<p class="mt-1 text-sm">{selectedUser.email}</p>
										{/if}
									</div>

									<!-- Gender -->
									<div>
										<Label for="gender">Genre</Label>
										{#if isEditing}
											<select
												id="gender"
												name="gender"
												bind:value={editedUser.gender}
												class="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
											>
												<option value="">Non spécifié</option>
												<option value="boy">Garçon</option>
												<option value="girl">Fille</option>
											</select>
										{:else}
											<p class="mt-1 text-sm">
												{#if selectedUser.gender === 'boy'}
													Garçon
												{:else if selectedUser.gender === 'girl'}
													Fille
												{:else}
													Non spécifié
												{/if}
											</p>
										{/if}
									</div>

									<!-- Role -->
									<div>
										<Label for="role">Rôle</Label>
										{#if isEditing}
											<select
												id="role"
												name="role"
												bind:value={editedUser.role}
												class="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
											>
												<option value="student">Student</option>
												<option value="teacher">Teacher</option>
												<option value="admin">Admin</option>
											</select>
										{:else}
											<Badge class={getRoleBadgeClass(selectedUser.role) + ' mt-1'}>
												{selectedUser.role}
											</Badge>
										{/if}
									</div>

									<!-- School -->
									<div>
										<Label for="school">École</Label>
										{#if isEditing}
											<select
												id="school"
												name="school_id"
												bind:value={editedUser.school_id}
												class="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
											>
												<option value="">Aucune école</option>
												{#each data.schools as school (school.id)}
													<option value={school.id}>{school.name}</option>
												{/each}
											</select>
										{:else}
											<p class="mt-1 text-sm">
												{selectedUser.schools?.name || '—'}
											</p>
										{/if}
									</div>

									<!-- Classes -->
									<div>
										<Label>Classes</Label>
										<div class="mt-2 flex flex-wrap gap-2">
											{#if selectedUser.class_ids && selectedUser.class_ids.length > 0}
												{#each selectedUser.class_ids as classId (classId)}
													{@const className = data.classes.find((c) => c.id === classId)?.name}
													<Badge variant="outline" class="flex items-center gap-1">
														{className || 'Unknown'}
														{#if isEditing}
															<button
																type="button"
																onclick={() => removeClass(classId)}
																class="ml-1 hover:text-destructive"
															>
																×
															</button>
														{/if}
													</Badge>
												{/each}
											{:else}
												<p class="text-sm text-muted-foreground">Aucune classe</p>
											{/if}
										</div>

										{#if isEditing}
											<div class="mt-2">
												<div class="flex gap-2">
													<select
														bind:value={classToAdd}
														class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
													>
														<option value="">Ajouter une classe</option>
														{#each data.classes.filter((c) => !selectedUser.class_ids?.includes(c.id)) as classItem (classItem.id)}
															<option value={classItem.id}>{classItem.name}</option>
														{/each}
													</select>
													<Button
														type="button"
														size="sm"
														onclick={addClassToUser}
														disabled={!classToAdd}
													>
														Ajouter
													</Button>
												</div>
											</div>
										{/if}
									</div>

									{#if isEditing}
										<div class="flex justify-end pt-4">
											<Button type="submit">Enregistrer les modifications</Button>
										</div>
									{/if}
								</div>
							</form>
						</Card.Content>
					</Card.Root>
				{:else}
					<Card.Root>
						<Card.Content class="py-12 text-center">
							<p class="text-muted-foreground">
								Recherchez un utilisateur ou sélectionnez une classe pour commencer
							</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
	</div>
</div>
