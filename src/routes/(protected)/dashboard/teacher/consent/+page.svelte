<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getAvatarUrl } from '$lib/utils/avatar';
	import {
		ShieldCheck,
		AlertTriangle,
		Clock,
		Send,
		CheckCircle2,
		XCircle,
		Users,
		ExternalLink,
		Edit2,
		Save,
		X
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Track which students are being edited
	let editingEmails = $state<Record<string, string>>({});
	let sendingEmails = $state<Record<string, boolean>>({});

	// Format date for display
	function formatDate(dateString: string | null): string {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	// Format grade for display
	function formatGrade(grade: string | null): string {
		if (!grade) return '-';
		const gradeNames: Record<string, string> = {
			'6': '6ème',
			'5': '5ème',
			'4': '4ème',
			'3': '3ème',
			'2': '2nde'
		};
		return gradeNames[grade] || grade;
	}

	// Get status badge variant
	function getStatusBadge(status: string): {
		variant: 'default' | 'secondary' | 'destructive' | 'outline';
		label: string;
	} {
		switch (status) {
			case 'granted':
				return { variant: 'default', label: 'Accordé' };
			case 'grace_period':
				return { variant: 'secondary', label: 'Période de grâce' };
			case 'pending':
				return { variant: 'outline', label: 'En attente' };
			case 'expired':
				return { variant: 'destructive', label: 'Expiré' };
			default:
				return { variant: 'outline', label: status };
		}
	}

	// Start editing parent email
	function startEditing(studentId: string, currentEmail: string | null) {
		editingEmails[studentId] = currentEmail || '';
	}

	// Cancel editing
	function cancelEditing(studentId: string) {
		delete editingEmails[studentId];
		editingEmails = { ...editingEmails };
	}

	// Send consent email
	async function sendConsentEmail(studentId: string, parentEmail: string) {
		if (!parentEmail) {
			toaster.error("Veuillez d'abord saisir l'email du parent");
			return;
		}

		sendingEmails[studentId] = true;

		try {
			const response = await fetch('/api/consent/send-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ student_id: studentId, parent_email: parentEmail })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || result.error || "Erreur lors de l'envoi");
			}

			toaster.success('Email de consentement envoyé !');
			await invalidateAll();
		} catch (err) {
			console.error('[Consent Page] Send error:', err);
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'envoi");
		} finally {
			sendingEmails[studentId] = false;
		}
	}

	// Get student name
	function getStudentName(student: { firstname: string | null; lastname: string | null }): string {
		if (student.firstname && student.lastname) {
			return `${student.firstname} ${student.lastname}`;
		}
		return student.firstname || student.lastname || 'Élève';
	}
</script>

<svelte:head>
	<title>Gestion du consentement parental - UbuMaths</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div class="space-y-1">
			<div class="flex items-center gap-3">
				<ShieldCheck class="h-8 w-8 text-primary" />
				<h1 class="text-3xl font-bold tracking-tight">Consentement parental</h1>
			</div>
			<p class="text-muted-foreground">
				Gestion du consentement RGPD pour les élèves de moins de 15 ans
			</p>
		</div>
	</div>

	<!-- Gmail Access Warning -->
	{#if !data.hasGmailAccess}
		<Alert.Root variant="destructive">
			<AlertTriangle class="h-4 w-4" />
			<Alert.Title>Accès Gmail requis</Alert.Title>
			<Alert.Description class="flex items-center gap-2">
				Pour envoyer des emails de consentement, connectez votre compte Google avec Gmail.
				<Button variant="outline" size="sm" href="/dashboard/teacher/settings/google">
					<ExternalLink class="mr-2 h-4 w-4" />
					Paramètres Google
				</Button>
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Content class="flex items-center gap-4 pt-6">
				<div class="rounded-full bg-blue-100 p-3">
					<Users class="h-6 w-6 text-blue-600" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.stats.total}</p>
					<p class="text-sm text-muted-foreground">Élèves concernés</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center gap-4 pt-6">
				<div class="rounded-full bg-green-100 p-3">
					<CheckCircle2 class="h-6 w-6 text-green-600" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.stats.granted}</p>
					<p class="text-sm text-muted-foreground">Consentements accordés</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center gap-4 pt-6">
				<div class="rounded-full bg-amber-100 p-3">
					<Clock class="h-6 w-6 text-amber-600" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.stats.graceCount}</p>
					<p class="text-sm text-muted-foreground">En période de grâce</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center gap-4 pt-6">
				<div class="rounded-full bg-red-100 p-3">
					<XCircle class="h-6 w-6 text-red-600" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.stats.pending}</p>
					<p class="text-sm text-muted-foreground">En attente</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- No students message -->
	{#if data.classes.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<ShieldCheck class="mx-auto h-12 w-12 text-muted-foreground" />
				<h3 class="mt-4 text-lg font-semibold">Aucun élève concerné</h3>
				<p class="mt-2 text-muted-foreground">
					Vous n'avez pas d'élèves nécessitant un consentement parental (classes 6ème à 2nde).
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Classes Tabs -->
		<Tabs.Root value={data.classes[0]?.id}>
			<Tabs.List class="mb-4">
				{#each data.classes as classItem (classItem.id)}
					<Tabs.Trigger value={classItem.id}>
						{classItem.name}
						<Badge variant="secondary" class="ml-2">{classItem.students.length}</Badge>
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			{#each data.classes as classItem (classItem.id)}
				<Tabs.Content value={classItem.id}>
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Users class="h-5 w-5" />
								{classItem.name}
							</Card.Title>
							<Card.Description>
								{classItem.students.length} élève(s) nécessitant un consentement parental
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								{#each classItem.students as student (student.id)}
									{@const statusBadge = getStatusBadge(student.consent_status)}
									<div
										class="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
									>
										<!-- Student Info -->
										<div class="flex items-center gap-3">
											<Avatar.Root class="h-10 w-10">
												<Avatar.Image
													src={getAvatarUrl(student.avatar_url)}
													alt={getStudentName(student)}
												/>
												<Avatar.Fallback>
													{(student.firstname?.[0] || '') + (student.lastname?.[0] || '')}
												</Avatar.Fallback>
											</Avatar.Root>
											<div>
												<p class="font-medium">{getStudentName(student)}</p>
												<p class="text-sm text-muted-foreground">
													{formatGrade(student.grade)}
												</p>
											</div>
										</div>

										<!-- Status Badge -->
										<div class="flex items-center gap-2">
											<Badge variant={statusBadge.variant}>
												{#if student.consent_status === 'granted'}
													<CheckCircle2 class="mr-1 h-3 w-3" />
												{:else if student.consent_status === 'grace_period'}
													<Clock class="mr-1 h-3 w-3" />
												{:else if student.consent_status === 'expired'}
													<XCircle class="mr-1 h-3 w-3" />
												{/if}
												{statusBadge.label}
											</Badge>
											{#if student.consent_status === 'grace_period' && student.consent_grace_period_ends}
												<span class="text-xs text-muted-foreground">
													jusqu'au {formatDate(student.consent_grace_period_ends)}
												</span>
											{/if}
										</div>

										<!-- Parent Email & Actions -->
										<div class="flex flex-1 items-center justify-end gap-2">
											{#if editingEmails[student.id] !== undefined}
												<!-- Edit Mode -->
												<form
													method="POST"
													action="?/updateParentEmail"
													use:enhance={() => {
														return async ({ result }) => {
															if (result.type === 'success') {
																toaster.success('Email mis à jour');
																cancelEditing(student.id);
																await invalidateAll();
															} else if (result.type === 'failure') {
																toaster.error(String(result.data?.error || 'Erreur'));
															}
														};
													}}
													class="flex items-center gap-2"
												>
													<input type="hidden" name="studentId" value={student.id} />
													<Input
														type="email"
														name="parentEmail"
														bind:value={editingEmails[student.id]}
														placeholder="parent@email.com"
														class="w-64"
													/>
													<Button type="submit" size="sm" variant="ghost">
														<Save class="h-4 w-4" />
													</Button>
													<Button
														type="button"
														size="sm"
														variant="ghost"
														onclick={() => cancelEditing(student.id)}
													>
														<X class="h-4 w-4" />
													</Button>
												</form>
											{:else}
												<!-- Display Mode -->
												<div class="flex items-center gap-2">
													{#if student.parent_email}
														<span class="text-sm">{student.parent_email}</span>
													{:else}
														<span class="text-sm text-muted-foreground italic">
															Aucun email parent
														</span>
													{/if}
													<Button
														size="sm"
														variant="ghost"
														onclick={() => startEditing(student.id, student.parent_email)}
													>
														<Edit2 class="h-4 w-4" />
													</Button>
												</div>

												<!-- Send Email Button -->
												{#if student.consent_status !== 'granted'}
													<Button
														size="sm"
														variant={student.parent_email ? 'default' : 'outline'}
														disabled={!data.hasGmailAccess ||
															!student.parent_email ||
															sendingEmails[student.id] ||
															student.email_count >= 5}
														onclick={() => sendConsentEmail(student.id, student.parent_email || '')}
													>
														{#if sendingEmails[student.id]}
															<span class="animate-pulse">Envoi...</span>
														{:else}
															<Send class="mr-1 h-4 w-4" />
															{student.email_count > 0 ? 'Renvoyer' : 'Envoyer'}
															{#if student.email_count > 0}
																<span class="ml-1 text-xs">({student.email_count}/5)</span>
															{/if}
														{/if}
													</Button>
												{/if}
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	{/if}

	<!-- Help Section -->
	<Card.Root class="border-blue-200 bg-blue-50">
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-blue-700">
				<AlertTriangle class="h-5 w-5" />
				Conformité RGPD
			</Card.Title>
		</Card.Header>
		<Card.Content class="text-sm text-blue-800">
			<p class="mb-2">
				<strong>Article 8 du RGPD</strong> : Le consentement parental est requis pour les mineurs de
				moins de 15 ans en France.
			</p>
			<ul class="ml-4 list-disc space-y-1">
				<li>
					<strong>Accordé</strong> : L'élève a un accès complet à toutes les fonctionnalités.
				</li>
				<li>
					<strong>Période de grâce</strong> : Accès complet temporaire pendant 30 jours pour les élèves
					existants.
				</li>
				<li>
					<strong>En attente</strong> : L'élève a un accès en lecture seule (ne peut pas soumettre de
					réponses, envoyer de messages, etc.).
				</li>
				<li>
					<strong>Expiré</strong> : Le lien de consentement a expiré. Renvoyez un email.
				</li>
			</ul>
		</Card.Content>
	</Card.Root>
</div>
