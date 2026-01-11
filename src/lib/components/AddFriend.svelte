<script lang="ts">
	import { onMount } from 'svelte';
	import { friendsManager, type ClassmateInfo } from '$lib/stores/friends.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Search, UserPlus, Check, Clock, UserX, Users, Loader2 } from 'lucide-svelte';
	import { getAvatarUrl } from '$lib/utils/avatar';

	// Friendship relationship type (different from status which is 'pending' | 'accepted' | 'blocked')
	type FriendshipRelationType = 'classmate' | 'mentor';

	let searchQuery = $state('');
	let searchResults = $state<
		Array<{
			id: string;
			full_name: string | null;
			firstname: string | null;
			lastname: string | null;
			avatar_url: string | null;
			role: 'student' | 'teacher' | 'admin';
			friendship_status?: 'pending' | 'accepted' | 'rejected' | null;
		}>
	>([]);
	let isSearching = $state(false);
	let selectedFriendshipType = $state<FriendshipRelationType>('classmate');

	// Classes and students state
	let allClasses = $state<Array<{ id: string; name: string }>>([]);
	let studentsInClass = $state<ClassmateInfo[]>([]);
	let isLoadingClasses = $state(true);
	let isLoadingStudents = $state(false);
	let selectedClassId = $state<string>('');

	// Track which users are being added (for loading state)
	let sendingRequestTo = $state<Set<string>>(new Set());

	// Derived: items for class selector
	const classSelectItems = $derived(
		allClasses.map((c) => ({
			value: c.id,
			label: c.name
		}))
	);

	onMount(async () => {
		isLoadingClasses = true;
		allClasses = await friendsManager.getClassesByUserGrade();
		// Set default to first class and load its students
		if (allClasses.length > 0) {
			selectedClassId = allClasses[0].id;
			await loadStudentsInClass(allClasses[0].id);
		}
		isLoadingClasses = false;
	});

	async function loadStudentsInClass(classId: string) {
		isLoadingStudents = true;
		studentsInClass = await friendsManager.getStudentsInClass(classId);
		isLoadingStudents = false;
	}

	// Handler for class selection change (UI event -> handler -> state update)
	function handleClassChange(classId: string) {
		selectedClassId = classId;
		loadStudentsInClass(classId);
	}

	async function refreshStudents() {
		if (selectedClassId) {
			studentsInClass = await friendsManager.getStudentsInClass(selectedClassId);
		}
	}

	// Items for MySelect
	const friendshipTypeItems = [
		{ value: 'classmate', label: 'Camarade' },
		{ value: 'mentor', label: 'Mentor' }
	];

	async function handleSearch() {
		if (!searchQuery || searchQuery.length < 2) {
			toaster.warning('Entrez au moins 2 caractères pour rechercher');
			return;
		}

		isSearching = true;
		searchResults = await friendsManager.searchUsers(searchQuery);
		isSearching = false;

		if (searchResults.length === 0) {
			toaster.info('Aucun utilisateur trouvé');
		}
	}

	async function handleSendRequest(userId: string, userName: string) {
		sendingRequestTo = new Set([...sendingRequestTo, userId]);
		try {
			const success = await friendsManager.sendFriendRequest(userId, selectedFriendshipType);
			if (success) {
				toaster.success(`Demande d'ami envoyée à ${userName}`);
				// Refresh search results and students to update status
				searchResults = await friendsManager.searchUsers(searchQuery);
				await refreshStudents();
			} else {
				toaster.error("Impossible d'envoyer la demande");
			}
		} finally {
			sendingRequestTo = new Set([...sendingRequestTo].filter((id) => id !== userId));
		}
	}

	async function handleSendRequestToClassmate(userId: string, userName: string) {
		sendingRequestTo = new Set([...sendingRequestTo, userId]);
		try {
			// For classmates, always use 'classmate' as the friendship type
			const success = await friendsManager.sendFriendRequest(userId, 'classmate');
			if (success) {
				toaster.success(`Demande d'ami envoyée à ${userName}`);
				await refreshStudents();
			} else {
				toaster.error("Impossible d'envoyer la demande");
			}
		} finally {
			sendingRequestTo = new Set([...sendingRequestTo].filter((id) => id !== userId));
		}
	}

	function getDisplayName(user: (typeof searchResults)[0]): string {
		if (user.full_name) return user.full_name;
		if (user.firstname || user.lastname) {
			return `${user.firstname || ''} ${user.lastname || ''}`.trim();
		}
		return 'Utilisateur inconnu';
	}

	function getStatusBadge(status: 'pending' | 'accepted' | 'rejected' | null): {
		icon: typeof Check | typeof Clock | typeof UserX | null;
		label: string;
		class: string;
	} {
		switch (status) {
			case 'accepted':
				return {
					icon: Check,
					label: 'Déjà ami',
					class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
				};
			case 'pending':
				return {
					icon: Clock,
					label: 'En attente',
					class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
				};
			case 'rejected':
				return {
					icon: UserX,
					label: 'Refusée',
					class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
				};
			default:
				return { icon: null, label: '', class: '' };
		}
	}
</script>

<div class="space-y-6">
	<!-- Classes Section -->
	{#if isLoadingClasses}
		<div class="flex items-center justify-center gap-2 py-6">
			<Loader2 class="size-5 animate-spin text-muted-foreground" />
			<p class="text-muted-foreground">Chargement des classes...</p>
		</div>
	{:else if allClasses.length > 0}
		<div class="space-y-4">
			<!-- Header with class selector -->
			<div class="flex flex-wrap items-center gap-3">
				<div class="flex items-center gap-2">
					<Users class="size-5 text-primary" />
					<h2 class="text-lg font-semibold">Élèves de</h2>
				</div>
				<MySelect
					type="single"
					value={selectedClassId}
					onValueChange={handleClassChange}
					items={classSelectItems}
					placeholder="Sélectionner une classe"
					triggerClass="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm font-medium"
				/>
			</div>

			<!-- Students list for selected class -->
			{#if isLoadingStudents}
				<div class="py-4 text-center">
					<Loader2 class="mx-auto size-6 animate-spin text-muted-foreground" />
					<p class="mt-2 text-sm text-muted-foreground">Chargement des élèves...</p>
				</div>
			{:else if studentsInClass.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground italic">
					Aucun élève dans cette classe
				</p>
			{:else}
				<div class="space-y-2">
					{#each studentsInClass as classmate (classmate.id)}
						{@const displayName =
							classmate.full_name ||
							`${classmate.firstname || ''} ${classmate.lastname || ''}`.trim() ||
							'Utilisateur inconnu'}
						{@const badge = getStatusBadge(classmate.friendship_status ?? null)}
						<div
							class="flex items-center justify-between rounded-lg border border-border bg-card p-3"
						>
							<div class="flex items-center gap-3">
								<!-- Avatar -->
								<Avatar.Root class="size-9">
									<Avatar.Image src={getAvatarUrl(classmate)} alt={displayName} />
									<Avatar.Fallback>
										{displayName.charAt(0).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>

								<!-- Name -->
								<p class="font-medium">{displayName}</p>
							</div>

							<!-- Action or Status -->
							<div>
								{#if classmate.friendship_status}
									<div
										class="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium {badge.class}"
									>
										{#if badge.icon}
											<badge.icon class="size-4" />
										{/if}
										{badge.label}
									</div>
								{:else}
									{@const isLoading = sendingRequestTo.has(classmate.id)}
									<Button
										size="sm"
										disabled={isLoading}
										onclick={() => handleSendRequestToClassmate(classmate.id, displayName)}
									>
										{#if isLoading}
											<Loader2 class="mr-1 size-4 animate-spin" />
											Envoi...
										{:else}
											<UserPlus class="mr-1 size-4" />
											Ajouter
										{/if}
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Separator -->
		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t border-border"></span>
			</div>
			<div class="relative flex justify-center text-xs uppercase">
				<span class="bg-background px-2 text-muted-foreground">ou rechercher</span>
			</div>
		</div>
	{/if}

	<!-- Search Section -->
	<div class="space-y-3">
		<div class="flex gap-2">
			<div class="relative flex-1">
				<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Rechercher par nom..."
					bind:value={searchQuery}
					class="pl-10"
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
				/>
			</div>
			<Button onclick={handleSearch} disabled={isSearching}>
				{isSearching ? 'Recherche...' : 'Rechercher'}
			</Button>
		</div>

		<!-- Friendship Type Selector -->
		<div class="flex items-center gap-3">
			<label for="friendship-type" class="text-sm font-medium">Type de relation :</label>
			<MySelect
				type="single"
				bind:value={selectedFriendshipType}
				items={friendshipTypeItems}
				placeholder="Sélectionner..."
				triggerClass="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
			/>
		</div>
	</div>

	<!-- Search Results -->
	{#if searchResults.length > 0}
		<div class="space-y-2">
			<h3 class="text-sm font-medium text-muted-foreground">
				{searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
			</h3>

			{#each searchResults as user (user.id)}
				<div class="flex items-center justify-between rounded-lg border border-border bg-card p-4">
					<div class="flex items-center gap-3">
						<!-- Avatar -->
						<Avatar.Root class="size-10">
							<Avatar.Image src={getAvatarUrl(user)} alt={getDisplayName(user)} />
							<Avatar.Fallback>
								{getDisplayName(user).charAt(0).toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>

						<!-- Name and Role -->
						<div>
							<p class="font-medium">{getDisplayName(user)}</p>
							<p class="text-sm text-muted-foreground">
								{user.role === 'teacher' ? 'Enseignant' : 'Élève'}
							</p>
						</div>
					</div>

					<!-- Action or Status -->
					<div>
						{#if user.friendship_status}
							{@const badge = getStatusBadge(user.friendship_status)}
							<div
								class="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium {badge.class}"
							>
								{#if badge.icon}
									<!-- Svelte 5: Components are dynamic by default -->
									<badge.icon class="size-4" />
								{/if}
								{badge.label}
							</div>
						{:else}
							{@const isLoading = sendingRequestTo.has(user.id)}
							<Button
								size="sm"
								disabled={isLoading}
								onclick={() => handleSendRequest(user.id, getDisplayName(user))}
							>
								{#if isLoading}
									<Loader2 class="mr-1 size-4 animate-spin" />
									Envoi...
								{:else}
									<UserPlus class="mr-1 size-4" />
									Ajouter
								{/if}
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else if searchQuery && !isSearching}
		<div class="rounded-lg border border-border bg-card p-8 text-center">
			<Search class="mx-auto size-12 text-muted-foreground" />
			<p class="mt-4 text-sm text-muted-foreground">
				Commencez à taper pour rechercher des utilisateurs
			</p>
		</div>
	{/if}
</div>
