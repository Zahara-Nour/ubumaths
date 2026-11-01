/**
 * Les sept villes du Royaume et leurs lieux, pour les pages `/royaume/<ville>`.
 *
 * Contenu tiré du Compendium (`docs/Chiphres/lore-pataphysique.md`, § II), qui fait foi.
 * Les positions viennent des surcouches validées du chantier `illustrations`
 * (`docs/Chiphres/illustrations/villes/<ville>/carte-<ville>.svg`), en pixels de
 * l'image de la ville (1024 × 1024).
 */
import type { ProvinceId } from './tour';

// Types

export type CitySlug =
	| 'sandomir'
	| 'empoche-les-bains'
	| 'lobatchevsk'
	| 'sinusborg'
	| 'bonneteau-sur-vistule'
	| 'turingrad'
	| 'cracovenn';

/** Une zone cliquable de la carte, en pixels de l'image */
export interface MapTarget {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
}

/** Où poser le nom court sur la carte */
export interface MapLabel {
	x: number;
	y: number;
	/** `middle` si absent */
	anchor?: 'start' | 'end';
	/** Rotation en degrés autour de (x, y) */
	rotate?: number;
}

/** Un lieu d'une ville */
export interface CityPlace {
	id: string;
	/** Nom complet, celui du Compendium */
	name: string;
	/** Nom court posé sur la carte (lisible sur téléphone) */
	label: string;
	labelAt: MapLabel;
	/** Une ou plusieurs zones (les douze tours d'une enceinte, les six ponts d'un delta) */
	targets: MapTarget[];
	/** Deux ou trois phrases tirées du Compendium */
	description: string;
}

export interface City {
	slug: CitySlug;
	name: string;
	/** Province dont la ville est la capitale ; `null` pour Sandomir, capitale du Royaume */
	province: ProvinceId | null;
	/** Une phrase sous le titre de la page */
	intro: string;
	/** Fond de carte, sans texte, sous `static/` */
	image: string;
	places: CityPlace[];
}

// Constantes

/** Côté de l'image d'une ville, en pixels */
export const CITY_MAP_SIZE = 1024;

export const CITIES: City[] = [
	{
		slug: 'sandomir',
		name: 'Sandomir',
		province: null,
		intro:
			'La capitale du Royaume, bâtie en spirale au point où se rejoignent les six Provinces, sans appartenir à aucune.',
		image: '/images/royaume/carte-sandomir.webp',
		places: [
			{
				id: 'pont-levis',
				name: 'Le Pont-Levis du Royaume',
				label: 'Le Pont-Levis',
				labelAt: { x: 512, y: 938 },
				targets: [{ cx: 511, cy: 858, rx: 42, ry: 40 }],
				description:
					"L'entrée de la ville, et son seul pont : une spirale de gidouille n'a qu'une ouverture. De l'autre bord des douves partent les routes des six Provinces."
			},
			{
				id: 'grand-marche',
				name: 'Le Grand Marché Polonais',
				label: 'Le Grand Marché',
				labelAt: { x: 262, y: 402 },
				targets: [{ cx: 270, cy: 465, rx: 46, ry: 54 }],
				description:
					'Les étals de Mère Ubu, au premier tour de la spirale. Tout s’y vend, et Mère Ubu compte chaque sou.'
			},
			{
				id: 'caserne',
				name: 'La Caserne des Palotins',
				label: 'La Caserne',
				labelAt: { x: 735, y: 396 },
				targets: [{ cx: 729, cy: 283, rx: 84, ry: 84 }],
				description:
					'La caserne du Capitaine Bordure, où logent les Palotins, les sbires et les copains du Roi.'
			},
			{
				id: 'arene',
				name: 'L’Arène des Polonais',
				label: 'L’Arène',
				labelAt: { x: 603, y: 748 },
				targets: [{ cx: 602, cy: 677, rx: 46, ry: 46 }],
				description:
					'Une petite arène ronde, où l’on vient jouer. Le Père Ubu y crie plus fort que tout le monde.'
			},
			{
				id: 'gazette',
				name: 'La Gazette du Royaume',
				label: 'La Gazette',
				labelAt: { x: 322, y: 602 },
				targets: [{ cx: 366, cy: 514, rx: 34, ry: 58 }],
				description:
					'L’imprimerie du Shtam, la gazette du Royaume. Ses presses tournent jour et nuit pour annoncer les nouvelles des six Provinces.'
			},
			{
				id: 'bibliotheque',
				name: 'La Bibliothèque du Décervelage',
				label: 'La Bibliothèque',
				labelAt: { x: 552, y: 340 },
				targets: [{ cx: 552, cy: 390, rx: 46, ry: 42 }],
				description:
					'Le temple à colonnes où l’on vient lire les cours. Conscience y accueille les Galopins.'
			},
			{
				id: 'trone-royal',
				name: 'Le Trône Royal',
				label: 'Le Trône Royal',
				labelAt: { x: 512, y: 608 },
				targets: [{ cx: 512, cy: 492, rx: 72, ry: 72 }],
				description:
					'Au cœur de la spirale, comme le centre d’une gidouille : le Palais Royal, rond et ventru, sous un dôme doré. Le Père Ubu y siège en majesté.'
			},
			{
				id: 'gare',
				name: 'La Gare',
				label: 'La Gare',
				labelAt: { x: 922, y: 348 },
				targets: [{ cx: 920, cy: 292, rx: 46, ry: 30 }],
				description:
					'Le chemin de fer à vapeur arrive du Glitchistan et s’arrête ici, hors des douves. Le voyageur fait le tour de la ville jusqu’au Pont-Levis.'
			}
		]
	},
	{
		slug: 'empoche-les-bains',
		name: 'Empoche-les-Bains',
		province: 'nombrilie',
		intro:
			'Capitale de la Nombrilie : une station thermale de 1880, au fond d’une vallée boisée, où tout se paie.',
		image: '/images/royaume/carte-empoche-les-bains.webp',
		places: [
			{
				id: 'place-de-la-gidouille',
				name: 'La Place de la Gidouille',
				label: 'Place de la Gidouille',
				labelAt: { x: 555, y: 336 },
				targets: [{ cx: 555, cy: 240, rx: 150, ry: 80 }],
				description:
					'Une grande gidouille de bronze, dans un filet de vapeur, devant le Grand Hôtel thermal. Chaque soir, au restaurant de l’hôtel, on entend : « Patron, la soustraction ! »'
			},
			{
				id: 'parc-thermal',
				name: 'Le Parc thermal',
				label: 'Le Parc thermal',
				labelAt: { x: 548, y: 650 },
				targets: [{ cx: 548, cy: 485, rx: 172, ry: 150 }],
				description:
					'Allées de marronniers, pelouses et parterres, entre la place et les bains. Au milieu, le kiosque à musique.'
			},
			{
				id: 'buvette',
				name: 'La Buvette à colonnade',
				label: 'La Buvette',
				labelAt: { x: 440, y: 545 },
				targets: [{ cx: 440, cy: 470, rx: 44, ry: 52 }],
				description: 'Une colonnade en demi-cercle, bâtie au-dessus de la source chaude.'
			},
			{
				id: 'bains',
				name: 'Les Bains',
				label: 'Les Bains',
				labelAt: { x: 555, y: 940 },
				targets: [{ cx: 555, cy: 780, rx: 150, ry: 112 }],
				description:
					'L’établissement thermal et ses bassins fumants. À l’entrée, les guichets de péage de Mère Ubu : ici, tout se paie.'
			},
			{
				id: 'villa-des-phynances',
				name: 'La Villa des Phynances',
				label: 'Villa des Phynances',
				labelAt: { x: 210, y: 700 },
				targets: [{ cx: 210, cy: 615, rx: 76, ry: 60 }],
				description:
					'La résidence de Mère Ubu, gouverneur de la Nombrilie : une villa bourgeoise et cossue, avec sa salle des coffres.'
			},
			{
				id: 'promenade-de-la-vistule',
				name: 'La Promenade de la Vistule',
				label: 'La Promenade',
				labelAt: { x: 748, y: 510, rotate: -90 },
				targets: [{ cx: 765, cy: 510, rx: 22, ry: 180 }],
				description: 'Un quai planté de marronniers, le long de la Vistule.'
			}
		]
	},
	{
		slug: 'lobatchevsk',
		name: 'Lobatchevsk',
		province: 'bedonstan',
		intro:
			'Capitale du Bedonstan, bâtie sur un col en forme de selle de cheval, au pied des Pythagoriades.',
		image: '/images/royaume/carte-lobatchevsk.webp',
		places: [
			{
				id: 'academie-achrasienne',
				name: 'L’Académie Achrasienne',
				label: 'L’Académie',
				labelAt: { x: 512, y: 604 },
				targets: [{ cx: 512, cy: 510, rx: 58, ry: 60 }],
				description:
					'Au point-selle, centre exact du col : l’Académie où le Professeur Achras étudie les courbures et élève ses polyèdres.'
			},
			{
				id: 'place-du-triangle',
				name: 'La Place du Triangle',
				label: 'Place du Triangle',
				labelAt: { x: 458, y: 394 },
				targets: [{ cx: 432, cy: 440, rx: 34, ry: 30 }],
				description:
					'Une place triangulaire dont les angles font moins de 180° en tout. Achras en est fier : « À Lobatchevsk, un triangle bien élevé a moins de 180 degrés. »'
			},
			{
				id: 'polyedre-de-la-voie-royale',
				name: 'Le Polyèdre de la Voie Royale',
				label: 'Le Polyèdre',
				labelAt: { x: 150, y: 330 },
				targets: [{ cx: 262, cy: 322, rx: 30, ry: 38 }],
				description:
					'Un dodécaèdre d’or, dressé à l’entrée de la ville, sur la route qui vient de Sandomir.'
			},
			{
				id: 'pont-du-torrent',
				name: 'Le Pont du Torrent',
				label: 'Pont du Torrent',
				labelAt: { x: 905, y: 840 },
				targets: [{ cx: 795, cy: 795, rx: 50, ry: 32 }],
				description:
					'Un pont de pierre sur la Vistule naissante, encore torrent, qui descend des Pythagoriades.'
			},
			{
				id: 'enceinte',
				name: 'L’Enceinte à douze côtés',
				label: 'L’Enceinte',
				labelAt: { x: 590, y: 222 },
				targets: [
					{ cx: 510, cy: 252, rx: 22, ry: 22 },
					{ cx: 640, cy: 287, rx: 22, ry: 22 },
					{ cx: 735, cy: 380, rx: 22, ry: 22 },
					{ cx: 770, cy: 510, rx: 22, ry: 22 },
					{ cx: 735, cy: 640, rx: 22, ry: 22 },
					{ cx: 640, cy: 735, rx: 22, ry: 22 },
					{ cx: 510, cy: 770, rx: 22, ry: 22 },
					{ cx: 380, cy: 735, rx: 22, ry: 22 },
					{ cx: 285, cy: 640, rx: 22, ry: 22 },
					{ cx: 250, cy: 510, rx: 22, ry: 22 },
					{ cx: 285, cy: 380, rx: 22, ry: 22 },
					{ cx: 380, cy: 287, rx: 22, ry: 22 }
				],
				description:
					'Le rempart de la ville est un dodécagone : douze côtés, et une tour à chaque angle.'
			}
		]
	},
	{
		slug: 'sinusborg',
		name: 'Sinusborg',
		province: 'yoyolande',
		intro:
			'Capitale de la Yoyolande : un port nordique bâti sur les îles du delta de la Vistule, où tout monte et descend.',
		image: '/images/royaume/carte-sinusborg.webp',
		places: [
			{
				id: 'grand-phare',
				name: 'Le Grand Phare',
				label: 'Le Grand Phare',
				labelAt: { x: 742, y: 128 },
				targets: [{ cx: 633, cy: 120, rx: 40, ry: 75 }],
				description:
					'Au bout de la jetée, son faisceau balaie la mer, encore et encore, en un cycle sans fin.'
			},
			{
				id: 'port',
				name: 'Le Port',
				label: 'Le Port',
				labelAt: { x: 537, y: 200 },
				targets: [{ cx: 512, cy: 280, rx: 70, ry: 65 }],
				description:
					'Le bassin s’ouvre sur la Baltique. Les bateaux y montent et descendent avec la houle, en cadence.'
			},
			{
				id: 'grue-du-port',
				name: 'La Grue du Port',
				label: 'La Grue',
				labelAt: { x: 330, y: 236 },
				targets: [{ cx: 440, cy: 230, rx: 50, ry: 50 }],
				description: 'Une grande grue de bois qui monte et descend les cargaisons, comme un yo-yo.'
			},
			{
				id: 'residence-de-bougrelas',
				name: 'La Résidence de Bougrelas',
				label: 'La Résidence',
				labelAt: { x: 372, y: 384 },
				targets: [{ cx: 375, cy: 320, rx: 30, ry: 42 }],
				description:
					'Sur le quai principal, la maison haute et étroite, à pignons, de Bougrelas, gouverneur de la Yoyolande.'
			},
			{
				id: 'ponts-du-delta',
				name: 'Les Ponts du delta',
				label: 'Les Ponts du delta',
				labelAt: { x: 515, y: 728 },
				targets: [
					{ cx: 300, cy: 478, rx: 30, ry: 18 },
					{ cx: 505, cy: 480, rx: 30, ry: 18 },
					{ cx: 752, cy: 478, rx: 30, ry: 18 },
					{ cx: 357, cy: 676, rx: 30, ry: 18 },
					{ cx: 515, cy: 676, rx: 30, ry: 18 },
					{ cx: 612, cy: 676, rx: 30, ry: 18 }
				],
				description: 'Les bras de la Vistule découpent la ville en îlots. Six ponts les relient.'
			}
		]
	},
	{
		slug: 'bonneteau-sur-vistule',
		name: 'Bonneteau-sur-Vistule',
		province: 'pifometrie',
		intro:
			'Capitale de la Pifométrie : une ville de tripots, bâtie sur les deux rives d’un grand méandre de la Vistule.',
		image: '/images/royaume/carte-bonneteau-sur-vistule.webp',
		places: [
			{
				id: 'grand-place',
				name: 'La Grand-Place',
				label: 'La Grand-Place',
				labelAt: { x: 610, y: 590 },
				targets: [{ cx: 590, cy: 480, rx: 110, ry: 95 }],
				description:
					'La Roulette Royale y tourne en permanence, visible à des lieues. Sur l’estrade, le Cheval à Phynances hennit à chaque numéro qui sort.'
			},
			{
				id: 'quai-des-tripots',
				name: 'Le Quai des Tripots',
				label: 'Quai des Tripots',
				labelAt: { x: 470, y: 712, rotate: 38 },
				targets: [
					{ cx: 430, cy: 420, rx: 45, ry: 70 },
					{ cx: 470, cy: 590, rx: 55, ry: 90 }
				],
				description:
					'Des maisons de jeu le long du fleuve, et des tables à tapis vert dehors, au bord de l’eau, où les croupiers distribuent les cartes.'
			},
			{
				id: 'casino-flottant',
				name: 'Le Casino flottant',
				label: 'Casino flottant',
				labelAt: { x: 300, y: 520, rotate: -90 },
				targets: [{ cx: 348, cy: 520, rx: 30, ry: 85 }],
				description: 'Un bateau à aubes amarré au quai, devenu salle de jeu.'
			},
			{
				id: 'champ-de-courses',
				name: 'Le Champ de courses',
				label: 'Champ de courses',
				labelAt: { x: 850, y: 715 },
				targets: [{ cx: 850, cy: 690, rx: 150, ry: 100 }],
				description:
					'À la sortie de la ville, côté plaine : des tribunes et une piste ovale, où l’on parie sur les courses.'
			},
			{
				id: 'caisse-du-cheval',
				name: 'La Caisse du Cheval',
				label: 'La Caisse du Cheval',
				labelAt: { x: 880, y: 545 },
				targets: [{ cx: 765, cy: 515, rx: 32, ry: 32 }],
				description:
					'Un petit comptoir sur le chemin des parieurs, où le Cheval à Phynances prélève sa commission de 10 % sur tous les paris.'
			}
		]
	},
	{
		slug: 'turingrad',
		name: 'Turingrad',
		province: 'glitchistan',
		intro:
			'Capitale du Glitchistan : une ville de brique et de fonte, coupée par la Vistule canalisée, où des tubes de laiton relient tous les toits.',
		image: '/images/royaume/carte-turingrad.webp',
		places: [
			{
				id: 'place-du-reset',
				name: 'La Place du Reset',
				label: 'La Place du Reset',
				labelAt: { x: 480, y: 640 },
				targets: [{ cx: 480, cy: 505, rx: 115, ry: 105 }],
				description:
					'Au milieu, la Machine de Turing géante déroule son ruban de papier perforé. Quand elle boucle, on sonne la Cloche de Reset, et tout repart : « Aux grands maux les grands Reset ! »'
			},
			{
				id: 'quartier-babbage',
				name: 'Le Quartier Babbage',
				label: 'Quartier Babbage',
				labelAt: { x: 250, y: 368 },
				targets: [{ cx: 215, cy: 230, rx: 135, ry: 115 }],
				description:
					'Sur la rive ouest, des usines et des cheminées, et la Machine Analytique géante dans une halle à verrière.'
			},
			{
				id: 'quartier-lovelace',
				name: 'Le Quartier Lovelace',
				label: 'Quartier Lovelace',
				labelAt: { x: 772, y: 446 },
				targets: [{ cx: 772, cy: 530, rx: 80, ry: 85 }],
				description:
					'Sur la rive est, les ateliers des métiers à tisser à cartes perforées, qui tissent des motifs algébriques comme d’autres tissent des fleurs.'
			},
			{
				id: 'quartier-des-tubes',
				name: 'Le Quartier des Tubes',
				label: 'Quartier des Tubes',
				labelAt: { x: 470, y: 128 },
				targets: [{ cx: 470, cy: 205, rx: 85, ry: 60 }],
				description:
					'Au nord, la grande centrale des tubes pneumatiques, et les archives où arrivent les cartes perforées.'
			},
			{
				id: 'gare',
				name: 'La Gare',
				label: 'La Gare',
				labelAt: { x: 358, y: 898 },
				targets: [{ cx: 358, cy: 800, rx: 62, ry: 70 }],
				description: 'Au sud, le terminus du chemin de fer à vapeur qui traverse la province.'
			},
			{
				id: 'ecluses',
				name: 'Les Écluses',
				label: 'Les Écluses',
				labelAt: { x: 628, y: 905 },
				targets: [{ cx: 515, cy: 770, rx: 95, ry: 135 }],
				description:
					'Là où la Vistule traverse la ville, avec le dépôt de charbon : la Pile de Charbon.'
			}
		]
	},
	{
		slug: 'cracovenn',
		name: 'Cracovenn',
		province: 'patatovie',
		intro:
			'Capitale de la Patatovie : trois enceintes rondes qui se chevauchent, de brique, de pierre et de bois. La ville est un diagramme de Venn habitable.',
		image: '/images/royaume/carte-cracovenn.webp',
		places: [
			{
				id: 'bibliotheque-de-faustroll',
				name: 'La Bibliothèque de Faustroll',
				label: 'La Bibliothèque',
				labelAt: { x: 510, y: 396 },
				targets: [{ cx: 510, cy: 470, rx: 62, ry: 66 }],
				description:
					'Au centre, là où les trois enceintes se recoupent, une rotonde de brique, de pierre et de bois. Le Docteur Faustroll y classe les œuvres.'
			},
			{
				id: 'porte-de-brique',
				name: 'La Porte de brique',
				label: 'Porte de brique',
				labelAt: { x: 112, y: 368 },
				targets: [{ cx: 220, cy: 300, rx: 28, ry: 45 }],
				description:
					'La porte de l’enceinte de brique rouge. Derrière elle, chaque maison est bâtie dans les matériaux des enceintes qui l’entourent.'
			},
			{
				id: 'porte-de-pierre',
				name: 'La Porte de pierre',
				label: 'Porte de pierre',
				labelAt: { x: 918, y: 408 },
				targets: [{ cx: 805, cy: 300, rx: 30, ry: 45 }],
				description:
					'La porte de l’enceinte de pierre grise. Une rue droite mène de chaque porte à la bibliothèque.'
			},
			{
				id: 'porte-de-bois',
				name: 'La Porte de bois',
				label: 'Porte de bois',
				labelAt: { x: 640, y: 848 },
				targets: [{ cx: 512, cy: 808, rx: 32, ry: 28 }],
				description:
					'La porte de l’enceinte de bois clair, au sud. Sa rue franchit la Vistule, qui ne traverse que cette enceinte.'
			}
		]
	}
];

// Functions

export function cityBySlug(slug: string): City | undefined {
	return CITIES.find((city) => city.slug === slug);
}

export function cityPath(slug: CitySlug): `/royaume/${CitySlug}` {
	return `/royaume/${slug}`;
}

/** La capitale d'une Province */
export function capitalOf(province: ProvinceId): City {
	const city = CITIES.find((c) => c.province === province);
	if (!city) throw new Error(`Province sans capitale : ${province}`);
	return city;
}
