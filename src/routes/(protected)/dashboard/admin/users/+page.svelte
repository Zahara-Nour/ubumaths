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
	import type { Database } from '$lib/types/database';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import { Upload } from 'lucide-svelte';

	// Extended profile type that includes related data from API responses
	type Profile = Database['public']['Tables']['profiles']['Row'];
	type ExtendedProfile = Profile & {
		schools?: { name: string } | null;
		class_members?: { class_id: string }[];
	};

	let { data }: { data: PageData } = $props();

	// Search state
	let searchTerm = $state(''); // Current text search input
	let searchResults = $state<ExtendedProfile[]>([]); // Results from text search
	let classResults = $state<ExtendedProfile[]>([]); // Results from class filter
	let isSearching = $state(false); // Loading state for text search
	let isSearchingClass = $state(false); // Loading state for class filter
	let selectedClassFilter = $state<string>(''); // Currently selected class ID for filtering
	let searchTimeout: NodeJS.Timeout | null = null; // Debounce timer for search

	// Test filter state
	let testFilter = $state<'all' | 'real' | 'test'>('all'); // Filter for test vs real users

	// User selection and editing state
	let selectedUser = $state<ExtendedProfile | null>(null); // Currently viewed user
	let editedUser = $state<Partial<ExtendedProfile>>({}); // Copy of user being edited
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
		firstname?: string | null;
		lastname?: string | null;
		full_name?: string | null;
		email?: string | null;
	}): string {
		if (user.firstname && user.lastname) {
			return `${user.firstname} ${user.lastname}`;
		}
		return user.full_name || user.email || 'Unknown User';
	}

	/**
	 * Convert database gender string to Gender type for avatar function
	 */
	function toGender(gender: string | null | undefined): 'M' | 'F' | null {
		if (!gender) return null;
		if (gender === 'boy') return 'M';
		if (gender === 'girl') return 'F';
		return null;
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
	 * Get Tailwind classes for test user badge
	 */
	function getTestBadgeClass(): string {
		return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
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
	 * Apply test filter to a list of users
	 */
	function applyTestFilter(users: ExtendedProfile[]): ExtendedProfile[] {
		if (testFilter === 'all') return users;
		if (testFilter === 'test') return users.filter((u) => u.is_test === true);
		if (testFilter === 'real') return users.filter((u) => u.is_test === false);
		return users;
	}

	/**
	 * Get filtered search results based on test filter
	 */
	let filteredSearchResults = $derived(applyTestFilter(searchResults));

	/**
	 * Get filtered class results based on test filter
	 */
	let filteredClassResults = $derived(applyTestFilter(classResults));

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
				const result = (await response.json()) as { users?: ExtendedProfile[] };

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
			const result = (await response.json()) as { users?: ExtendedProfile[] };

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
	function selectUser(user: ExtendedProfile) {
		selectedUser = user;
		editedUser = { ...user };
		isEditing = false;
	}

	/**
	 * Enter edit mode for the selected user
	 */
	function startEdit() {
		if (selectedUser) {
			editedUser = { ...selectedUser };
		}
		isEditing = true;
	}

	/**
	 * Cancel editing and revert changes
	 */
	function cancelEdit() {
		if (selectedUser) {
			editedUser = { ...selectedUser };
		}
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

			const result = (await response.json()) as {
				success?: boolean;
				profile?: ExtendedProfile;
				error?: string;
			};

			if (result.success && result.profile) {
				// Update selected user with server response
				const updatedUser = result.profile;
				selectedUser = updatedUser;
				editedUser = { ...updatedUser };

				// Update in search results if present
				const searchIndex = searchResults.findIndex((u) => u.id === updatedUser.id);
				if (searchIndex !== -1) {
					searchResults[searchIndex] = { ...updatedUser };
				}

				// Handle class filter results
				if (selectedClassFilter === classId) {
					// Removed class matches current filter - remove user from list
					classResults = classResults.filter((u) => u.id !== updatedUser.id);
				} else {
					// Update user in class results if present
					const classIndex = classResults.findIndex((u) => u.id === updatedUser.id);
					if (classIndex !== -1) {
						classResults[classIndex] = { ...updatedUser };
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

			const result = (await response.json()) as {
				success?: boolean;
				profile?: ExtendedProfile;
				error?: string;
			};

			if (result.success && result.profile) {
				// Update selected user with server response
				const updatedUser = result.profile;
				selectedUser = updatedUser;
				editedUser = { ...updatedUser };

				// Update in search results if present
				const searchIndex = searchResults.findIndex((u) => u.id === updatedUser.id);
				if (searchIndex !== -1) {
					searchResults[searchIndex] = { ...updatedUser };
				}

				// Handle class filter results
				if (selectedClassFilter === classToAdd) {
					// Added class matches current filter
					const classIndex = classResults.findIndex((u) => u.id === updatedUser.id);
					if (classIndex === -1) {
						// User not in list - add them
						classResults = [...classResults, { ...updatedUser }];
					} else {
						// User already in list - update them
						classResults[classIndex] = { ...updatedUser };
					}
				} else {
					// Update user in class results if present
					const classIndex = classResults.findIndex((u) => u.id === updatedUser.id);
					if (classIndex !== -1) {
						classResults[classIndex] = { ...updatedUser };
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

				<!-- Test Filter -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Filtrer par type</Card.Title>
					</Card.Header>
					<Card.Content>
						<select
							bind:value={testFilter}
							class="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
						>
							<option value="all">Tous les utilisateurs</option>
							<option value="real">Réels uniquement</option>
							<option value="test">Test uniquement</option>
						</select>
					</Card.Content>
				</Card.Root>

				<!-- Search Results List -->
				{#if filteredSearchResults.length > 0 || filteredClassResults.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title>
								{#if filteredSearchResults.length > 0}
									Résultats de recherche ({filteredSearchResults.length})
								{:else if filteredClassResults.length > 0}
									{@const className =
										data.classes.find((c) => c.id === selectedClassFilter)?.name || 'Classe'}
									Étudiants de {className} ({filteredClassResults.length})
								{/if}
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="max-h-96 space-y-2 overflow-y-auto">
								{#each filteredSearchResults.length > 0 ? filteredSearchResults : filteredClassResults as user (user.id)}
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
													src={user.avatar_url ||
														getAvatarFallback(user.role, toGender(user.gender))}
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
											<div class="flex gap-1">
												<Badge class={getRoleBadgeClass(user.role)}>{user.role}</Badge>
												{#if user.is_test}
													<Badge class={getTestBadgeClass()}>TEST</Badge>
												{/if}
											</div>
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
							{#if selectedUser}
								{@const currentUser = isEditing ? editedUser : selectedUser}
								{@const role = currentUser.role || 'student'}
								{@const gender = toGender(currentUser.gender)}
								<div class="flex items-center gap-4">
									<Avatar.Root class="h-20 w-20">
										<Avatar.Image
											src={currentUser.avatar_url || getAvatarFallback(role, gender)}
											alt={getFullName(currentUser)}
										/>
										<Avatar.Fallback class="text-2xl">
											{getAvatarInitials(
												currentUser.firstname ?? null,
												currentUser.lastname ?? null
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
							{/if}

							<Separator />

							<!-- Profile Form -->
							<form
								method="POST"
								action="?/update_profile"
								use:enhance={() => {
									return async ({ result, update }) => {
										await update();
										if (
											result.type === 'success' &&
											result.data &&
											'profile' in result.data &&
											result.data.profile
										) {
											// Use the profile returned from the server (includes school relation)
											const profile = result.data.profile as ExtendedProfile;
											selectedUser = profile;
											editedUser = { ...profile };

											// Update in searchResults if present
											const searchIndex = searchResults.findIndex((u) => u.id === profile.id);
											if (searchIndex !== -1) {
												searchResults[searchIndex] = { ...profile };
											}

											// Update in classResults if present
											const classIndex = classResults.findIndex((u) => u.id === profile.id);
											if (classIndex !== -1) {
												classResults[classIndex] = { ...profile };
											}

											isEditing = false;
										} else if (result.type === 'success' && selectedUser) {
											// Fallback if profile not returned
											selectedUser = { ...selectedUser, ...editedUser };
											isEditing = false;
										}
									};
								}}
							>
								<input type="hidden" name="user_id" value={selectedUser?.id || ''} />

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

									<!-- Test User -->
									<div>
										<Label for="is_test">Utilisateur de test</Label>
										{#if isEditing}
											<div class="mt-2 flex items-center gap-2">
												<input
													type="checkbox"
													id="is_test"
													name="is_test"
													bind:checked={editedUser.is_test}
													class="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
												/>
												<label for="is_test" class="text-sm text-muted-foreground">
													Marquer comme utilisateur de test
												</label>
											</div>
										{:else if selectedUser.is_test}
											<Badge class={getTestBadgeClass() + ' mt-1'}>TEST</Badge>
										{:else}
											<p class="mt-1 text-sm text-muted-foreground">Non</p>
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
														{#each data.classes.filter((c) => !selectedUser?.class_ids?.includes(c.id)) as classItem (classItem.id)}
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
