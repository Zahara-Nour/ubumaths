/**
 * Monte Carlo simulation of the VIP card economy.
 *
 * Simulates N student journeys over a school year (36 weeks) to answer:
 * 1. How many weeks to complete the collection?
 * 2. What is the wealth distribution?
 * 3. Does the "all-in Soldes" strategy dominate?
 * 4. How does card accumulation progress over time?
 *
 * Run: npx tsx scripts/simulate-vip-economy.ts
 */

// ─── Card catalog ───────────────────────────────────────────────────────────

interface CardTemplate {
	id: string;
	name: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	price: number;
	purchasable: boolean;
	maxOwned: number;
	enabled: boolean;
	drawAction?: { type: 'draw_cards'; count: number };
}

const CARDS: CardTemplate[] = [
	// Common
	{
		id: 'bonus',
		name: 'Bonus',
		rarity: 'common',
		price: 5,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'choix',
		name: 'Choix de Place',
		rarity: 'common',
		price: 5,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'bougeotte',
		name: 'Bougeotte',
		rarity: 'common',
		price: 5,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'jeu',
		name: 'Jeu',
		rarity: 'common',
		price: 5,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'soldes',
		name: 'Soldes',
		rarity: 'common',
		price: 8,
		purchasable: true,
		maxOwned: 5,
		enabled: true,
		drawAction: { type: 'draw_cards', count: 2 }
	},
	{
		id: 'super-soldes',
		name: 'Super Soldes',
		rarity: 'common',
		price: 10,
		purchasable: true,
		maxOwned: 5,
		enabled: true,
		drawAction: { type: 'draw_cards', count: 3 }
	},
	// Rare
	{
		id: 'super-bonus',
		name: 'Super Bonus',
		rarity: 'rare',
		price: 15,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'coup-double',
		name: 'Coup Double',
		rarity: 'rare',
		price: 15,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'super-bougeotte',
		name: 'Super Bougeotte',
		rarity: 'rare',
		price: 15,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'tranquilou',
		name: 'Tranquilou',
		rarity: 'rare',
		price: 15,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'lalalalala',
		name: 'Lalalalala',
		rarity: 'rare',
		price: 15,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'help',
		name: 'Help !',
		rarity: 'rare',
		price: 15,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'mathemagie',
		name: 'Mathemagie',
		rarity: 'rare',
		price: 15,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'inventeur',
		name: 'Inventeur',
		rarity: 'rare',
		price: 15,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'ecrabouilleur',
		name: 'Ecrabouilleur',
		rarity: 'rare',
		price: 25,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'mega-soldes',
		name: 'Mega Soldes',
		rarity: 'rare',
		price: 20,
		purchasable: true,
		maxOwned: 5,
		enabled: true,
		drawAction: { type: 'draw_cards', count: 4 }
	},
	{
		id: 'minesweeper-freeze',
		name: 'Gel Temporaire',
		rarity: 'rare',
		price: 15,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'minesweeper-undo',
		name: 'Seconde Chance',
		rarity: 'rare',
		price: 3,
		purchasable: true,
		maxOwned: 10,
		enabled: true
	},
	{
		id: 'minesweeper-hint',
		name: 'Indice 1',
		rarity: 'rare',
		price: 1,
		purchasable: true,
		maxOwned: 99,
		enabled: true
	},
	{
		id: 'minesweeper-hint-2',
		name: 'Indice 2',
		rarity: 'rare',
		price: 1,
		purchasable: true,
		maxOwned: 99,
		enabled: true
	},
	{
		id: 'minesweeper-hint-3',
		name: 'Indice 3',
		rarity: 'rare',
		price: 1,
		purchasable: true,
		maxOwned: 99,
		enabled: true
	},
	// Epic
	{
		id: 'mega-bonus',
		name: 'Mega Bonus',
		rarity: 'epic',
		price: 40,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'throne',
		name: 'Game of Throne',
		rarity: 'epic',
		price: 40,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'fame',
		name: "Voltaire's got talent",
		rarity: 'epic',
		price: 40,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'memoire',
		name: 'Trou de memoire',
		rarity: 'epic',
		price: 40,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'batman',
		name: 'Batman and Robin',
		rarity: 'epic',
		price: 40,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'alchimie',
		name: 'Alchimie',
		rarity: 'epic',
		price: 50,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'minesweeper-chronostase',
		name: 'Chronostase',
		rarity: 'epic',
		price: 30,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	// Legendary
	{
		id: 'fortune',
		name: 'Roue de la Fortune',
		rarity: 'legendary',
		price: 80,
		purchasable: true,
		maxOwned: 5,
		enabled: true
	},
	{
		id: 'Sheikh',
		name: 'Sheikh',
		rarity: 'legendary',
		price: 120,
		purchasable: false,
		maxOwned: 5,
		enabled: true
	}
];

const ENABLED_CARDS = CARDS.filter((c) => c.enabled);
// For "unique types collected" we track distinct card IDs
const UNIQUE_CARD_IDS = new Set(ENABLED_CARDS.map((c) => c.id));
const TOTAL_UNIQUE = UNIQUE_CARD_IDS.size;

// ─── Draw probabilities ─────────────────────────────────────────────────────

const _DRAW_PROBS = { common: 60, rare: 25, epic: 12, legendary: 3 };

function rollRarity(): 'common' | 'rare' | 'epic' | 'legendary' {
	const roll = Math.floor(Math.random() * 100) + 1;
	if (roll <= 60) return 'common';
	if (roll <= 85) return 'rare';
	if (roll <= 97) return 'epic';
	return 'legendary';
}

function drawOneCard(): CardTemplate {
	const rarity = rollRarity();
	const pool = ENABLED_CARDS.filter((c) => c.rarity === rarity);
	if (pool.length === 0) {
		// Fallback to common
		const commons = ENABLED_CARDS.filter((c) => c.rarity === 'common');
		return commons[Math.floor(Math.random() * commons.length)];
	}
	return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Student simulation ─────────────────────────────────────────────────────

type Strategy = 'random_buy' | 'cheapest_first' | 'soldes_only' | 'save_for_rare' | 'balanced';

interface StudentState {
	gidouilles: number;
	inventory: Map<string, number>; // cardId → count owned
	uniqueCollected: Set<string>;
	totalCardsOwned: number;
	totalSpent: number;
	weeklySnapshots: { week: number; unique: number; gidouilles: number; totalCards: number }[];
}

function createStudent(): StudentState {
	return {
		gidouilles: 0,
		inventory: new Map(),
		uniqueCollected: new Set(),
		totalCardsOwned: 0,
		totalSpent: 0,
		weeklySnapshots: []
	};
}

function addCardToInventory(student: StudentState, card: CardTemplate) {
	const current = student.inventory.get(card.id) ?? 0;
	student.inventory.set(card.id, current + 1);
	student.uniqueCollected.add(card.id);
	student.totalCardsOwned++;
}

function canBuy(student: StudentState, card: CardTemplate): boolean {
	if (!card.purchasable) return false;
	if (student.gidouilles < card.price) return false;
	const owned = student.inventory.get(card.id) ?? 0;
	if (owned >= card.maxOwned) return false;
	return true;
}

function buyCard(student: StudentState, card: CardTemplate) {
	student.gidouilles -= card.price;
	student.totalSpent += card.price;
	addCardToInventory(student, card);

	// If this card triggers draws, resolve them
	if (card.drawAction) {
		for (let i = 0; i < card.drawAction.count; i++) {
			const drawn = drawOneCard();
			addCardToInventory(student, drawn);
		}
	}
}

// Weekly income: gaussian around mean with some variance
function weeklyIncome(profile: 'low' | 'medium' | 'high'): number {
	const params = {
		low: { mean: 4, sd: 1.5 },
		medium: { mean: 8, sd: 2 },
		high: { mean: 13, sd: 3 }
	};
	const { mean, sd } = params[profile];
	// Box-Muller transform
	const u1 = Math.random();
	const u2 = Math.random();
	const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	return Math.max(0.3, mean + z * sd);
}

// ─── Strategies ─────────────────────────────────────────────────────────────

function executeStrategy(student: StudentState, strategy: Strategy) {
	switch (strategy) {
		case 'soldes_only':
			strategySoldesOnly(student);
			break;
		case 'cheapest_first':
			strategyCheapestFirst(student);
			break;
		case 'save_for_rare':
			strategySaveForRare(student);
			break;
		case 'balanced':
			strategyBalanced(student);
			break;
		case 'random_buy':
			strategyRandomBuy(student);
			break;
	}
}

function strategySoldesOnly(student: StudentState) {
	// Priority: buy draw cards (best value ratio), spend all budget
	const drawCards = ['super-soldes', 'soldes', 'mega-soldes'];
	for (const id of drawCards) {
		const card = ENABLED_CARDS.find((c) => c.id === id)!;
		while (canBuy(student, card)) {
			buyCard(student, card);
		}
	}
}

function strategyCheapestFirst(student: StudentState) {
	// Buy cheapest available cards first (collection completionist)
	const sorted = [...ENABLED_CARDS].filter((c) => c.purchasable).sort((a, b) => a.price - b.price);
	for (const card of sorted) {
		while (canBuy(student, card)) {
			buyCard(student, card);
		}
	}
}

function strategySaveForRare(student: StudentState) {
	// Save up for rare+ cards, ignore commons
	const targets = ENABLED_CARDS.filter((c) => c.purchasable && c.rarity !== 'common').sort(
		(a, b) => a.price - b.price
	);
	for (const card of targets) {
		if (canBuy(student, card)) {
			buyCard(student, card);
			return; // One purchase per week to simulate saving
		}
	}
}

function strategyBalanced(student: StudentState) {
	// Mix: buy one draw card if affordable, then fill with cheap cards
	const soldes = ENABLED_CARDS.find((c) => c.id === 'soldes')!;
	if (canBuy(student, soldes)) {
		buyCard(student, soldes);
	}
	// Then buy cheapest new (uncollected) cards
	const uncollected = ENABLED_CARDS.filter(
		(c) => c.purchasable && !student.uniqueCollected.has(c.id)
	).sort((a, b) => a.price - b.price);
	for (const card of uncollected) {
		if (canBuy(student, card)) {
			buyCard(student, card);
		}
	}
}

function strategyRandomBuy(student: StudentState) {
	// Buy a random affordable card each week
	const affordable = ENABLED_CARDS.filter((c) => canBuy(student, c));
	if (affordable.length > 0) {
		const card = affordable[Math.floor(Math.random() * affordable.length)];
		buyCard(student, card);
	}
}

// ─── Simulation ─────────────────────────────────────────────────────────────

const WEEKS = 36; // School year
const SIMULATIONS = 10_000;

interface SimResult {
	strategy: Strategy;
	profile: 'low' | 'medium' | 'high';
	weeksToFullCollection: number[]; // -1 if not completed
	finalUnique: number[];
	finalGidouilles: number[];
	finalTotalCards: number[];
	totalSpent: number[];
	weeklyAvgUnique: number[]; // avg unique at each week
}

function runSimulation(
	strategy: Strategy,
	profile: 'low' | 'medium' | 'high',
	n: number
): SimResult {
	const result: SimResult = {
		strategy,
		profile,
		weeksToFullCollection: [],
		finalUnique: [],
		finalGidouilles: [],
		finalTotalCards: [],
		totalSpent: [],
		weeklyAvgUnique: new Array(WEEKS).fill(0)
	};

	for (let sim = 0; sim < n; sim++) {
		const student = createStudent();
		let completedWeek = -1;

		for (let week = 0; week < WEEKS; week++) {
			// Earn gidouilles
			student.gidouilles += weeklyIncome(profile);

			// Execute strategy (buy cards)
			executeStrategy(student, strategy);

			// Track collection completion
			if (completedWeek === -1 && student.uniqueCollected.size === TOTAL_UNIQUE) {
				completedWeek = week + 1;
			}

			// Snapshot
			result.weeklyAvgUnique[week] += student.uniqueCollected.size;
		}

		result.weeksToFullCollection.push(completedWeek);
		result.finalUnique.push(student.uniqueCollected.size);
		result.finalGidouilles.push(Math.round(student.gidouilles * 100) / 100);
		result.finalTotalCards.push(student.totalCardsOwned);
		result.totalSpent.push(Math.round(student.totalSpent * 100) / 100);
	}

	// Average weekly unique
	result.weeklyAvgUnique = result.weeklyAvgUnique.map((sum) => Math.round((sum / n) * 10) / 10);

	return result;
}

// ─── Stats helpers ──────────────────────────────────────────────────────────

function percentile(arr: number[], p: number): number {
	const sorted = [...arr].sort((a, b) => a - b);
	const idx = Math.floor((p / 100) * sorted.length);
	return sorted[Math.min(idx, sorted.length - 1)];
}

function mean(arr: number[]): number {
	return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
	return percentile(arr, 50);
}

function formatNum(n: number, decimals = 1): string {
	return n.toFixed(decimals);
}

// ─── Main ───────────────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(70)}`);
console.log(`  SIMULATION MONTE CARLO - ECONOMIE VIP CARDS`);
console.log(`  ${SIMULATIONS.toLocaleString()} simulations x ${WEEKS} semaines (annee scolaire)`);
console.log(`  ${TOTAL_UNIQUE} cartes uniques dans le catalogue`);
console.log(`${'='.repeat(70)}\n`);

const strategies: Strategy[] = [
	'soldes_only',
	'cheapest_first',
	'save_for_rare',
	'balanced',
	'random_buy'
];
const profiles: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

// ─── 1. Strategy comparison (medium profile) ────────────────────────────────

console.log(`${'─'.repeat(70)}`);
console.log(`  1. COMPARAISON DES STRATEGIES (profil actif, ~8g/sem)`);
console.log(`${'─'.repeat(70)}\n`);

const stratResults: SimResult[] = [];
for (const strategy of strategies) {
	const result = runSimulation(strategy, 'medium', SIMULATIONS);
	stratResults.push(result);
}

console.log(
	`${'Strategie'.padEnd(18)} | ${'Uniques'.padEnd(10)} | ${'Total'.padEnd(10)} | ${'Gidouilles'.padEnd(12)} | ${'Depenses'.padEnd(10)} | Collection`
);
console.log(
	`${''.padEnd(18, '-')}-+-${''.padEnd(10, '-')}-+-${''.padEnd(10, '-')}-+-${''.padEnd(12, '-')}-+-${''.padEnd(10, '-')}-+-----------`
);

for (const r of stratResults) {
	const completed = r.weeksToFullCollection.filter((w) => w > 0);
	const completionRate = ((completed.length / SIMULATIONS) * 100).toFixed(1);
	const avgWeeks = completed.length > 0 ? formatNum(mean(completed)) : 'n/a';

	console.log(
		`${r.strategy.padEnd(18)} | ${formatNum(mean(r.finalUnique)).padEnd(10)} | ${formatNum(mean(r.finalTotalCards)).padEnd(10)} | ${formatNum(mean(r.finalGidouilles)).padEnd(12)} | ${formatNum(mean(r.totalSpent)).padEnd(10)} | ${completionRate}% (moy: ${avgWeeks} sem)`
	);
}

// ─── 2. Profile comparison (balanced strategy) ──────────────────────────────

console.log(`\n${'─'.repeat(70)}`);
console.log(`  2. IMPACT DU PROFIL D'ACTIVITE (strategie balanced)`);
console.log(`${'─'.repeat(70)}\n`);

console.log(
	`${'Profil'.padEnd(12)} | ${'Rev/sem'.padEnd(8)} | ${'Uniques'.padEnd(10)} | ${'Total'.padEnd(10)} | ${'Reste'.padEnd(10)} | Collection`
);
console.log(
	`${''.padEnd(12, '-')}-+-${''.padEnd(8, '-')}-+-${''.padEnd(10, '-')}-+-${''.padEnd(10, '-')}-+-${''.padEnd(10, '-')}-+-----------`
);

for (const profile of profiles) {
	const r = runSimulation('balanced', profile, SIMULATIONS);
	const completed = r.weeksToFullCollection.filter((w) => w > 0);
	const completionRate = ((completed.length / SIMULATIONS) * 100).toFixed(1);
	const avgWeeks = completed.length > 0 ? formatNum(mean(completed)) : 'n/a';
	const incomeLabel = profile === 'low' ? '~4g' : profile === 'medium' ? '~8g' : '~13g';

	console.log(
		`${profile.padEnd(12)} | ${incomeLabel.padEnd(8)} | ${formatNum(mean(r.finalUnique)).padEnd(10)} | ${formatNum(mean(r.finalTotalCards)).padEnd(10)} | ${formatNum(mean(r.finalGidouilles)).padEnd(10)} | ${completionRate}% (moy: ${avgWeeks} sem)`
	);
}

// ─── 3. Soldes dominance analysis ───────────────────────────────────────────

console.log(`\n${'─'.repeat(70)}`);
console.log(`  3. ANALYSE : LES SOLDES DOMINENT-ELLES ?`);
console.log(`${'─'.repeat(70)}\n`);

const soldesR = stratResults.find((r) => r.strategy === 'soldes_only')!;
const balancedR = stratResults.find((r) => r.strategy === 'balanced')!;
const cheapR = stratResults.find((r) => r.strategy === 'cheapest_first')!;

console.log(`Cartes uniques en fin d'annee (mediane) :`);
console.log(`  Soldes only  : ${median(soldesR.finalUnique)} / ${TOTAL_UNIQUE}`);
console.log(`  Balanced     : ${median(balancedR.finalUnique)} / ${TOTAL_UNIQUE}`);
console.log(`  Cheapest 1st : ${median(cheapR.finalUnique)} / ${TOTAL_UNIQUE}`);
console.log();
console.log(`Total cartes possedees (mediane) :`);
console.log(`  Soldes only  : ${median(soldesR.finalTotalCards)}`);
console.log(`  Balanced     : ${median(balancedR.finalTotalCards)}`);
console.log(`  Cheapest 1st : ${median(cheapR.finalTotalCards)}`);
console.log();
console.log(`Gidouilles restantes (mediane) :`);
console.log(`  Soldes only  : ${median(soldesR.finalGidouilles)}g`);
console.log(`  Balanced     : ${median(balancedR.finalGidouilles)}g`);
console.log(`  Cheapest 1st : ${median(cheapR.finalGidouilles)}g`);

// ─── 4. Distribution de richesse ────────────────────────────────────────────

console.log(`\n${'─'.repeat(70)}`);
console.log(`  4. DISTRIBUTION DE RICHESSE (balanced, medium)`);
console.log(`${'─'.repeat(70)}\n`);

const bm = runSimulation('balanced', 'medium', SIMULATIONS);

console.log(`Gidouilles restantes en fin d'annee :`);
console.log(`  P10  : ${formatNum(percentile(bm.finalGidouilles, 10))}g`);
console.log(`  P25  : ${formatNum(percentile(bm.finalGidouilles, 25))}g`);
console.log(`  P50  : ${formatNum(percentile(bm.finalGidouilles, 50))}g (mediane)`);
console.log(`  P75  : ${formatNum(percentile(bm.finalGidouilles, 75))}g`);
console.log(`  P90  : ${formatNum(percentile(bm.finalGidouilles, 90))}g`);
console.log();
console.log(`Cartes uniques collectees :`);
console.log(`  P10  : ${percentile(bm.finalUnique, 10)} / ${TOTAL_UNIQUE}`);
console.log(`  P25  : ${percentile(bm.finalUnique, 25)} / ${TOTAL_UNIQUE}`);
console.log(`  P50  : ${percentile(bm.finalUnique, 50)} / ${TOTAL_UNIQUE} (mediane)`);
console.log(`  P75  : ${percentile(bm.finalUnique, 75)} / ${TOTAL_UNIQUE}`);
console.log(`  P90  : ${percentile(bm.finalUnique, 90)} / ${TOTAL_UNIQUE}`);

// ─── 5. Progression semaine par semaine ─────────────────────────────────────

console.log(`\n${'─'.repeat(70)}`);
console.log(`  5. PROGRESSION HEBDOMADAIRE (balanced, medium)`);
console.log(`${'─'.repeat(70)}\n`);

const milestones = [1, 2, 4, 8, 12, 16, 20, 24, 28, 32, 36];
console.log(`${'Semaine'.padEnd(10)} | Cartes uniques (moy)`);
console.log(`${''.padEnd(10, '-')}-+---------------------`);
for (const w of milestones) {
	if (w <= WEEKS) {
		const bar = '█'.repeat(Math.round(bm.weeklyAvgUnique[w - 1]));
		console.log(
			`S${String(w).padStart(2, '0').padEnd(9)} | ${formatNum(bm.weeklyAvgUnique[w - 1]).padEnd(5)} ${bar}`
		);
	}
}

// ─── 6. Valeur reelle des tirages ───────────────────────────────────────────

console.log(`\n${'─'.repeat(70)}`);
console.log(`  6. VALEUR REELLE DES TIRAGES (simulation 100k tirages)`);
console.log(`${'─'.repeat(70)}\n`);

const drawSims = 100_000;
const drawResults: Record<string, number[]> = { single: [], double: [], triple: [], quad: [] };

for (let i = 0; i < drawSims; i++) {
	const single = drawOneCard();
	drawResults.single.push(single.price);

	let sum2 = 0;
	for (let j = 0; j < 2; j++) sum2 += drawOneCard().price;
	drawResults.double.push(sum2);

	let sum3 = 0;
	for (let j = 0; j < 3; j++) sum3 += drawOneCard().price;
	drawResults.triple.push(sum3);

	let sum4 = 0;
	for (let j = 0; j < 4; j++) sum4 += drawOneCard().price;
	drawResults.quad.push(sum4);
}

console.log(
	`${'Tirage'.padEnd(22)} | ${'Cout'.padEnd(6)} | ${'Val moy'.padEnd(8)} | ${'Mediane'.padEnd(8)} | ${'P10'.padEnd(6)} | ${'P90'.padEnd(6)} | Ratio`
);
console.log(
	`${''.padEnd(22, '-')}-+-${''.padEnd(6, '-')}-+-${''.padEnd(8, '-')}-+-${''.padEnd(8, '-')}-+-${''.padEnd(6, '-')}-+-${''.padEnd(6, '-')}-+------`
);

const drawInfo = [
	{ name: '1 tirage (ref)', data: drawResults.single, cost: 0 },
	{ name: 'Soldes (x2)', data: drawResults.double, cost: 8 },
	{ name: 'Super Soldes (x3)', data: drawResults.triple, cost: 10 },
	{ name: 'Mega Soldes (x4)', data: drawResults.quad, cost: 20 }
];

for (const d of drawInfo) {
	const avg = mean(d.data);
	const med = median(d.data);
	const p10 = percentile(d.data, 10);
	const p90 = percentile(d.data, 90);
	const ratio = d.cost > 0 ? `x${formatNum(avg / d.cost)}` : '-';

	console.log(
		`${d.name.padEnd(22)} | ${(d.cost > 0 ? d.cost + 'g' : '-').padEnd(6)} | ${formatNum(avg).padEnd(8)}g | ${formatNum(med).padEnd(8)}g | ${formatNum(p10).padEnd(6)}g | ${formatNum(p90).padEnd(6)}g | ${ratio}`
	);
}

// ─── 7. Summary & recommendations ──────────────────────────────────────────

console.log(`\n${'='.repeat(70)}`);
console.log(`  CONCLUSIONS`);
console.log(`${'='.repeat(70)}\n`);

const soldesCompleted = soldesR.weeksToFullCollection.filter((w) => w > 0).length;
const balancedCompleted = balancedR.weeksToFullCollection.filter((w) => w > 0).length;

console.log(`1. STRATEGIE DOMINANTE :`);
if (mean(soldesR.finalUnique) > mean(balancedR.finalUnique)) {
	console.log(
		`   -> "Soldes only" collecte PLUS de cartes uniques (${formatNum(mean(soldesR.finalUnique))} vs ${formatNum(mean(balancedR.finalUnique))})`
	);
	console.log(`   -> Confirme que les cartes draw sont surpuissantes en valeur`);
} else {
	console.log(`   -> "Balanced" collecte PLUS ou AUTANT de cartes uniques`);
	console.log(`   -> Les cartes draw ne dominent pas completement`);
}

console.log();
console.log(`2. COLLECTION COMPLETE :`);
console.log(
	`   -> Soldes only : ${((soldesCompleted / SIMULATIONS) * 100).toFixed(1)}% des eleves completent en 36 sem`
);
console.log(
	`   -> Balanced    : ${((balancedCompleted / SIMULATIONS) * 100).toFixed(1)}% des eleves completent en 36 sem`
);

console.log();
console.log(`3. ECART DE RICHESSE (balanced) :`);
const gapRatio =
	percentile(bm.finalTotalCards, 90) / Math.max(1, percentile(bm.finalTotalCards, 10));
console.log(`   -> Ratio P90/P10 en cartes totales : x${formatNum(gapRatio)}`);
console.log(
	`   -> Les eleves actifs ont ${formatNum(gapRatio)}x plus de cartes que les moins actifs`
);

console.log();
console.log(`4. INFLATION :`);
const avgRemaining = mean(bm.finalGidouilles);
console.log(`   -> Gidouilles restantes en fin d'annee (moy) : ${formatNum(avgRemaining)}g`);
if (avgRemaining > 50) {
	console.log(`   -> ALERTE : surplus important, les eleves manquent de sinks`);
} else if (avgRemaining > 20) {
	console.log(`   -> Surplus modere, economie globalement equilibree`);
} else {
	console.log(`   -> Economie bien calibree, peu de surplus`);
}

console.log();
