<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { getSpellIconUrl } from '$lib/utils/game/assets';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const elementEmojis = {
		fire: '🔥',
		water: '💧',
		earth: '🌍',
		wind: '💨'
	};

	const typeLabels = {
		attack: 'Attaque',
		heal: 'Soin',
		buff: 'Buff',
		debuff: 'Debuff'
	};

	// Group spells by element
	const spellsByElement = $derived.by(() => {
		const grouped: Record<string, typeof data.spells> = {
			fire: [],
			water: [],
			earth: [],
			wind: []
		};

		for (const spell of data.spells) {
			grouped[spell.element].push(spell);
		}

		return grouped;
	});
</script>

<div class="spells-page mx-auto max-w-6xl p-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="mb-4">
			<Button href="/dashboard/navadra" variant="ghost" class="gap-2">← Retour au hub</Button>
		</div>
		<h1 class="mb-2 text-4xl font-bold text-foreground">📖 Grimoire</h1>
		<p class="text-lg text-muted-foreground">Gère tes sorts et crée des decks pour le combat.</p>
	</div>

	<!-- Stats Summary -->
	<div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
		<div class="rounded-lg border border-border bg-card p-4 text-center">
			<p class="text-3xl font-bold text-primary">{data.spells.length}</p>
			<p class="text-sm text-muted-foreground">Sorts débloqués</p>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 text-center">
			<p class="text-3xl font-bold text-primary">{data.gamePlayer.pyrs_fire}</p>
			<p class="text-sm text-muted-foreground">🔥 Pyrs Feu</p>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 text-center">
			<p class="text-3xl font-bold text-primary">{data.gamePlayer.pyrs_water}</p>
			<p class="text-sm text-muted-foreground">💧 Pyrs Eau</p>
		</div>

		<div class="rounded-lg border border-border bg-card p-4 text-center">
			<p class="text-3xl font-bold text-primary">{data.gamePlayer.pyrs_earth}</p>
			<p class="text-sm text-muted-foreground">🌍 Pyrs Terre</p>
		</div>
	</div>

	<!-- Spells by Element -->
	{#each Object.entries(spellsByElement) as [element, spells]}
		{#if spells.length > 0}
			<div class="mb-8">
				<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-foreground">
					<span>{elementEmojis[element as keyof typeof elementEmojis]}</span>
					<span class="capitalize">{element}</span>
					<span class="text-sm font-normal text-muted-foreground">({spells.length} sorts)</span>
				</h2>

				<div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
					{#each spells as spell}
						<div class="spell-card rounded-lg border border-border bg-card p-4">
							<!-- Spell Icon -->
							<div class="mb-3 flex items-center justify-center">
								<div class="h-20 w-20 rounded-full bg-muted p-3">
									<img
										src={getSpellIconUrl(spell.spell_num)}
										alt="Sort {spell.spell_num}"
										class="h-full w-full object-contain"
										loading="lazy"
									/>
								</div>
							</div>

							<!-- Spell Info -->
							<div class="space-y-2 text-center">
								<div class="text-xs text-muted-foreground">
									#{spell.spell_num} • {typeLabels[spell.type]}
								</div>

								<div class="font-mono text-lg font-bold text-primary">
									{spell.power} PTS
								</div>

								<div class="flex items-center justify-center gap-2 text-sm">
									<span class="text-muted-foreground">Niveau</span>
									<div class="flex gap-0.5">
										{#each Array(5) as _, i}
											<div
												class="h-2 w-2 rounded-full {i < spell.level ? 'bg-primary' : 'bg-muted'}"
											></div>
										{/each}
									</div>
								</div>

								{#if spell.level < 5}
									<Button variant="outline" size="sm" class="w-full" disabled>Améliorer</Button>
								{:else}
									<div class="text-xs font-medium text-green-600">MAX</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/each}

	<!-- No Spells Message -->
	{#if data.spells.length === 0}
		<div class="rounded-lg border border-border bg-card p-12 text-center">
			<div class="mb-4 text-6xl">📖</div>
			<h3 class="mb-2 text-xl font-bold text-foreground">Aucun sort débloqué</h3>
			<p class="mb-6 text-muted-foreground">
				Combats des monstres pour débloquer de nouveaux sorts !
			</p>
			<Button href="/dashboard/navadra/combat" size="lg">Commencer un combat</Button>
		</div>
	{/if}

	<!-- Deck Management (TODO) -->
	<div class="mt-12 rounded-lg border border-border bg-card p-6">
		<h2 class="mb-4 text-xl font-bold text-card-foreground">⚡ Decks de combat</h2>
		<p class="text-muted-foreground">
			La gestion des decks sera disponible prochainement. Pour l'instant, tes 10 premiers sorts sont
			utilisés automatiquement en combat.
		</p>
	</div>
</div>
