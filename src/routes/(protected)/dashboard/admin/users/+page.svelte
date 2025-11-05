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
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import type { Database } from '$lib/types/database';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import { Upload, Save, RotateCcw, Loader2 } from 'lucide-svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

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
	let classToAdd = $state(''); // Selected class to add to user

	// Inline editing state per field
	let editingFirstname = $state(false);
	let editingLastname = $state(false);
	let editingGender = $state(false);
	let editingRole = $state(false);
	let editingSchool = $state(false);
	let editingClasses = $state(false);

	// Temporary values (edited but not saved)
	let tempFirstname = $state<string>('');
	let tempLastname = $state<string>('');
	let tempGender = $state<'boy' | 'girl' | null>(null);
	let tempRole = $state<'admin' | 'teacher' | 'student'>('student');
	let tempSchoolId = $state<string | null>(null);
	let tempIsTest = $state<boolean>(false);

	// Track saving state
	let isSavingAll = $state(false);

	// Derived: detect if any changes made
	const hasChanges = $derived(
		selectedUser &&
			(tempFirstname !== (selectedUser.firstname || '') ||
				tempLastname !== (selectedUser.lastname || '') ||
				tempGender !== selectedUser.gender ||
				tempRole !== selectedUser.role ||
				tempSchoolId !== selectedUser.school_id ||
				tempIsTest !== selectedUser.is_test)
	);

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
	 * Initialize temp values when user is selected
	 */
	function initTempValues(user: ExtendedProfile) {
		tempFirstname = user.firstname || '';
		tempLastname = user.lastname || '';
		tempGender = user.gender;
		tempRole = user.role;
		tempSchoolId = user.school_id;
		tempIsTest = !!user.is_test; // Force boolean conversion
	}

	/**
	 * Select a user to view/edit in the right panel
	 * Resets all editing states when selecting a new user
	 */
	function selectUser(user: ExtendedProfile) {
		selectedUser = user;
		initTempValues(user);
		// Close all editing modes
		editingFirstname = false;
		editingLastname = false;
		editingGender = false;
		editingRole = false;
		editingSchool = false;
		editingClasses = false;
	}

	/**
	 * Inline Editing Handlers
	 */

	// Double-click handlers per field (just open edit mode)
	function handleFirstnameDoubleClick() {
		if (!selectedUser) return;
		editingFirstname = true;
	}

	function handleLastnameDoubleClick() {
		if (!selectedUser) return;
		editingLastname = true;
	}

	function handleGenderDoubleClick() {
		if (!selectedUser) return;
		editingGender = true;
	}

	function handleRoleDoubleClick() {
		if (!selectedUser) return;
		editingRole = true;
	}

	function handleSchoolDoubleClick() {
		if (!selectedUser) return;
		editingSchool = true;
	}

	// ESC key handler to cancel editing (revert to original)
	// Enter key handler to close field (keep temp value)
	function handleFieldKeyDown(e: KeyboardEvent, field: string) {
		if (e.key === 'Escape') {
			cancelFieldEdit(field);
		} else if (e.key === 'Enter') {
			closeField(field);
		}
	}

	// Close field but KEEP temp value
	function closeField(field: string) {
		switch (field) {
			case 'firstname':
				editingFirstname = false;
				break;
			case 'lastname':
				editingLastname = false;
				break;
			case 'gender':
				editingGender = false;
				break;
			case 'role':
				editingRole = false;
				break;
			case 'school':
				editingSchool = false;
				break;
		}
	}

	// Blur handler (close field after small delay)
	function handleFieldBlur(field: string) {
		// Small delay to allow click events to register first
		setTimeout(() => {
			closeField(field);
		}, 100);
	}

	// Cancel field edit (revert to original value)
	function cancelFieldEdit(field: string) {
		if (!selectedUser) return;

		switch (field) {
			case 'firstname':
				tempFirstname = selectedUser.firstname || '';
				editingFirstname = false;
				break;
			case 'lastname':
				tempLastname = selectedUser.lastname || '';
				editingLastname = false;
				break;
			case 'gender':
				tempGender = selectedUser.gender;
				editingGender = false;
				break;
			case 'role':
				tempRole = selectedUser.role;
				editingRole = false;
				break;
			case 'school':
				tempSchoolId = selectedUser.school_id;
				editingSchool = false;
				break;
		}
	}

	// Reset all changes to original values
	function resetAllChanges() {
		if (!selectedUser) return;
		initTempValues(selectedUser);
		// Close all editing modes
		editingFirstname = false;
		editingLastname = false;
		editingGender = false;
		editingRole = false;
		editingSchool = false;
	}

	// Save all changes
	async function saveAllChanges() {
		if (!selectedUser || !hasChanges || isSavingAll) return;

		isSavingAll = true;

		try {
			const updates = {
				firstname: tempFirstname || null,
				lastname: tempLastname || null,
				gender: tempGender,
				role: tempRole,
				school_id: tempSchoolId,
				is_test: tempIsTest
			};

			const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update profile');
			}

			const result: { success: boolean; profile: ExtendedProfile } = await response.json();

			if (result.success && result.profile) {
				// Update selected user
				selectedUser = { ...result.profile, class_ids: result.profile.class_ids || [] };

				// Reinit temp values from saved data
				initTempValues(result.profile);

				// Update search results
				if (searchResults.length > 0) {
					const index = searchResults.findIndex((u) => u.id === result.profile.id);
					if (index !== -1) {
						searchResults[index] = { ...result.profile, class_ids: result.profile.class_ids || [] };
					}
				}

				// Update class results if present
				if (classResults.length > 0) {
					const index = classResults.findIndex((u) => u.id === result.profile.id);
					if (index !== -1) {
						classResults[index] = { ...result.profile, class_ids: result.profile.class_ids || [] };
					}
				}

				// Close classes edit mode if open
				editingClasses = false;

				toaster.success('Profil mis à jour avec succès');
			}
		} catch (error) {
			console.error('Error updating profile:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
		} finally {
			isSavingAll = false;
		}
	}

	/**
	 * Class Management Handlers
	 */

	/**
	 * Remove a class from the selected user (only callable in edit mode)
	 * Updates UI reactively:
	 * - If viewing the removed class's filter, removes user from the list
	 * - Otherwise, updates user's class list in place
	 */
	async function removeClass(classId: string) {
		if (!selectedUser || !editingClasses) return;

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
	 * Add a class to the selected user (only callable in edit mode)
	 * Updates UI reactively:
	 * - If added class matches current filter, adds user to the list
	 * - Otherwise, updates user's class list in place
	 */
	async function addClassToUser() {
		if (!selectedUser || !classToAdd || !editingClasses) return;

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
						<MySelect
							type="single"
							bind:value={selectedClassFilter}
							items={[
								{ value: '', label: 'Sélectionner une classe' },
								...data.classes.map((c) => ({ value: c.id, label: c.name }))
							]}
							onValueChange={() => handleClassFilter(selectedClassFilter)}
						/>
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
						<MySelect
							type="single"
							bind:value={testFilter}
							items={[
								{ value: 'all', label: 'Tous les utilisateurs' },
								{ value: 'real', label: 'Réels uniquement' },
								{ value: 'test', label: 'Test uniquement' }
							]}
						/>
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
							<Card.Title>Profil de l'utilisateur</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-6">
							<!-- Avatar -->
							{#if selectedUser}
								{@const role = selectedUser.role || 'student'}
								{@const gender = toGender(selectedUser.gender)}
								<div class="flex items-center gap-4">
									<Avatar.Root class="h-20 w-20">
										<Avatar.Image
											src={selectedUser.avatar_url || getAvatarFallback(role, gender)}
											alt={getFullName(selectedUser)}
										/>
										<Avatar.Fallback class="text-2xl">
											{getAvatarInitials(selectedUser.firstname, selectedUser.lastname)}
										</Avatar.Fallback>
									</Avatar.Root>
									<div class="flex-1">
										<h3 class="text-xl font-semibold">{getFullName(selectedUser)}</h3>
										<p class="text-sm text-muted-foreground">{selectedUser.email}</p>
									</div>
								</div>
							{/if}

							<Separator />

							<!-- Profile Fields (Inline Editing) -->
							<div class="space-y-4">
								<!-- Personal Info -->
								<div class="grid grid-cols-2 gap-4">
									<div class="space-y-2">
										<Label class="text-sm font-medium text-muted-foreground">Prénom</Label>
										{#if editingFirstname}
											<input
												type="text"
												bind:value={tempFirstname}
												onkeydown={(e) => handleFieldKeyDown(e, 'firstname')}
												onblur={() => handleFieldBlur('firstname')}
												class="w-full border-none bg-transparent p-0 text-base focus:ring-0 focus:outline-none"
												autofocus
											/>
										{:else}
											<p
												class="cursor-pointer text-base transition-colors hover:text-primary"
												onclick={handleFirstnameDoubleClick}
												title="Cliquez pour éditer"
											>
												{tempFirstname || '—'}
											</p>
										{/if}
									</div>

									<div class="space-y-2">
										<Label class="text-sm font-medium text-muted-foreground">Nom</Label>
										{#if editingLastname}
											<input
												type="text"
												bind:value={tempLastname}
												onkeydown={(e) => handleFieldKeyDown(e, 'lastname')}
												onblur={() => handleFieldBlur('lastname')}
												class="w-full border-none bg-transparent p-0 text-base focus:ring-0 focus:outline-none"
												autofocus
											/>
										{:else}
											<p
												class="cursor-pointer text-base transition-colors hover:text-primary"
												onclick={handleLastnameDoubleClick}
												title="Cliquez pour éditer"
											>
												{tempLastname || '—'}
											</p>
										{/if}
									</div>
								</div>

								<!-- Email (Read-only) -->
								<div class="space-y-2">
									<Label class="text-sm font-medium text-muted-foreground">Email</Label>
									<p class="text-base text-muted-foreground">
										{selectedUser.email || '—'}
									</p>
								</div>

								<!-- Gender -->
								<div class="space-y-2">
									<Label class="text-sm font-medium text-muted-foreground">Genre</Label>
									{#if editingGender}
										<MySelect
											type="single"
											bind:value={tempGender}
											items={[
												{ value: 'boy', label: 'Garçon' },
												{ value: 'girl', label: 'Fille' }
											]}
											onValueChange={() => closeField('gender')}
											class="border-muted"
										/>
									{:else}
										<p
											class="cursor-pointer text-base transition-colors hover:text-primary"
											onclick={handleGenderDoubleClick}
											title="Cliquez pour éditer"
										>
											{tempGender === 'boy' ? 'Garçon' : tempGender === 'girl' ? 'Fille' : '—'}
										</p>
									{/if}
								</div>

								<!-- Role -->
								<div class="space-y-2">
									<Label class="text-sm font-medium text-muted-foreground">Rôle</Label>
									{#if editingRole}
										<MySelect
											type="single"
											bind:value={tempRole}
											items={[
												{ value: 'student', label: 'Étudiant' },
												{ value: 'teacher', label: 'Enseignant' },
												{ value: 'admin', label: 'Administrateur' }
											]}
											onValueChange={() => closeField('role')}
											class="border-muted"
										/>
									{:else}
										<p
											class="cursor-pointer text-base transition-colors hover:text-primary"
											onclick={handleRoleDoubleClick}
											title="Cliquez pour éditer"
										>
											<Badge class={getRoleBadgeClass(tempRole)}>
												{tempRole === 'admin'
													? 'Administrateur'
													: tempRole === 'teacher'
														? 'Enseignant'
														: 'Étudiant'}
											</Badge>
										</p>
									{/if}
								</div>

								<!-- Test User -->
								<div class="space-y-2">
									<Label class="text-sm font-medium text-muted-foreground">Compte de test</Label>
									<MyCheckbox bind:checked={tempIsTest} label="Marquer comme compte de test" />
								</div>

								<!-- School -->
								<div class="space-y-2">
									<Label class="text-sm font-medium text-muted-foreground">École</Label>
									{#if editingSchool}
										<MySelect
											type="single"
											bind:value={tempSchoolId}
											items={[
												{ value: '', label: 'Aucune école' },
												...data.schools.map((s) => ({ value: s.id, label: s.name }))
											]}
											onValueChange={() => closeField('school')}
											class="border-muted"
										/>
									{:else}
										<p
											class="cursor-pointer text-base transition-colors hover:text-primary"
											onclick={handleSchoolDoubleClick}
											title="Cliquez pour éditer"
										>
											{data.schools.find((s) => s.id === tempSchoolId)?.name || '—'}
										</p>
									{/if}
								</div>

								<!-- Classes -->
								<div class="space-y-2">
									<!-- Header with label and add controls -->
									<div class="flex items-center gap-2">
										<Label class="text-sm font-medium text-muted-foreground">Classes</Label>

										{#if editingClasses}
											<div class="flex flex-1 gap-2">
												<MySelect
													type="single"
													bind:value={classToAdd}
													items={[
														{ value: '', label: 'Sélectionner une classe' },
														...data.classes
															.filter((c) => !selectedUser?.class_ids?.includes(c.id))
															.map((c) => ({ value: c.id, label: c.name }))
													]}
													class="flex-1 border-muted"
												/>
												<Button
													type="button"
													size="sm"
													onclick={addClassToUser}
													disabled={!classToAdd}
												>
													Ajouter
												</Button>
											</div>
										{/if}
									</div>

									<!-- Display badges -->
									<div
										class="min-h-[40px] cursor-pointer"
										onclick={() => (editingClasses = true)}
										title={editingClasses ? '' : 'Cliquez pour éditer'}
									>
										<div class="flex flex-wrap gap-2">
											{#if selectedUser.class_ids && selectedUser.class_ids.length > 0}
												{#each selectedUser.class_ids as classId (classId)}
													{@const className = data.classes.find((c) => c.id === classId)?.name}
													<Badge
														class="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
													>
														{className || 'Unknown'}

														{#if editingClasses}
															<button
																type="button"
																onclick={(e) => {
																	e.stopPropagation();
																	removeClass(classId);
																}}
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
									</div>
								</div>

								<!-- Save/Reset Buttons -->
								{#if hasChanges}
									<div class="sticky bottom-4 mt-6 flex justify-end gap-2 border-t pt-4">
										<Button variant="outline" onclick={resetAllChanges} disabled={isSavingAll}>
											<RotateCcw class="mr-2 h-4 w-4" />
											Réinitialiser
										</Button>
										<Button onclick={saveAllChanges} disabled={isSavingAll} class="min-w-[140px]">
											{#if isSavingAll}
												<Loader2 class="mr-2 h-4 w-4 animate-spin" />
												Enregistrement...
											{:else}
												<Save class="mr-2 h-4 w-4" />
												Enregistrer
											{/if}
										</Button>
									</div>
								{/if}
							</div>
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
