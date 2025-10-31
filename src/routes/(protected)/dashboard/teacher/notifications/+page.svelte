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
		type NotificationPriority
	} from '$lib/types/notification';

	let { data }: { data: PageData } = $props();

	// Form state
	let title = $state('');
	let message = $state('');
	let type = $state<NotificationType>('info');
	let priority = $state<NotificationPriority>('normal');
	let targetType = $state<'classes' | 'users'>('classes');
	let selectedClassIds = $state<string[]>([]);
	let selectedUserIds = $state<string[]>([]);
	let actionLabel = $state('');
	let actionUrl = $state('');
	let isSubmitting = $state(false);
	let showForm = $state(false);

	// Get students for selected classes
	const availableStudents = $derived(
		targetType === 'users' ? data.students.filter((s) => selectedClassIds.includes(s.class_id)) : []
	);

	// Items for MySelect dropdowns
	const typeItems = Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => ({
		value,
		label
	}));

	const priorityItems = Object.entries(NOTIFICATION_PRIORITY_LABELS).map(([value, label]) => ({
		value,
		label
	}));

	// Reset form
	function resetForm() {
		title = '';
		message = '';
		type = 'info';
		priority = 'normal';
		targetType = 'classes';
		selectedClassIds = [];
		selectedUserIds = [];
		actionLabel = '';
		actionUrl = '';
		showForm = false;
	}

	// Toggle class selection
	function toggleClass(classId: string) {
		if (selectedClassIds.includes(classId)) {
			selectedClassIds = selectedClassIds.filter((id) => id !== classId);
		} else {
			selectedClassIds = [...selectedClassIds, classId];
		}
	}

	// Toggle student selection
	function toggleStudent(studentId: string) {
		if (selectedUserIds.includes(studentId)) {
			selectedUserIds = selectedUserIds.filter((id) => id !== studentId);
		} else {
			selectedUserIds = [...selectedUserIds, studentId];
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
</script>

<svelte:head>
	<title>Mes notifications - Professeur - UbuMaths</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Mes notifications</h1>
			<p class="mt-2 text-muted-foreground">Créez et gérez vos notifications envoyées</p>
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
					Envoyez une notification à vos classes ou à des élèves spécifiques
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
								toaster.error(result.data?.error || 'Erreur lors de la création');
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
							<Label>Destinataires</Label>
							<div class="flex gap-4">
								<label class="flex items-center gap-2">
									<input type="radio" bind:group={targetType} value="classes" class="h-4 w-4" />
									<span>Classes entières</span>
								</label>
								<label class="flex items-center gap-2">
									<input type="radio" bind:group={targetType} value="users" class="h-4 w-4" />
									<span>Élèves spécifiques</span>
								</label>
							</div>
							<input type="hidden" name="targetType" value={targetType} />
						</div>

						<!-- Class selection (always show to filter students) -->
						<div class="space-y-2">
							<Label>
								{targetType === 'classes' ? 'Sélectionner les classes' : 'Filtrer par classe'}
							</Label>
							<div class="grid gap-2 sm:grid-cols-2">
								{#each data.classes as cls (cls.id)}
									<label class="flex items-center gap-2 rounded border p-2 hover:bg-muted">
										<input
											type="checkbox"
											checked={selectedClassIds.includes(cls.id)}
											onchange={() => toggleClass(cls.id)}
											class="h-4 w-4"
										/>
										<span>{cls.name}</span>
										{#if targetType === 'classes'}
											<input
												type="hidden"
												name="classIds"
												value={cls.id}
												disabled={!selectedClassIds.includes(cls.id)}
											/>
										{/if}
									</label>
								{/each}
							</div>
						</div>

						<!-- Student selection (if targetType is users) -->
						{#if targetType === 'users'}
							<div class="space-y-2">
								<Label>Sélectionner les élèves</Label>
								<div class="max-h-48 overflow-y-auto rounded border p-2">
									{#if availableStudents.length > 0}
										<div class="grid gap-2 sm:grid-cols-2">
											{#each availableStudents as student (student.id)}
												<label class="flex items-center gap-2 rounded p-2 hover:bg-muted">
													<input
														type="checkbox"
														checked={selectedUserIds.includes(student.id)}
														onchange={() => toggleStudent(student.id)}
														class="h-4 w-4"
													/>
													<span>{student.firstname} {student.lastname}</span>
													<input
														type="hidden"
														name="userIds"
														value={student.id}
														disabled={!selectedUserIds.includes(student.id)}
													/>
												</label>
											{/each}
										</div>
									{:else}
										<p class="text-sm text-muted-foreground">
											Sélectionnez d'abord une classe pour afficher les élèves
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
		<h2 class="text-2xl font-bold">Notifications envoyées</h2>

		{#if data.notificationStats.length === 0}
			<Card.Root>
				<Card.Content class="py-12 text-center">
					<p class="text-muted-foreground">Vous n'avez envoyé aucune notification</p>
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
											toaster.error(result.data?.error || 'Erreur lors de la suppression');
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
