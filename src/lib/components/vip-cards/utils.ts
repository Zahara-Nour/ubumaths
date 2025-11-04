// Helper functions for VIP card UI components

export function rarityLabel(rarity: string): string {
	const labels: Record<string, string> = {
		common: 'Commune',
		rare: 'Rare',
		epic: 'Épique',
		legendary: 'Légendaire'
	};
	return labels[rarity] ?? rarity;
}

export function rarityColorClass(rarity: string): string {
	const classes: Record<string, string> = {
		common: 'border-gray-300 text-gray-600 bg-gray-50',
		rare: 'border-blue-300 text-blue-600 bg-blue-50',
		epic: 'border-purple-300 text-purple-600 bg-purple-50',
		legendary: 'border-yellow-300 text-yellow-600 bg-yellow-50'
	};
	return classes[rarity] ?? classes.common;
}

export function rarityBadgeClass(rarity: string): string {
	const classes: Record<string, string> = {
		common: 'bg-gray-100 text-gray-700 border-gray-200',
		rare: 'bg-blue-100 text-blue-700 border-blue-200',
		epic: 'bg-purple-100 text-purple-700 border-purple-200',
		legendary: 'bg-yellow-100 text-yellow-700 border-yellow-200'
	};
	return classes[rarity] ?? classes.common;
}

export function categoryLabel(category: string): string {
	const labels: Record<string, string> = {
		gameplay: 'Gameplay',
		academic: 'Académique',
		fun: 'Amusement',
		social: 'Social'
	};
	return labels[category] ?? category;
}

export function categoryIcon(category: string): string {
	const icons: Record<string, string> = {
		gameplay: '🎮',
		academic: '📚',
		fun: '🎉',
		social: '👥'
	};
	return icons[category] ?? '❓';
}
