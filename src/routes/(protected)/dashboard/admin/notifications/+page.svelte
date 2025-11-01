<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Plus, Trash2, Send } from 'lucide-svelte';
	import {
		NOTIFICATION_TYPE_LABELS,
		NOTIFICATION_PRIORITY_LABELS,
		type NotificationType,
		type NotificationPriority,
		type NotificationTargetType
	} from '$lib/types/notification';

	let { data }: { data: PageData } = $props();

	// Form state
	let title = $state('');
	let message = $state('');
	let type = $state<NotificationType>('info');
	let priority = $state<NotificationPriority>('normal');
	let targetType = $state<NotificationTargetType>('all');
	let selectedRoles = $state<string[]>([]);
	let selectedClassIds = $state<string[]>([]);
	let selectedUserIds = $state<string[]>([]);
	let actionLabel = $state('');
	let actionUrl = $state('');
	let isSubmitting = $state(false);
	let showForm = $state(false);

	// Filter users by selected roles
	const availableUsers = $derived(
		targetType === 'users' && selectedRoles.length > 0
			? data.users.filter((u) => selectedRoles.includes(u.role))
			: targetType === 'users'
				? data.users
				: []
	);

	// Reset form
	function resetForm() {
		title = '';
		message = '';
		type = 'info';
		priority = 'normal';
		targetType = 'all';
		selectedRoles = [];
		selectedClassIds = [];
		selectedUserIds = [];
		actionLabel = '';
		actionUrl = '';
		showForm = false;
	}

	// Toggle selections
	function toggleRole(role: string) {
		if (selectedRoles.includes(role)) {
			selectedRoles = selectedRoles.filter((r) => r !== role);
		} else {
			selectedRoles = [...selectedRoles, role];
		}
	}

	function toggleClass(classId: string) {
		if (selectedClassIds.includes(classId)) {
			selectedClassIds = selectedClassIds.filter((id) => id !== classId);
		} else {
			selectedClassIds = [...selectedClassIds, classId];
		}
	}

	function toggleUser(userId: string) {
		if (selectedUserIds.includes(userId)) {
			selectedUserIds = selectedUserIds.filter((id) => id !== userId);
		} else {
			selectedUserIds = [...selectedUserIds, userId];
		}
	}

	// Format date
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Role labels
	const roleLabels: Record<string, string> = {
		admin: 'Administrateurs',
		teacher: 'Professeurs',
		student: 'Élèves'
	};

	// Items for MySelect dropdowns
	const typeItems = Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => ({
		value,
		label
	}));

	const priorityItems = Object.entries(NOTIFICATION_PRIORITY_LABELS).map(([value, label]) => ({
		value,
		label
	}));
</script>

<svelte:head>
	<title>Notifications - Admin - UbuMaths</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Notifications système</h1>
			<p class="mt-2 text-muted-foreground">Créez et gérez les notifications globales</p>
		</div>

		<Button onclick={() => (showForm = !showForm)}>
			<Plus class="mr-2 h-4 w-4" />
			{showForm ? 'Annuler' : 'Nouvelle notification'}
		</Button>
	</div>

	<!-- Create form -->
	{#if showForm}
		<Card.Root>
			<Card.Header>
				<Card.Title>Créer une notification</Card.Title>
				<Card.Description>
					Envoyez une notification à tous les utilisateurs ou à des groupes spécifiques
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ result, update }) => {
							if (result.type === 'success') {
								toaster.success('Notification créée avec succès');
								resetForm();
							} else if (result.type === 'failure') {
								const errorData = result.data as { error?: string };
								toaster.error(errorData?.error || 'Erreur lors de la création');
							}
							isSubmitting = false;
							await update();
						};
					}}
				>
					<div class="space-y-4">
						<!-- Type and Priority -->
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="type">Type</Label>
								<MySelect
									type="single"
									bind:value={type}
									items={typeItems}
									triggerClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
								/>
								<input type="hidden" name="type" value={type} />
							</div>

							<div class="space-y-2">
								<Label for="priority">Priorité</Label>
								<MySelect
									type="single"
									bind:value={priority}
									items={priorityItems}
									triggerClass="h-9 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
								/>
								<input type="hidden" name="priority" value={priority} />
							</div>
						</div>

						<!-- Title -->
						<div class="space-y-2">
							<Label for="title">Titre</Label>
							<Input id="title" name="title" bind:value={title} required />
						</div>

						<!-- Message (Rich Text) -->
						<div class="space-y-2">
							<Label for="message">Message</Label>
							<input type="hidden" name="message" value={message} />
						</div>

						<!-- Target Type -->
						<div class="space-y-2">
							<Label>Ciblage</Label>
							<div class="grid gap-2 sm:grid-cols-2">
								<label class="flex items-center gap-2 rounded border p-2 hover:bg-muted">
									<input type="radio" bind:group={targetType} value="all" class="h-4 w-4" />
									<span>Tous les utilisateurs</span>
								</label>
								<label class="flex items-center gap-2 rounded border p-2 hover:bg-muted">
									<input type="radio" bind:group={targetType} value="role" class="h-4 w-4" />
									<span>Par rôle</span>
								</label>
								<label class="flex items-center gap-2 rounded border p-2 hover:bg-muted">
									<input type="radio" bind:group={targetType} value="classes" class="h-4 w-4" />
									<span>Par classe</span>
								</label>
								<label class="flex items-center gap-2 rounded border p-2 hover:bg-muted">
									<input type="radio" bind:group={targetType} value="users" class="h-4 w-4" />
									<span>Utilisateurs spécifiques</span>
								</label>
							</div>
							<input type="hidden" name="targetType" value={targetType} />
						</div>

						<!-- Role selection -->
						{#if targetType === 'role' || targetType === 'users'}
							<div class="space-y-2">
								<Label
									>{targetType === 'role' ? 'Sélectionner les rôles' : 'Filtrer par rôle'}</Label
								>
								<div class="grid gap-2 sm:grid-cols-3">
									{#each ['admin', 'teacher', 'student'] as role (role)}
										<label class="flex items-center gap-2 rounded border p-2 hover:bg-muted">
											<input
												type="checkbox"
												checked={selectedRoles.includes(role)}
												onchange={() => toggleRole(role)}
												class="h-4 w-4"
											/>
											<span>{roleLabels[role]}</span>
											{#if targetType === 'role'}
												<input
													type="hidden"
													name="roles"
													value={role}
													disabled={!selectedRoles.includes(role)}
												/>
											{/if}
										</label>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Class selection -->
						{#if targetType === 'classes'}
							<div class="space-y-2">
								<Label>Sélectionner les classes</Label>
								<div class="max-h-48 overflow-y-auto rounded border p-2">
									<div class="grid gap-2 sm:grid-cols-2">
										{#each data.classes as cls (cls.id)}
											<label class="flex items-center gap-2 rounded p-2 hover:bg-muted">
												<input
													type="checkbox"
													checked={selectedClassIds.includes(cls.id)}
													onchange={() => toggleClass(cls.id)}
													class="h-4 w-4"
												/>
												<span>{cls.name}</span>
												<input
													type="hidden"
													name="classIds"
													value={cls.id}
													disabled={!selectedClassIds.includes(cls.id)}
												/>
											</label>
										{/each}
									</div>
								</div>
							</div>
						{/if}

						<!-- User selection -->
						{#if targetType === 'users'}
							<div class="space-y-2">
								<Label>Sélectionner les utilisateurs</Label>
								<div class="max-h-48 overflow-y-auto rounded border p-2">
									{#if availableUsers.length > 0}
										<div class="grid gap-2 sm:grid-cols-2">
											{#each availableUsers as user (user.id)}
												<label class="flex items-center gap-2 rounded p-2 text-sm hover:bg-muted">
													<input
														type="checkbox"
														checked={selectedUserIds.includes(user.id)}
														onchange={() => toggleUser(user.id)}
														class="h-4 w-4"
													/>
													<div class="flex-1">
														<div class="font-medium">
															{user.firstname || ''}
															{user.lastname || user.email}
														</div>
														<div class="text-xs text-muted-foreground">{roleLabels[user.role]}</div>
													</div>
													<input
														type="hidden"
														name="userIds"
														value={user.id}
														disabled={!selectedUserIds.includes(user.id)}
													/>
												</label>
											{/each}
										</div>
									{:else}
										<p class="text-sm text-muted-foreground">
											{selectedRoles.length > 0
												? 'Aucun utilisateur avec les rôles sélectionnés'
												: 'Sélectionnez un rôle pour afficher les utilisateurs'}
										</p>
									{/if}
								</div>
							</div>
						{/if}

						<Separator />

						<!-- Optional action -->
						<div class="space-y-2">
							<Label>Action optionnelle</Label>
							<div class="grid gap-4 sm:grid-cols-2">
								<div class="space-y-2">
									<Label for="actionLabel" class="text-sm">Libellé du bouton</Label>
									<Input
										id="actionLabel"
										name="actionLabel"
										bind:value={actionLabel}
									/>
								</div>
								<div class="space-y-2">
									<Label for="actionUrl" class="text-sm">URL</Label>
									<Input
										id="actionUrl"
										name="actionUrl"
										bind:value={actionUrl}
									/>
								</div>
							</div>
						</div>

						<!-- Submit -->
						<div class="flex justify-end gap-2">
							<Button type="button" variant="outline" onclick={resetForm}>Annuler</Button>
							<Button type="submit" disabled={isSubmitting}>
								<Send class="mr-2 h-4 w-4" />
								{isSubmitting ? 'Envoi...' : 'Envoyer la notification'}
							</Button>
						</div>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Notifications list -->
	<div class="space-y-4">
		<h2 class="text-2xl font-bold">Notifications créées</h2>

		{#if data.notificationStats.length === 0}
			<Card.Root>
				<Card.Content class="py-12 text-center">
					<p class="text-muted-foreground">Aucune notification créée</p>
				</Card.Content>
			</Card.Root>
		{:else}
			{#each data.notificationStats as stat (stat.id)}
				<Card.Root>
					<Card.Header>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<Card.Title>{stat.title}</Card.Title>
								<Card.Description class="mt-2">
									{formatDate(stat.created_at)}
								</Card.Description>
							</div>
							<form
								method="POST"
								action="?/delete"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											toaster.success('Notification supprimée');
										} else if (result.type === 'failure') {
											const errorData = result.data as { error?: string };
											toaster.error(errorData?.error || 'Erreur lors de la suppression');
										}
										await update();
									};
								}}
							>
								<input type="hidden" name="notificationId" value={stat.id} />
								<Button type="submit" variant="ghost" size="icon">
									<Trash2 class="h-4 w-4" />
								</Button>
							</form>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							<div class="flex items-center gap-4 text-sm">
								<span class="font-medium">Destinataires:</span>
								<span>{stat.target_summary}</span>
							</div>
							<div class="flex items-center gap-4 text-sm">
								<span class="font-medium">Lu par:</span>
								<span>
									{stat.read_count}/{stat.total_recipients}
									<span class="text-muted-foreground">
										({stat.read_percentage}%)
									</span>
								</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full bg-primary transition-all"
									style="width: {stat.read_percentage}%"
								></div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		{/if}
	</div>
</div>
