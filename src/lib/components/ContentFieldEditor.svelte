<!--
	Content Field Editor Component
	===============================

	Editor for ContentField arrays (statement, correction, etc.).

	FEATURES:
	- Add/remove fields
	- Reorder fields
	- Text fields with LaTeX support
	- Image fields with URL input (future: upload)
	- Live preview of content

	FIELD TYPES:
	- text: LaTeX/plain text with variable syntax support
	- image: Image URL (future: upload to Supabase Storage)

	PROPS:
	- fields: ContentField[] (bindable)
-->

<script lang="ts">
	import type { ContentField } from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { Trash2, ArrowUp, ArrowDown, Image, Type } from 'lucide-svelte';

	interface Props {
		fields: ContentField[] | undefined;
	}

	let { fields = $bindable() }: Props = $props();

	// Initialize fields if undefined
	if (!fields || fields.length === 0) {
		fields = [{ type: 'text', content: '' }];
	}

	// Add new field
	function addField(type: 'text' | 'image' = 'text') {
		fields = [...(fields || []), { type, content: '' }];
	}

	// Remove field
	function removeField(index: number) {
		fields = (fields || []).filter((_, i) => i !== index);
		// Ensure at least one field remains
		if (fields.length === 0) {
			fields = [{ type: 'text', content: '' }];
		}
	}

	// Move field up
	function moveUp(index: number) {
		if (index === 0 || !fields) return;
		const newFields = [...fields];
		[newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
		fields = newFields;
	}

	// Move field down
	function moveDown(index: number) {
		if (!fields || index === fields.length - 1) return;
		const newFields = [...fields];
		[newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
		fields = newFields;
	}

	// Change field type
	function changeFieldType(index: number, newType: 'text' | 'image') {
		if (!fields) return;
		fields[index] = { type: newType, content: '' };
	}

	// Insert syntax helper into text field
	function insertSyntax(index: number, syntax: string) {
		const textarea = document.getElementById(`field-content-${index}`) as HTMLTextAreaElement;
		if (!textarea || !fields) return;

		const start = textarea.selectionStart || 0;
		const end = textarea.selectionEnd || 0;
		const content = fields[index].content;

		fields[index].content = content.substring(0, start) + syntax + content.substring(end);

		// Set cursor after inserted text
		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(start + syntax.length, start + syntax.length);
		}, 0);
	}
</script>

<div class="space-y-4">
	{#if fields && fields.length > 0}
		<div class="space-y-3">
			{#each fields as field, index (index)}
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="flex gap-4">
							<!-- Reorder buttons -->
							<div class="flex flex-col gap-1">
								<Button
									variant="outline"
									size="icon"
									class="h-8 w-8"
									onclick={() => moveUp(index)}
									disabled={index === 0}
								>
									<ArrowUp class="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									class="h-8 w-8"
									onclick={() => moveDown(index)}
									disabled={index === fields.length - 1}
								>
									<ArrowDown class="h-4 w-4" />
								</Button>
							</div>

							<!-- Field content -->
							<div class="flex-1 space-y-3">
								<!-- Field type selector -->
								<div class="flex items-center gap-3">
									<label for="field-type-{index}" class="text-sm font-medium">Type</label>
									<select
										id="field-type-{index}"
										value={field.type}
										onchange={(e) =>
											changeFieldType(index, e.currentTarget.value as 'text' | 'image')}
										class="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									>
										<option value="text">📝 Texte</option>
										<option value="image">🖼️ Image</option>
									</select>
									<span
										class="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs"
									>
										#{index + 1}
									</span>
								</div>

								<!-- Text field -->
								{#if field.type === 'text'}
									<div class="space-y-2">
										<label for="field-content-{index}" class="text-sm font-medium">Contenu</label>
										<div class="flex flex-wrap gap-2">
											<Button
												variant="outline"
												size="sm"
												onclick={() => insertSyntax(index, '{{var}}')}
												class="text-xs"
											>
												Variable
											</Button>
											<Button
												variant="outline"
												size="sm"
												onclick={() => insertSyntax(index, '{{random:1-10}}')}
												class="text-xs"
											>
												Aléatoire
											</Button>
											<Button
												variant="outline"
												size="sm"
												onclick={() => insertSyntax(index, '{{eval:}}')}
												class="text-xs"
											>
												Évaluation
											</Button>
										</div>
										<Textarea
											id="field-content-{index}"
											bind:value={field.content}
											placeholder={'Ex: Calculer $${{a}} + {{b}} = {{eval:{{a}}+{{b}}}}$$'}
											rows={3}
											class="font-mono text-sm"
										/>

										<!-- Syntax helper buttons -->
									</div>
								{/if}

								<!-- Image field -->
								{#if field.type === 'image'}
									<div class="space-y-1">
										<label for="field-content-{index}" class="text-sm font-medium"
											>URL de l'image</label
										>
										<Input
											id="field-content-{index}"
											bind:value={field.content}
											placeholder="https://example.com/image.png"
											type="url"
										/>
										{#if field.content}
											<div class="mt-2 rounded border p-2">
												<img
													src={field.content}
													alt="Preview"
													class="max-h-40 rounded"
													onerror={() => {
														// Handle image load error
													}}
												/>
											</div>
										{/if}
										<p class="text-xs text-muted-foreground">
											Entrez l'URL d'une image (upload vers Supabase Storage à venir)
										</p>
									</div>
								{/if}
							</div>

							<!-- Delete button -->
							<Button
								variant="destructive"
								size="icon"
								onclick={() => removeField(index)}
								disabled={fields.length === 1}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}

	<!-- Add buttons -->
	<div class="flex gap-2">
		<Button onclick={() => addField('text')} class="flex-1 gap-2" variant="outline">
			<Type class="h-4 w-4" />
			Ajouter du texte
		</Button>
		<Button onclick={() => addField('image')} class="flex-1 gap-2" variant="outline">
			<Image class="h-4 w-4" />
			Ajouter une image
		</Button>
	</div>
</div>
