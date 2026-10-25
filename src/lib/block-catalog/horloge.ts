/**
 * Catalogue — bloc ```horloge (horloge à aiguilles)
 *
 * Réglages : `src/lib/ubumark/parser/horloge-parser.ts`.
 *
 * @module block-catalog/horloge
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const horlogeEntry: BlockCatalogEntry = {
	slug: 'horloge',
	title: 'Horloge à aiguilles',
	fences: ['horloge'],
	nodeType: 'horloge',
	summary: 'Une à quatre horloges à lire ou à comparer, cadran 12 ou 24 heures.',
	intro:
		'Le bloc dessine une horloge par heure donnée. La petite aiguille avance avec les minutes, comme sur une vraie horloge. L’heure n’est jamais écrite à côté : c’est la réponse.',
	settingGroups: [
		{
			settings: [
				{
					key: 'heure',
					values: '1 à 4 heures séparées par ;, écrites 9 h, 9 h 30 ou 9h5',
					defaultValue: null,
					description: 'Une horloge par heure. Heures de 0 à 23, minutes de 0 à 59.'
				},
				{
					key: 'légendes',
					values: 'un texte par horloge, séparés par ; (40 caractères au plus)',
					defaultValue: 'aucune',
					description: 'Écrites sous chaque horloge.'
				},
				{
					key: 'chiffres',
					values: 'tous | quarts | aucun',
					defaultValue: 'tous',
					description: 'Les 12 chiffres, seulement 12, 3, 6 et 9, ou aucun.'
				},
				{
					key: 'graduations',
					values: 'minutes | heures | aucune',
					defaultValue: 'minutes',
					description: 'Les 60 traits des minutes, les 12 traits des heures, ou rien.'
				},
				{
					key: 'minutes',
					values: 'visibles | cachées',
					defaultValue: 'visibles',
					description: 'Cachées : la grande aiguille disparaît (heure entière exigée).'
				},
				{
					key: 'cadran',
					values: '12 | 24',
					defaultValue: '12',
					description: '24 : une couronne intérieure porte les heures de 13 à 24.'
				},
				{
					key: 'taille',
					values: '2 à 8 cm',
					defaultValue: '4 cm (3 cm dans un choix de QCM)',
					description: 'Diamètre du cadran, à l’écran comme sur la fiche PDF.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Une heure à lire',
			source: fence('horloge', 'heure: 9 h 30'),
			explanation: 'La seule ligne obligatoire.'
		},
		{
			title: 'Durée entre deux horloges',
			source: fence(
				'horloge',
				'heure: 8 h 30 ; 10 h 15',
				'légendes: Départ ; Arrivée',
				'chiffres: quarts'
			),
			explanation: 'Une légende par heure, dans le même ordre.'
		},
		{
			title: 'Heures entières, sans grande aiguille',
			source: fence('horloge', 'heure: 3 h ; 7 h', 'minutes: cachées', 'graduations: heures'),
			explanation: 'Pour les premières lectures, au CP.'
		},
		{
			title: 'Cadran de 24 heures',
			source: fence('horloge', 'heure: 15 h 45', 'cadran: 24', 'taille: 5cm'),
			explanation: '15 h 45 se dessine comme 3 h 45 ; la couronne intérieure aide à lire 15.'
		},
		{
			title: 'Sans aucun repère',
			source: fence('horloge', 'heure: 4 h 20', 'chiffres: aucun', 'graduations: aucune'),
			explanation: 'Un cadran nu, pour lire avec la seule position des aiguilles.'
		}
	],
	mistakes: [
		{
			title: 'Heure écrite avec deux-points',
			source: fence('horloge', 'heure: 9:30'),
			message: 'heure « 9:30 » non comprise',
			explanation: 'Le bloc lit 9 h 30, pas 9:30.'
		},
		{
			title: 'Une légende de trop',
			source: fence('horloge', 'heure: 8 h', 'légendes: Matin ; Midi'),
			message: '2 légende(s) pour 1 horloge(s)',
			explanation: 'Autant de légendes que d’heures, ou aucune.'
		}
	],
	tryIt: fence('horloge', 'heure: 10 h 10 ; 2 h 50', 'légendes: Avant ; Après', 'chiffres: quarts')
};
