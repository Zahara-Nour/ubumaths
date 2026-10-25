/**
 * Catalogue — bloc ```qr (QR code)
 *
 * Réglages : `src/lib/ubumark/parser/qr-parser.ts` ; adresses acceptées :
 * `src/lib/qr/qr-target.ts`.
 *
 * @module block-catalog/qr
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const qrEntry: BlockCatalogEntry = {
	slug: 'qr-code',
	title: 'QR code',
	fences: ['qr'],
	nodeType: 'qr',
	summary: 'Un QR code vers une page du site ou un site extérieur, avec légende facultative.',
	intro:
		'La première ligne du bloc est l’adresse. Pour une page du site, écris-la en court (/glossaire) : le QR porte l’adresse complète. Pour un site extérieur, écris-la en https://. Les deux réglages qui suivent sont facultatifs.',
	settingGroups: [
		{
			settings: [
				{
					key: 'adresse (première ligne)',
					values: '/page du site, chiph.re/page ou https://site-exterieur.fr/…',
					defaultValue: null,
					description: 'Sans espace. Un site extérieur doit être en https:// ; http:// est refusé.'
				},
				{
					key: 'légende',
					values: 'un texte (120 caractères au plus)',
					defaultValue: 'aucune',
					description: 'Écrite sous le QR code.'
				},
				{
					key: 'taille',
					values: '2,5 à 6 cm, unité cm obligatoire',
					defaultValue: '3 cm',
					description: 'Côté du QR code. La virgule décimale est acceptée.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Une page du site',
			source: fence('qr', '/glossaire'),
			explanation: 'Une seule ligne : l’adresse courte d’une page du site.'
		},
		{
			title: 'Une adresse extérieure en https',
			source: fence('qr', 'https://fr.wikipedia.org/wiki/Th%C3%A9or%C3%A8me_de_Pythagore'),
			explanation: 'L’adresse est reprise telle qu’elle est écrite : vérifie-la avant.'
		},
		{
			title: 'Avec légende',
			source: fence('qr', '/glossaire', 'légende: Le glossaire en ligne'),
			explanation: 'La légende est écrite sous le QR code.'
		},
		{
			title: 'Plus grand, pour un affichage',
			source: fence('qr', 'chiph.re/shtam', 'légende: Le Shtam, la gazette', 'taille: 4,5cm'),
			explanation: 'Avec ou sans https:// et www, une adresse du site est complétée seule.'
		}
	],
	mistakes: [
		{
			title: 'Adresse en http://',
			source: fence('qr', 'http://exemple.fr/cours'),
			message: 'en http:// : écris-la en https://',
			explanation:
				'Un téléphone avertit avant d’ouvrir un site non sécurisé. Écris l’adresse en https://.'
		},
		{
			title: 'Taille sans unité',
			source: fence('qr', '/glossaire', 'taille: 3'),
			message: 'écris un nombre de centimètres',
			explanation: 'Écris la taille avec son unité : taille: 3cm.'
		}
	],
	tryIt: fence('qr', '/glossaire', 'légende: Le glossaire en ligne', 'taille: 3cm')
};
