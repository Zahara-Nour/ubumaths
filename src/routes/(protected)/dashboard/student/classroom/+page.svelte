<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Group coursework by class
	const groupedByClass = $derived(() => {
		const groups = new Map();

		for (const item of data.coursework) {
			const className = item.class?.name || 'Sans classe';
			if (!groups.has(className)) {
				groups.set(className, []);
			}
			groups.get(className).push(item);
		}

		return Array.from(groups.entries());
	});

	// Format due date with color coding
	function getDueDateBadge(dueDate: string | null, dueTime: string | null) {
		if (!dueDate) return null;

		const date = new Date(dueDate);
		if (dueTime) {
			const [hours, minutes] = dueTime.split(':');
			date.setHours(parseInt(hours), parseInt(minutes));
		}

		const now = new Date();
		const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

		let variant: 'default' | 'destructive' | 'warning' = 'default';
		let text = date.toLocaleDateString('fr-FR');

		if (diffHours < 0) {
			variant = 'destructive';
			text = `En retard (${text})`;
		} else if (diffHours < 24) {
			variant = 'warning';
			text = `Aujourd'hui (${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})`;
		} else if (diffHours < 72) {
			variant = 'warning';
			text = `Bientôt (${text})`;
		}

		return { variant, text };
	}

	// Get material icon based on type
	function getMaterialIcon(type: string): string {
		switch (type) {
			case 'DRIVE_FILE':
				return '📄';
			case 'YOUTUBE_VIDEO':
				return '🎥';
			case 'LINK':
				return '🔗';
			case 'FORM':
				return '📝';
			default:
				return '📎';
		}
	}
</script>

<div class="container mx-auto max-w-4xl p-6">
	<h1 class="mb-6 text-2xl font-bold">Travaux Google Classroom</h1>

	{#if data.needsMigration}
		<Card.Root>
			<Card.Header>
				<Card.Title>Fonctionnalité en préparation</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground">
					L'intégration Google Classroom nécessite l'application des migrations de base de données.
					Contactez votre enseignant ou administrateur.
				</p>
			</Card.Content>
		</Card.Root>
	{:else if data.coursework.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Aucun travail partagé</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground">
					Votre enseignant n'a pas encore partagé de travaux depuis Google Classroom.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-6">
			{#each groupedByClass() as [className, items] (className)}
				<div>
					<h2 class="mb-3 text-lg font-semibold">
						<Badge variant="outline">{className}</Badge>
					</h2>

					<div class="space-y-4">
						{#each items as item (item.id)}
							{@const coursework = item.coursework}
							{@const dueBadge = getDueDateBadge(coursework?.due_date, coursework?.due_time)}

							<Card.Root>
								<Card.Header>
									<div class="flex items-start justify-between gap-4">
										<div>
											<Card.Title class="text-lg">
												{coursework?.title || 'Sans titre'}
											</Card.Title>

											{#if item.category}
												<div class="mt-1">
													<Badge
														variant="secondary"
														style="background-color: {item.category.color}"
													>
														{item.category.icon}
														{item.category.name}
													</Badge>
												</div>
											{/if}
										</div>

										{#if dueBadge}
											<Badge variant={dueBadge.variant}>
												{dueBadge.text}
											</Badge>
										{/if}
									</div>
								</Card.Header>

								<Card.Content>
									{#if item.description_override}
										<p class="mb-3 text-sm text-muted-foreground italic">
											Note de l'enseignant : {item.description_override}
										</p>
									{/if}

									{#if coursework?.description}
										<p class="mb-3 text-sm whitespace-pre-wrap">{coursework.description}</p>
									{/if}

									{#if coursework?.max_points}
										<p class="mb-3 text-sm text-muted-foreground">
											Points maximum : {coursework.max_points}
										</p>
									{/if}

									{#if coursework?.materials && coursework.materials.length > 0}
										<div class="mt-4">
											<h4 class="mb-2 text-sm font-semibold">Documents attachés :</h4>
											<div class="space-y-2">
												{#each coursework.materials as material (material.id)}
													<div class="flex items-center gap-2 rounded border p-2 hover:bg-muted/50">
														<span class="text-lg">{getMaterialIcon(material.material_type)}</span>
														<div class="flex-1">
															<p class="text-sm font-medium">
																{material.title || material.file_name}
															</p>
														</div>
														<Button variant="outline" size="sm" asChild>
															<a href={material.file_url} target="_blank" rel="noopener noreferrer">
																Ouvrir
															</a>
														</Button>
													</div>
												{/each}
											</div>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
