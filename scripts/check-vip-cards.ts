import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	'http://127.0.0.1:54321',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function checkVipCards() {
	console.log('Checking VIP card templates...\n');

	// Check if table exists by trying to query it
	const { data, error, count } = await supabase
		.from('vip_card_templates')
		.select('id, name, rarity, is_enabled', { count: 'exact' });

	if (error) {
		console.error('❌ Error querying vip_card_templates:', error.message);
		console.error('Details:', error);
		return;
	}

	console.log(`✅ Found ${count} VIP cards in database\n`);

	// Group by rarity
	const byRarity: Record<
		string,
		Array<{ id: string; name: string; rarity: string; is_enabled: boolean }>
	> = {};
	data?.forEach((card) => {
		if (!byRarity[card.rarity]) byRarity[card.rarity] = [];
		byRarity[card.rarity].push(card);
	});

	console.log('Cards by rarity:');
	for (const [rarity, cards] of Object.entries(byRarity)) {
		const enabled = cards.filter((c) => c.is_enabled).length;
		const disabled = cards.filter((c) => !c.is_enabled).length;
		console.log(`  ${rarity}: ${cards.length} total (${enabled} enabled, ${disabled} disabled)`);
	}

	// Check disabled cards
	const disabledCards = data?.filter((c) => !c.is_enabled);
	console.log('\nDisabled cards:');
	if (disabledCards && disabledCards.length > 0) {
		disabledCards.forEach((card) => {
			console.log(`  - ${card.id} (${card.name}) - ${card.rarity}`);
		});
	} else {
		console.log('  (none)');
	}

	// Check config
	const { data: config, error: configError } = await supabase
		.from('vip_card_config')
		.select('*')
		.eq('is_active', true);

	if (configError) {
		console.error('\n❌ Error querying vip_card_config:', configError.message);
		return;
	}

	console.log('\nActive config:');
	if (config && config.length > 0) {
		const c = config[0];
		console.log(
			`  ${c.config_name}: ${c.common_probability}% common, ${c.rare_probability}% rare, ${c.epic_probability}% epic, ${c.legendary_probability}% legendary`
		);
	} else {
		console.log('  (none)');
	}
}

checkVipCards();
