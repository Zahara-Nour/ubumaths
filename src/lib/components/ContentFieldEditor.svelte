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
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus, Trash2, ArrowUp, ArrowDown, Image, Type } from 'lucide-svelte';

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
</script>

<div class="space-y-4">
	{#if fields && fields.length > 0}
		<div class="space-y-3">
			{#each fields as field, index}
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
									<Label for="field-type-{index}">Type</Label>
									<Select.Root
										selected={{ value: field.type, label: field.type === 'text' ? 'Texte' : 'Image' }}
										onSelectedChange={(selected) => {
											if (selected) {
												changeFieldType(index, selected.value as 'text' | 'image');
											}
										}}
									>
										<Select.Trigger id="field-type-{index}" class="w-40">
											<Select.Value />
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="text">
												<div class="flex items-center gap-2">
													<Type class="h-4 w-4" />
													Texte
												</div>
											</Select.Item>
											<Select.Item value="image">
												<div class="flex items-center gap-2">
													<Image class="h-4 w-4" />
													Image
												</div>
											</Select.Item>
										</Select.Content>
									</Select.Root>
									<Badge variant="outline">#{index + 1}</Badge>
								</div>

								<!-- Text field -->
								{#if field.type === 'text'}
									<div class="space-y-1">
										<Label for="field-content-{index}">Contenu (LaTeX supporté)</Label>
										<Textarea
											id="field-content-{index}"
											bind:value={field.content}
											placeholder="Ex: Calculer {@:a} + {@:b} = {eval:{@:a}+{@:b}}"
											rows={3}
											class="font-mono text-sm"
										/>
										<p class="text-xs text-muted-foreground">
											Utilisez la syntaxe LaTeX et les variables/expressions
										</p>
									</div>
								{/if}

								<!-- Image field -->
								{#if field.type === 'image'}
									<div class="space-y-1">
										<Label for="field-content-{index}">URL de l'image</Label>
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
