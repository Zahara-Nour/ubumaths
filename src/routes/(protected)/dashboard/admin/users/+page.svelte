<script lang="ts">
	/**
	 * User Management Page
	 *
	 * This page provides a card-based interface for administrators to manage user profiles.
	 * Features include:
	 * - Text search by email, firstname, or lastname
	 * - Browse users by class membership
	 * - Filter and approve/reject pending users
	 * - View and edit user profiles (name, email, role, school, classes)
	 * - Add/remove users from classes with reactive UI updates
	 */

	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { Database } from '$lib/types/database';
	import { getAvatarInitials, getAvatarUrl } from '$lib/utils/avatar';
	import { Upload, Save, RotateCcw, Loader2, Clock, Check, X } from 'lucide-svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Switch } from '$lib/components/ui/switch';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';

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
	let pendingResults = $state<ExtendedProfile[]>([]); // Results from pending filter
	let isSearching = $state(false); // Loading state for text search
	let isSearchingClass = $state(false); // Loading state for class filter
	let isSearchingPending = $state(false); // Loading state for pending filter
	let selectedClassFilter = $state<string>('none'); // Currently selected class ID for filtering ('none' = no class selected)
	let showPendingOnly = $state(false); // Show only pending users awaiting approval
	let searchTimeout: NodeJS.Timeout | null = null; // Debounce timer for search

	// Pending count from server
	let pendingCount = $state(data.pendingCount);

	// Test filter state
	let showTestUsers = $state(false); // Show test users (false = real users only)

	// Approval/rejection state
	let isApproving = $state(false);
	let isRejecting = $state(false);
	let showRejectionDialog = $state(false);
	let rejectionReason = $state('');

	// User selection and editing state
	let selectedUser = $state<ExtendedProfile | null>(null); // Currently viewed user
	let classToAdd = $state(''); // Selected class to add to user

	// Inline editing state per field
	let editingFirstname = $state(false);
	let editingLastname = $state(false);
	let editingClasses = $state(false);

	// Temporary values (edited but not saved)
	// Note: tempSchoolId uses empty string ('') to represent null for MySelect compatibility
	let tempFirstname = $state<string>('');
	let tempLastname = $state<string>('');
	let tempRole = $state<'admin' | 'teacher' | 'student'>('student');
	let tempSchoolId = $state<string>(''); // '' represents null
	let tempIsTest = $state<boolean>(false);

	// Track saving state
	let isSavingAll = $state(false);

	// Derived: detect if any changes made
	// Note: tempSchoolId uses '' for null, so convert for comparison
	const hasChanges = $derived(
		selectedUser &&
			(tempFirstname !== (selectedUser.firstname || '') ||
				tempLastname !== (selectedUser.lastname || '') ||
				tempRole !== selectedUser.role ||
				(tempSchoolId || null) !== selectedUser.school_id ||
				tempIsTest !== selectedUser.is_test)
	);

	// Derived: track which specific fields have changed
	const changedFields = $derived.by(() => {
		if (!selectedUser) return new Set<string>();
		const fields = new Set<string>();
		if (tempFirstname !== (selectedUser.firstname || '')) fields.add('firstname');
		if (tempLastname !== (selectedUser.lastname || '')) fields.add('lastname');
		if (tempRole !== selectedUser.role) fields.add('role');
		if ((tempSchoolId || null) !== selectedUser.school_id) fields.add('school');
		if (tempIsTest !== selectedUser.is_test) fields.add('is_test');
		return fields;
	});

	// Derived: check if pending user has at least one class assigned
	const hasClassAssigned = $derived(selectedUser?.class_ids && selectedUser.class_ids.length > 0);

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
	 * Get Tailwind classes for status badge styling
	 */
	function getStatusBadgeClass(status: string): string {
		switch (status) {
			case 'pending':
				return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
			case 'approved':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'rejected':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	/**
	 * Get French label for status
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function getStatusLabel(status: string): string {
		switch (status) {
			case 'pending':
				return 'En attente';
			case 'approved':
				return 'Approuvé';
			case 'rejected':
				return 'Refusé';
			default:
				return status;
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
	 * Apply test filter to a list of users
	 */
	function applyTestFilter(users: ExtendedProfile[]): ExtendedProfile[] {
		if (showTestUsers) return users;
		return users.filter((u) => u.is_test === false);
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
	 * Get filtered pending results based on test filter
	 */
	let filteredPendingResults = $derived(applyTestFilter(pendingResults));

	/**
	 * Users to display in the list (pending, search results, or class filter)
	 */
	let displayUsers = $derived(
		showPendingOnly && filteredPendingResults.length > 0
			? filteredPendingResults
			: filteredSearchResults.length > 0
				? filteredSearchResults
				: filteredClassResults
	);

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
				const response = await fetch(
					`/api/admin/search-users?q=${encodeURIComponent(searchTerm)}&limit=50`
				);
				const result = (await response.json()) as { users?: ExtendedProfile[] };

				if (result.users) {
					searchResults = result.users;
					classResults = []; // Clear class results when searching
					selectedClassFilter = 'none'; // Clear class filter
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
		if (!classId || classId === 'none') {
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
	 * Toggle pending users filter
	 * When enabled, shows only users with status='pending'
	 */
	async function togglePendingFilter() {
		showPendingOnly = !showPendingOnly;

		if (showPendingOnly) {
			isSearchingPending = true;
			// Clear other filters
			searchTerm = '';
			searchResults = [];
			selectedClassFilter = 'none';
			classResults = [];

			try {
				// Fetch pending users via search API with status filter
				const response = await fetch('/api/admin/search-users/pending');
				const result = (await response.json()) as { users?: ExtendedProfile[] };

				if (result.users) {
					pendingResults = result.users;
				} else {
					pendingResults = [];
				}
			} catch (err) {
				console.error('Pending filter error:', err);
				pendingResults = [];
			}

			isSearchingPending = false;
		} else {
			pendingResults = [];
		}
	}

	/**
	 * Approve a pending user
	 * Sends profile updates along with approval status
	 */
	async function approveUser() {
		if (!selectedUser || selectedUser.status !== 'pending') return;

		isApproving = true;

		try {
			// Prepare approval data with profile updates
			const approvalData = {
				status: 'approved' as const,
				// Include profile fields (convert empty strings back to null for API)
				firstname: tempFirstname || null,
				lastname: tempLastname || null,
				school_id: tempSchoolId || null,
				is_test: tempIsTest
			};

			const response = await fetch(`/api/admin/users/${selectedUser.id}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(approvalData)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Erreur lors de l'approbation");
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

				// Remove from pending results if showing pending
				if (showPendingOnly) {
					pendingResults = pendingResults.filter((u) => u.id !== result.profile.id);
				}

				// Update pending count
				pendingCount = Math.max(0, pendingCount - 1);

				toaster.success('Utilisateur approuvé avec succès');
			}
		} catch (err) {
			console.error('Error approving user:', err);
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'approbation");
			// Reinitialize temp values to ensure consistency after error
			if (selectedUser) {
				initTempValues(selectedUser);
			}
		} finally {
			isApproving = false;
		}
	}

	/**
	 * Open rejection dialog
	 */
	function openRejectionDialog() {
		rejectionReason = '';
		showRejectionDialog = true;
	}

	/**
	 * Reject a pending user
	 */
	async function rejectUser() {
		if (!selectedUser || selectedUser.status !== 'pending') return;

		isRejecting = true;

		try {
			const response = await fetch(`/api/admin/users/${selectedUser.id}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: 'rejected',
					rejection_reason: rejectionReason.trim() || null
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Erreur lors du refus');
			}

			const result: { success: boolean; profile: ExtendedProfile } = await response.json();

			if (result.success && result.profile) {
				// Update selected user
				selectedUser = { ...result.profile, class_ids: result.profile.class_ids || [] };

				// Remove from pending results if showing pending
				if (showPendingOnly) {
					pendingResults = pendingResults.filter((u) => u.id !== result.profile.id);
				}

				// Update pending count
				pendingCount = Math.max(0, pendingCount - 1);

				// Close dialog
				showRejectionDialog = false;
				rejectionReason = '';

				toaster.success('Utilisateur refusé');
			}
		} catch (err) {
			console.error('Error rejecting user:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors du refus');
		} finally {
			isRejecting = false;
		}
	}

	/**
	 * User Selection Handlers
	 */

	/**
	 * Initialize temp values when user is selected
	 * Note: Convert null to '' for schoolId (MySelect compatibility)
	 */
	function initTempValues(user: ExtendedProfile) {
		tempFirstname = user.firstname || '';
		tempLastname = user.lastname || '';
		tempRole = user.role;
		tempSchoolId = user.school_id || ''; // null -> ''
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
		editingClasses = false;
	}

	/**
	 * Inline Editing Handlers
	 */

	// Click handlers per field (open edit mode)
	function handleFirstnameDoubleClick() {
		if (!selectedUser) return;
		editingFirstname = true;
	}

	function handleLastnameDoubleClick() {
		if (!selectedUser) return;
		editingLastname = true;
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
		}
	}

	// Reset all changes to original values
	function resetAllChanges() {
		if (!selectedUser) return;
		initTempValues(selectedUser);
		// Close all editing modes
		editingFirstname = false;
		editingLastname = false;
	}

	// Save all changes
	async function saveAllChanges() {
		if (!selectedUser || !hasChanges || isSavingAll) return;

		isSavingAll = true;

		try {
			// Convert empty strings back to null for school_id (API expects null, not '')
			const updates = {
				firstname: tempFirstname || null,
				lastname: tempLastname || null,
				role: tempRole,
				school_id: tempSchoolId || null,
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
	<div class="mt-6 space-y-6">
		<!-- Filters Card (full width, horizontal) -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex flex-wrap items-end gap-6">
					<!-- Search -->
					<div class="flex-1">
						<Label for="search-input" class="mb-2 block">Rechercher (email, prénom, nom)</Label>
						<div class="relative">
							<Input
								id="search-input"
								type="text"
								placeholder="Min 3 caractères..."
								bind:value={searchTerm}
								oninput={handleSearchInput}
							/>
							{#if isSearching}
								<Loader2
									class="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
								/>
							{/if}
						</div>
					</div>

					<!-- Browse by Class -->
					<div class="flex-1">
						<Label class="mb-2 block">Parcourir par classe</Label>
						<div class="relative">
							<MySelect
								type="single"
								bind:value={selectedClassFilter}
								items={[
									{ value: 'none', label: 'Aucune classe' },
									...data.classes
										.filter((c) => c.is_active)
										.map((c) => ({ value: c.id, label: c.name }))
								]}
								onValueChange={(newValue) => handleClassFilter(newValue ?? 'none')}
								placeholder="Sélectionner..."
								triggerClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
							/>
							{#if isSearchingClass}
								<Loader2
									class="absolute top-1/2 right-8 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
								/>
							{/if}
						</div>
					</div>

					<!-- Pending Filter -->
					<div class="flex items-center gap-2 pb-1">
						<Button
							variant={showPendingOnly ? 'default' : 'outline'}
							size="sm"
							onclick={togglePendingFilter}
							disabled={isSearchingPending}
							class="gap-2"
						>
							{#if isSearchingPending}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else}
								<Clock class="h-4 w-4" />
							{/if}
							En attente
							{#if pendingCount > 0}
								<Badge class="bg-amber-500 text-white">{pendingCount}</Badge>
							{/if}
						</Button>
					</div>

					<!-- Test Filter -->
					<div class="flex items-center gap-2 pb-1">
						<Switch bind:checked={showTestUsers} id="test-filter" />
						<label for="test-filter" class="cursor-pointer text-sm font-medium text-foreground">
							Afficher élèves tests
						</label>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Results and Profile (side by side) -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Left Panel: Search Results List -->
			<div class="space-y-4 lg:col-span-1">
				<!-- Search Results List -->
				{#if filteredSearchResults.length > 0 || filteredClassResults.length > 0 || filteredPendingResults.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title>
								{#if showPendingOnly && filteredPendingResults.length > 0}
									Utilisateurs en attente ({filteredPendingResults.length})
								{:else if filteredSearchResults.length > 0}
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
								{#each displayUsers as user (user.id)}
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
													src={getAvatarUrl({
														avatar_url: user.avatar_url,
														role: user.role
													})}
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
											<div class="flex flex-wrap gap-1">
												<Badge class={getRoleBadgeClass(user.role)}>{user.role}</Badge>
												{#if user.status === 'pending'}
													<Badge class={getStatusBadgeClass('pending')}>En attente</Badge>
												{/if}
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
				{:else if showPendingOnly && !isSearchingPending}
					<Card.Root>
						<Card.Content class="py-6 text-center">
							<p class="text-sm text-muted-foreground">
								Aucun utilisateur en attente d'approbation
							</p>
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
								<div class="flex justify-between">
									<div class="flex items-center gap-4">
										<Avatar.Root class="h-20 w-20">
											<Avatar.Image
												src={getAvatarUrl({
													avatar_url: selectedUser.avatar_url,
													role: role
												})}
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
									<!-- Test User -->
									<div class="space-y-2">
										<div class="flex items-center gap-2">
											<MyCheckbox bind:checked={tempIsTest} label="Compte test" />
											{#if isSavingAll && changedFields.has('is_test')}
												<Loader2 class="h-3 w-3 animate-spin text-muted-foreground" />
											{/if}
										</div>
									</div>
								</div>
							{/if}

							<Separator />

							<!-- Approval Status Section (for pending users) -->
							{#if selectedUser.status === 'pending'}
								<div
									class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
								>
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<Clock class="h-5 w-5 text-amber-600 dark:text-amber-400" />
											<div>
												<p class="font-medium text-amber-800 dark:text-amber-200">
													En attente d'approbation
												</p>
												<p class="text-sm text-amber-600 dark:text-amber-400">
													Cet utilisateur attend que son inscription soit validée.
												</p>
											</div>
										</div>
										<div class="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												onclick={openRejectionDialog}
												disabled={isApproving || isRejecting}
												class="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
											>
												{#if isRejecting}
													<Loader2 class="mr-2 h-4 w-4 animate-spin" />
												{:else}
													<X class="mr-2 h-4 w-4" />
												{/if}
												Refuser
											</Button>

											<!-- Approve button with tooltip if no class assigned -->
											{#if !hasClassAssigned}
												<Tooltip.Provider>
													<Tooltip.Root>
														<Tooltip.Trigger>
															{#snippet child({ props })}
																<Button
																	{...props}
																	size="sm"
																	disabled={true}
																	class="bg-green-600 hover:bg-green-700"
																>
																	<Check class="mr-2 h-4 w-4" />
																	Approuver
																</Button>
															{/snippet}
														</Tooltip.Trigger>
														<Tooltip.Content>
															<p>Veuillez assigner au moins une classe avant d'approuver</p>
														</Tooltip.Content>
													</Tooltip.Root>
												</Tooltip.Provider>
											{:else}
												<Button
													size="sm"
													onclick={approveUser}
													disabled={isApproving || isRejecting}
													class="bg-green-600 hover:bg-green-700"
												>
													{#if isApproving}
														<Loader2 class="mr-2 h-4 w-4 animate-spin" />
													{:else}
														<Check class="mr-2 h-4 w-4" />
													{/if}
													Approuver
												</Button>
											{/if}
										</div>
									</div>
								</div>
							{:else if selectedUser.status === 'rejected'}
								<div
									class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
								>
									<div class="flex items-center gap-3">
										<X class="h-5 w-5 text-red-600 dark:text-red-400" />
										<div>
											<p class="font-medium text-red-800 dark:text-red-200">Inscription refusée</p>
											{#if selectedUser.rejection_reason}
												<p class="text-sm text-red-600 dark:text-red-400">
													Raison : {selectedUser.rejection_reason}
												</p>
											{/if}
										</div>
									</div>
								</div>
							{/if}

							<!-- Profile Fields (Inline Editing) -->
							<div class="space-y-4">
								<!-- Personal Info -->
								<div class="grid grid-cols-2 gap-4">
									<div class="space-y-2">
										<div class="flex items-center gap-2">
											<Label class="text-sm font-medium text-muted-foreground">Prénom</Label>
											{#if isSavingAll && changedFields.has('firstname')}
												<Loader2 class="h-3 w-3 animate-spin text-muted-foreground" />
											{/if}
										</div>
										{#if editingFirstname}
											<input
												type="text"
												bind:value={tempFirstname}
												onkeydown={(e) => handleFieldKeyDown(e, 'firstname')}
												onblur={() => handleFieldBlur('firstname')}
												class="w-full border-none bg-transparent p-0 text-base focus:ring-0 focus:outline-none"
												aria-label="Modifier le prénom"
											/>
										{:else}
											<button
												type="button"
												class="w-full cursor-pointer text-left text-base transition-colors hover:text-primary"
												onclick={handleFirstnameDoubleClick}
												aria-label="Prénom: {tempFirstname || 'Non défini'}. Cliquez pour éditer"
											>
												{tempFirstname || '—'}
											</button>
										{/if}
									</div>

									<div class="space-y-2">
										<div class="flex items-center gap-2">
											<Label class="text-sm font-medium text-muted-foreground">Nom</Label>
											{#if isSavingAll && changedFields.has('lastname')}
												<Loader2 class="h-3 w-3 animate-spin text-muted-foreground" />
											{/if}
										</div>
										{#if editingLastname}
											<input
												type="text"
												bind:value={tempLastname}
												onkeydown={(e) => handleFieldKeyDown(e, 'lastname')}
												onblur={() => handleFieldBlur('lastname')}
												class="w-full border-none bg-transparent p-0 text-base focus:ring-0 focus:outline-none"
												aria-label="Modifier le nom"
											/>
										{:else}
											<button
												type="button"
												class="w-full cursor-pointer text-left text-base transition-colors hover:text-primary"
												onclick={handleLastnameDoubleClick}
												aria-label="Nom: {tempLastname || 'Non défini'}. Cliquez pour éditer"
											>
												{tempLastname || '—'}
											</button>
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

								<!-- Role -->
								<div class="space-y-2">
									<div class="flex items-center gap-2">
										<Label class="text-sm font-medium text-muted-foreground">Rôle</Label>
										{#if isSavingAll && changedFields.has('role')}
											<Loader2 class="h-3 w-3 animate-spin text-muted-foreground" />
										{/if}
									</div>
									<MySelect
										type="single"
										bind:value={tempRole}
										items={[
											{ value: 'student', label: 'Étudiant' },
											{ value: 'teacher', label: 'Enseignant' },
											{ value: 'admin', label: 'Administrateur' }
										]}
										placeholder="Rôle"
										variant="invisible"
									/>
								</div>

								<!-- School -->
								<div class="space-y-2">
									<div class="flex items-center gap-2">
										<Label class="text-sm font-medium text-muted-foreground">École</Label>
										{#if isSavingAll && changedFields.has('school')}
											<Loader2 class="h-3 w-3 animate-spin text-muted-foreground" />
										{/if}
									</div>
									<MySelect
										type="single"
										bind:value={tempSchoolId}
										items={[
											// { value: '', label: 'Aucune école' },
											...data.schools.map((s) => ({ value: s.id, label: s.name }))
										]}
										placeholder="École"
										variant="invisible"
									/>
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
									<button
										type="button"
										class="min-h-[40px] w-full cursor-pointer text-left"
										onclick={() => (editingClasses = true)}
										aria-label={editingClasses
											? "Classes en cours d'édition"
											: 'Cliquez pour éditer les classes'}
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
									</button>
								</div>

								<!-- Save/Reset Buttons (hidden for pending users) -->
								{#if hasChanges && selectedUser.status !== 'pending'}
									<div class="sticky bottom-4 mt-6 flex justify-end gap-2 pt-4">
										<Button variant="outline" onclick={resetAllChanges} disabled={isSavingAll}>
											<RotateCcw class="h-4 w-4" />
										</Button>
										<Button onclick={saveAllChanges} disabled={isSavingAll}>
											{#if isSavingAll}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Save class="h-4 w-4" />
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

<!-- Rejection Dialog -->
<Dialog.Root bind:open={showRejectionDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Refuser l'inscription</Dialog.Title>
			<Dialog.Description>
				{#if selectedUser}
					Vous allez refuser l'inscription de {getFullName(selectedUser)}. Cette action est
					irréversible.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="rejection-reason">Raison du refus (optionnel)</Label>
				<Textarea
					id="rejection-reason"
					bind:value={rejectionReason}
					placeholder="Indiquez la raison du refus..."
					rows={4}
					disabled={isRejecting}
					class="resize-none"
				/>
				<p
					class="text-sm {rejectionReason.length > 500
						? 'font-medium text-red-600 dark:text-red-400'
						: 'text-muted-foreground'}"
				>
					{rejectionReason.length} / 500 caractères
					{#if rejectionReason.length > 500}
						- Limite dépassée
					{/if}
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					showRejectionDialog = false;
					rejectionReason = '';
				}}
				disabled={isRejecting}
			>
				Annuler
			</Button>
			<Button
				onclick={rejectUser}
				disabled={isRejecting || rejectionReason.length > 500}
				class="bg-red-600 hover:bg-red-700"
			>
				{#if isRejecting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Confirmer le refus
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
