<script lang="ts">
	import { privateMessages } from '$lib/stores/privateMessages.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte';
	import * as Select from '$lib/components/ui/select';
	import { Loader2, Send, X, Save, Check, Paperclip, FileIcon, Trash2, Reply } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { uploadMultipleMessageAttachments } from '$lib/utils/file-upload';
	import { supabase } from '$lib/supabaseClient';

	let subject = $state('');
	let content = $state('');
	let contentJson = $state<any>(null);
	let selectedRecipients = $state<string[]>([]);
	let isGroupMessage = $state(false);
	let selectedClassId = $state<string | null>(null);
	let isSending = $state(false);
	let currentDraftId = $state<string | null>(null);
	let autosaveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let isLoadingDraft = $state(false);
	let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
	let replyToMessageId = $state<string | null>(null);
	let attachments = $state<File[]>([]);
	let fileInputRef: HTMLInputElement;
	let failedAvatars = $state<Set<string>>(new Set());

	const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
	const MAX_FILES = 3;

	// Load recipients and draft on mount
	onMount(() => {
		privateMessages.loadRecipients();

		// Check if we're editing an existing draft
		const draftId = page.url.searchParams.get('draftId');
		if (draftId) {
			loadDraft(draftId);
		}

		// Check if we're replying to a message
		const replyTo = page.url.searchParams.get('replyTo');
		const replySubject = page.url.searchParams.get('subject');
		const recipientId = page.url.searchParams.get('recipientId');

		if (replyTo && recipientId) {
			replyToMessageId = replyTo;
			if (replySubject) {
				subject = replySubject;
			}
			// Pre-select the recipient (will be applied after recipients load)
			setTimeout(() => {
				if (!selectedRecipients.includes(recipientId)) {
					selectedRecipients = [recipientId];
				}
			}, 100);
		}

		// Cleanup autosave timer on unmount
		return () => {
			if (autosaveTimer) {
				clearTimeout(autosaveTimer);
			}
		};
	});

	// Keyboard shortcuts
	onMount(() => {
		function handleKeyDown(e: KeyboardEvent) {
			// Ctrl/Cmd + Enter to send
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
				e.preventDefault();
				if (!isSending) {
					sendMessage();
				}
			}
			// Ctrl/Cmd + S to save draft
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault();
				if (!isSending) {
					saveDraft();
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	// Load existing draft
	async function loadDraft(draftId: string) {
		isLoadingDraft = true;
		try {
			const response = await fetch(`/api/messages/drafts/${draftId}`);
			if (!response.ok) {
				throw new Error('Draft not found');
			}

			const data = await response.json();
			const draft = data.draft;

			// Populate form fields
			currentDraftId = draft.id;
			subject = draft.subject || '';
			content = draft.content || '';
			selectedRecipients = draft.recipient_ids || [];
			isGroupMessage = draft.is_group_message || false;
			selectedClassId = draft.class_id || null;
		} catch (error) {
			console.error('Error loading draft:', error);
		} finally {
			isLoadingDraft = false;
		}
	}

	// Auto-save draft effect
	$effect(() => {
		// Don't autosave if form is empty or loading
		if (isLoadingDraft || isSending) return;

		// Only autosave if there's some content
		const hasContent =
			subject.trim() ||
			(content && content !== '<p></p>') ||
			selectedRecipients.length > 0 ||
			isGroupMessage;

		if (!hasContent) return;

		// Clear existing timer
		if (autosaveTimer) {
			clearTimeout(autosaveTimer);
		}

		// Set new timer for 30 seconds
		autosaveTimer = setTimeout(async () => {
			await saveDraft();
		}, 30000); // 30 seconds
	});

	// Save draft
	async function saveDraft() {
		autosaveStatus = 'saving';
		try {
			const draft = await privateMessages.saveDraft({
				id: currentDraftId || undefined,
				subject: subject.trim() || undefined,
				content: content || undefined,
				recipientIds: selectedRecipients.length > 0 ? selectedRecipients : undefined,
				isGroupMessage,
				classId: selectedClassId || undefined
			});

			// Update current draft ID if this was a new draft
			if (!currentDraftId && draft) {
				currentDraftId = draft.id;
			}

			autosaveStatus = 'saved';

			// Reset to idle after 2 seconds
			setTimeout(() => {
				autosaveStatus = 'idle';
			}, 2000);
		} catch (error) {
			console.error('Error saving draft:', error);
			autosaveStatus = 'idle';
		}
	}

	// Handle form submission
	async function handleSubmit() {
		if (!subject.trim()) {
			toaster.error('Le sujet est requis');
			return;
		}

		if (!content || content === '<p></p>') {
			toaster.error('Le contenu ne peut pas être vide');
			return;
		}

		if (!isGroupMessage && selectedRecipients.length === 0) {
			toaster.error('Veuillez sélectionner au moins un destinataire');
			return;
		}

		if (isGroupMessage && !selectedClassId) {
			toaster.error('Veuillez sélectionner une classe');
			return;
		}

		try {
			isSending = true;

			// Send the message first
			const messageId = await privateMessages.sendMessage({
				recipientIds: isGroupMessage ? undefined : selectedRecipients,
				subject: subject.trim(),
				content: contentJson || {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }]
				},
				isGroupMessage,
				classId: isGroupMessage ? selectedClassId! : undefined,
				parentMessageId: replyToMessageId || undefined
			});

			// Upload attachments if any
			if (attachments.length > 0 && messageId) {
				try {
					const uploadResults = await uploadMultipleMessageAttachments(
						supabase,
						attachments,
						messageId
					);

					// Check for upload failures
					const failures = uploadResults.filter((r) => !r.success);
					if (failures.length > 0) {
						console.error('Some attachments failed to upload:', failures);
						toaster.warning(
							`Message envoyé, mais ${failures.length} pièce(s) jointe(s) n'ont pas pu être uploadées`
						);
					}

					// Save successful attachments to database
					const successfulAttachments = uploadResults
						.filter((r) => r.success && r.attachment)
						.map((r) => r.attachment!);

					if (successfulAttachments.length > 0) {
						await saveAttachmentsToDatabase(messageId, successfulAttachments);
					}
				} catch (uploadError) {
					console.error('Error uploading attachments:', uploadError);
					// Don't block message send if attachments fail
					toaster.warning('Message envoyé, mais les pièces jointes ont échoué');
				}
			}

			// Delete draft if exists
			if (currentDraftId) {
				await privateMessages.deleteDraft(currentDraftId);
			}

			toaster.success('Message envoyé avec succès');

			// Navigate to sent messages
			goto('/messages/sent');
		} catch (error) {
			console.error('Error sending message:', error);
			toaster.error("Erreur lors de l'envoi du message");
		} finally {
			isSending = false;
		}
	}

	// Save attachments to database
	async function saveAttachmentsToDatabase(
		messageId: string,
		attachmentData: Array<{
			file_name: string;
			file_type: string;
			file_size: number;
			storage_path: string;
			public_url: string;
		}>
	) {
		try {
			const attachmentRecords = attachmentData.map((att) => ({
				message_id: messageId,
				file_name: att.file_name,
				file_type: att.file_type,
				file_size: att.file_size,
				storage_path: att.storage_path,
				public_url: att.public_url
			}));

			const { error } = await supabase.from('message_attachments_v2').insert(attachmentRecords);

			if (error) {
				console.error('Error saving attachment records:', error);
				throw error;
			}
		} catch (error) {
			console.error('Error in saveAttachmentsToDatabase:', error);
			throw error;
		}
	}

	// Toggle recipient selection
	function toggleRecipient(recipientId: string) {
		if (selectedRecipients.includes(recipientId)) {
			selectedRecipients = selectedRecipients.filter((id) => id !== recipientId);
		} else {
			selectedRecipients = [...selectedRecipients, recipientId];
		}
	}

	// Select all recipients
	function selectAll() {
		selectedRecipients = privateMessages.recipients.map((r) => r.user_id);
	}

	// Clear all recipients
	function clearAll() {
		selectedRecipients = [];
	}

	// Handle file selection
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files || []);

		// Validate file count
		if (attachments.length + files.length > MAX_FILES) {
			toaster.error(`Vous ne pouvez joindre que ${MAX_FILES} fichiers maximum`);
			input.value = '';
			return;
		}

		// Validate each file
		for (const file of files) {
			if (file.size > MAX_FILE_SIZE) {
				toaster.error(`Le fichier "${file.name}" dépasse la taille maximale de 5MB`);
				input.value = '';
				return;
			}
		}

		// Add valid files
		attachments = [...attachments, ...files];
		input.value = '';
	}

	// Remove attachment
	function removeAttachment(index: number) {
		attachments = attachments.filter((_, i) => i !== index);
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	// Handle avatar load error
	function handleAvatarError(userId: string) {
		failedAvatars.add(userId);
		failedAvatars = failedAvatars; // Trigger reactivity
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-border bg-card p-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-foreground">
					{#if replyToMessageId}
						Répondre au message
					{:else if currentDraftId}
						Modifier le brouillon
					{:else}
						Nouveau message
					{/if}
				</h1>
				<div class="flex items-center gap-2">
					<p class="text-sm text-muted-foreground">
						{replyToMessageId
							? 'Votre réponse sera liée au message original'
							: 'Envoyez un message privé'}
					</p>
					{#if autosaveStatus === 'saving'}
						<span class="flex items-center gap-1 text-xs text-muted-foreground">
							<Loader2 class="h-3 w-3 animate-spin" />
							Sauvegarde...
						</span>
					{:else if autosaveStatus === 'saved'}
						<span class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
							<Check class="h-3 w-3" />
							Brouillon sauvegardé
						</span>
					{/if}
				</div>
			</div>
			<div class="flex gap-2">
				<Button
					variant="outline"
					onclick={saveDraft}
					disabled={autosaveStatus === 'saving' || isLoadingDraft}
				>
					<Save class="mr-2 h-4 w-4" />
					Enregistrer brouillon
				</Button>
				<Button variant="outline" onclick={() => goto('/messages/inbox')}>
					<X class="mr-2 h-4 w-4" />
					Annuler
				</Button>
			</div>
		</div>
	</div>

	<!-- Reply context banner -->
	{#if replyToMessageId}
		<div class="border-b border-border bg-blue-50 p-4 dark:bg-blue-950/20">
			<div class="mx-auto flex max-w-4xl items-center gap-2 text-sm">
				<Reply class="h-4 w-4 text-blue-600 dark:text-blue-400" />
				<span class="text-blue-700 dark:text-blue-300">
					En réponse à : <strong>{subject.replace('Re: ', '')}</strong>
				</span>
			</div>
		</div>
	{/if}

	<!-- Form -->
	<div class="flex-1 overflow-y-auto p-6">
		{#if isLoadingDraft}
			<div class="flex items-center justify-center py-12">
				<div class="text-center">
					<Loader2 class="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
					<p class="mt-2 text-sm text-muted-foreground">Chargement du brouillon...</p>
				</div>
			</div>
		{:else}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="mx-auto max-w-4xl space-y-6"
			>
				{#if privateMessages.isLoadingRecipients}
					<div class="flex items-center justify-center py-12">
						<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				{:else}
					<!-- Recipient Type (for teachers) -->
					{#if privateMessages.userRole === 'teacher' && privateMessages.classes.length > 0}
						<div class="space-y-2">
							<Label>Type de message</Label>
							<div class="flex gap-4">
								<label class="flex cursor-pointer items-center gap-2">
									<input
										type="radio"
										name="messageType"
										value="individual"
										checked={!isGroupMessage}
										onchange={() => {
											isGroupMessage = false;
											selectedClassId = null;
										}}
									/>
									<span>Individuel</span>
								</label>
								<label class="flex cursor-pointer items-center gap-2">
									<input
										type="radio"
										name="messageType"
										value="group"
										checked={isGroupMessage}
										onchange={() => {
											isGroupMessage = true;
											selectedRecipients = [];
										}}
									/>
									<span>Groupe (classe entière)</span>
								</label>
							</div>
						</div>
					{/if}

					<!-- Class selector (for group messages) -->
					{#if isGroupMessage}
						<div class="space-y-2">
							<Label for="class-select">Classe</Label>
							<Select.Root
								onSelectedChange={(v) => {
									selectedClassId = v?.value || null;
								}}
							>
								<Select.Trigger id="class-select">
									<Select.Value placeholder="Sélectionnez une classe" />
								</Select.Trigger>
								<Select.Content>
									{#each privateMessages.classes as classItem}
										<Select.Item value={classItem.class_id}>
											{classItem.class_name} ({classItem.student_count} élèves)
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{:else}
						<!-- Recipients selector (for individual messages) -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label>Destinataires</Label>
								{#if !replyToMessageId}
									<div class="flex gap-2">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onclick={selectAll}
											disabled={selectedRecipients.length === privateMessages.recipients.length}
										>
											Tout sélectionner
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onclick={clearAll}
											disabled={selectedRecipients.length === 0}
										>
											Tout effacer
										</Button>
									</div>
								{:else}
									<span class="text-xs text-muted-foreground">
										(Destinataire fixe pour la réponse)
									</span>
								{/if}
							</div>

							<div
								class="max-h-48 overflow-y-auto rounded-md border border-border bg-card p-4"
								class:opacity-75={replyToMessageId}
							>
								{#if privateMessages.recipients.length === 0}
									<p class="py-4 text-center text-sm text-muted-foreground">
										{#if privateMessages.userRole === 'student'}
											Aucun professeur disponible. Vous devez être inscrit dans une classe pour
											envoyer des messages.
										{:else if privateMessages.userRole === 'teacher'}
											Aucun élève disponible. Les élèves doivent être inscrits dans vos classes.
										{:else}
											Aucun destinataire disponible.
										{/if}
									</p>
								{:else}
									<div class="space-y-2">
										{#each privateMessages.recipients as recipient}
											<label
												class="flex cursor-pointer items-center gap-3 rounded p-2 transition-colors hover:bg-muted/50"
												class:pointer-events-none={replyToMessageId}
											>
												<input
													type="checkbox"
													checked={selectedRecipients.includes(recipient.user_id)}
													onchange={() => toggleRecipient(recipient.user_id)}
													class="h-4 w-4"
													disabled={replyToMessageId !== null}
												/>
												<div class="flex flex-1 items-center gap-2">
													{#if recipient.avatar_url && !failedAvatars.has(recipient.user_id)}
														<img
															src={recipient.avatar_url}
															alt={recipient.full_name}
															class="h-8 w-8 rounded-full object-cover"
															onerror={() => handleAvatarError(recipient.user_id)}
														/>
													{:else}
														<div
															class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground"
														>
															{recipient.full_name?.charAt(0)?.toUpperCase() || '?'}
														</div>
													{/if}
													<span class="text-sm font-medium">{recipient.full_name || 'Inconnu'}</span
													>
													<span class="text-xs text-muted-foreground">({recipient.role})</span>
												</div>
											</label>
										{/each}
									</div>
								{/if}
							</div>

							{#if selectedRecipients.length > 0}
								<p class="text-sm text-muted-foreground">
									{selectedRecipients.length} destinataire{selectedRecipients.length > 1 ? 's' : ''}
									sélectionné{selectedRecipients.length > 1 ? 's' : ''}
								</p>
							{/if}
						</div>
					{/if}

					<!-- Subject -->
					<div class="space-y-2">
						<Label for="subject">Sujet *</Label>
						<Input
							id="subject"
							type="text"
							bind:value={subject}
							placeholder="Entrez le sujet du message"
							maxlength={200}
							required
						/>
						<p class="text-xs text-muted-foreground">{subject.length}/200 caractères</p>
					</div>

					<!-- Content -->
					<div class="space-y-2">
						<Label for="content">Message *</Label>
						<FormRichTextEditor
							bind:value={content}
							bind:jsonValue={contentJson}
							placeholder="Écrivez votre message..."
						/>
					</div>

					<!-- Attachments -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label>Pièces jointes (optionnel)</Label>
							<span class="text-xs text-muted-foreground">
								Max {MAX_FILES} fichiers, 5MB chacun
							</span>
						</div>

						<!-- File upload button -->
						<div>
							<input
								type="file"
								bind:this={fileInputRef}
								onchange={handleFileSelect}
								multiple
								class="hidden"
								accept="*/*"
							/>
							<Button
								type="button"
								variant="outline"
								onclick={() => fileInputRef?.click()}
								disabled={attachments.length >= MAX_FILES}
							>
								<Paperclip class="mr-2 h-4 w-4" />
								Joindre des fichiers ({attachments.length}/{MAX_FILES})
							</Button>
						</div>

						<!-- Attachments list -->
						{#if attachments.length > 0}
							<div class="space-y-2">
								{#each attachments as file, index}
									<div
										class="flex items-center justify-between rounded-lg border border-border bg-card p-3"
									>
										<div class="flex items-center gap-3">
											<div
												class="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary"
											>
												<FileIcon class="h-5 w-5" />
											</div>
											<div>
												<div class="text-sm font-medium text-foreground">{file.name}</div>
												<div class="text-xs text-muted-foreground">
													{formatFileSize(file.size)} • {file.type || 'Fichier'}
												</div>
											</div>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onclick={() => removeAttachment(index)}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Actions -->
					<div class="flex items-center justify-end gap-3 border-t border-border pt-4">
						<Button type="button" variant="outline" onclick={() => goto('/messages/inbox')}>
							Annuler
						</Button>
						<Button type="submit" disabled={isSending}>
							{#if isSending}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Envoi en cours...
							{:else}
								<Send class="mr-2 h-4 w-4" />
								Envoyer
							{/if}
						</Button>
					</div>
				{/if}
			</form>
		{/if}
	</div>
</div>
