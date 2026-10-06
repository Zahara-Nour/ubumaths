/**
 * Les Dépêches du Czar : neuf messages interceptés, un par chiffre, de
 * difficulté croissante. Le texte chiffré est calculé à partir du clair et de
 * la clé : il ne peut pas diverger de ce qu'on attend comme réponse.
 *
 * Lore : le Czar Alexis règne sur l'Empire du Czar depuis son palais d'Hiver
 * (Compendium, section III) ; rien du Collège.
 *
 * @module lib/ciphers/dispatches
 */
import { lettersOnly } from './alphabet';
import { affineEncrypt } from './affine';
import { atbash } from './atbash';
import { caesarEncrypt } from './caesar';
import { hillEncrypt, type HillKey } from './hill';
import { polybiusEncrypt } from './polybius';
import { rsaEncrypt, rsaKeys } from './rsa';
import { scytaleEncrypt } from './scytale';
import { keyFromKeyword, substitutionEncrypt } from './substitution';
import { vigenereEncrypt } from './vigenere';

// Types

export type DispatchKey =
	| { cipher: 'cesar'; shift: number }
	| { cipher: 'atbash' }
	| { cipher: 'polybe' }
	| { cipher: 'scytale'; lettersPerTurn: number }
	| { cipher: 'substitution'; keyword: string }
	| { cipher: 'affine'; a: number; b: number }
	| { cipher: 'vigenere'; key: string }
	| { cipher: 'hill'; key: HillKey }
	| { cipher: 'rsa'; p: number; q: number; e: number };

export type DispatchCipher = DispatchKey['cipher'];

export interface Dispatch {
	number: number;
	title: string;
	story: string;
	plaintext: string;
	key: DispatchKey;
	/** Le récit dit déjà de quel chiffre il s'agit : le lien vers les outils est offert d'emblée */
	namedInStory: boolean;
	/** Le premier nomme le chiffre, le second oriente l'attaque */
	hints: [string, string];
	/** La suite du récit, une fois la dépêche décryptée */
	epilogue: string;
}

// Constantes

/** Page du Cabinet Noir où se trouvent les outils de chaque chiffre */
export const CIPHER_PATHS = {
	cesar: '/chiffrement/cesar',
	atbash: '/chiffrement/atbash',
	polybe: '/chiffrement/polybe',
	scytale: '/chiffrement/scytale',
	substitution: '/chiffrement/substitution',
	affine: '/chiffrement/affine',
	vigenere: '/chiffrement/vigenere',
	hill: '/chiffrement/hill',
	rsa: '/chiffrement/rsa'
} as const satisfies Record<DispatchCipher, string>;

/** La clé RSA du Czar, affichée « sur les murs du palais d'Hiver » : partagée avec la page RSA */
export const CZAR_RSA_KEY = { p: 43, q: 47, e: 5 } as const;
/** « Tout rapport commence par RAPPORT » : l'amorce connue, partagée avec la page Hill */
export const REPORT_PREFIX = 'RAPP';

export const DISPATCHES: readonly Dispatch[] = [
	{
		number: 1,
		title: 'Le billet du gué',
		story:
			'Un Palotin a trouvé ce billet dans la botte d’un messager du Czar, au gué de la Vistule. Le Czar, qui se croit malin, a pris le chiffre préféré du Père Ubu : chaque lettre avance de quelques rangs dans l’alphabet.',
		plaintext:
			'Rendez-vous à la tour du vieux moulin, au coucher du soleil. Apportez les cartes du Royaume.',
		key: { cipher: 'cesar', shift: 3 },
		namedInStory: true,
		hints: [
			'C’est le chiffre de César.',
			'Il n’y a que 26 décalages possibles : essayez-les tous, ou cherchez quelle lettre cache le E.'
		],
		epilogue:
			'Les Palotins se postent au vieux moulin et cueillent le messager suivant. Dans sa sacoche, une nouvelle dépêche…'
	},
	{
		number: 2,
		title: 'La sacoche du messager',
		story:
			'La dépêche suivante dormait au fond de la sacoche. Le scribe du Czar a écrit son alphabet à l’envers, de Z à A, comme dans les vieux grimoires.',
		plaintext: 'Nos espions ont repéré la cachette des phynances, sous le Trône Royal de Sandomir.',
		key: { cipher: 'atbash' },
		namedInStory: true,
		hints: [
			'C’est Atbash : A devient Z, B devient Y, et ainsi de suite.',
			'Atbash n’a pas de clé : appliquez-le une fois de plus et le message revient.'
		],
		epilogue:
			'Cornegidouille ! La Mère Ubu déménage les phynances dans la nuit. Mais déjà, sur la colline, des torches s’allument…'
	},
	{
		number: 3,
		title: 'Les torches de la colline',
		story:
			'Sur la colline, un guetteur du Czar agite des torches : tant à gauche, tant à droite. Le Cabinet Noir a noté chaque signal sous forme de paires de chiffres, comme le faisaient déjà les Grecs.',
		plaintext: 'Bougrelas est vivant. Il se cache dans la forêt avec ses partisans.',
		key: { cipher: 'polybe' },
		namedInStory: true,
		hints: [
			'C’est le carré de Polybe : le premier chiffre donne la ligne, le second la colonne.',
			'Dans la grille de 5 × 5, I et J partagent la même case.'
		],
		epilogue:
			'Bougrelas est vivant ! Le Czar le cherche : il faut le prévenir avant lui. Au même moment, on arrête un courrier qui porte un étrange bâton…'
	},
	{
		number: 4,
		title: 'Le bâton du courrier',
		story:
			'Le courrier portait un bâton de bois et une longue ceinture de cuir couverte de lettres sans suite. Les Spartiates connaissaient déjà le procédé.',
		plaintext: 'Rassemblez les troupes du Czar au gué de la Vistule, à l’aube du troisième jour.',
		key: { cipher: 'scytale', lettersPerTurn: 5 },
		namedInStory: true,
		hints: [
			'C’est une scytale : les lettres sont les bonnes, seul leur ordre a changé.',
			'Essayez des bâtons de 2, 3, 4… lettres par tour, jusqu’à ce qu’une phrase apparaisse.'
		],
		epilogue:
			'L’attaque est prévue au gué. Le Capitaine Bordure y conduit les Palotins, et les troupes du Czar rebroussent chemin. Le Czar, méfiant, écrit alors à son général…'
	},
	{
		number: 5,
		title: 'La lettre au général',
		story:
			'Une longue lettre du Czar à son général, saisie dans un relais de poste. Chaque lettre de l’alphabet y est remplacée par une autre, toujours la même. Sans la clé, il ne reste qu’à compter.',
		plaintext:
			'Général, les Palotins nous attendaient au gué de la Vistule et nos troupes ont dû reculer. Je soupçonne un traître dans mon propre palais. Désormais, toutes mes dépêches seront chiffrées avec des méthodes que le Père Ubu, qui ne sait même pas compter, sera incapable de percer. Brûlez cette lettre dès que vous l’aurez lue. Par Saint Georges, nous aurons notre revanche.',
		key: { cipher: 'substitution', keyword: 'PALAIS DHIVER' },
		namedInStory: false,
		hints: [
			'C’est une substitution : chaque lettre en remplace toujours une autre.',
			'Comptez les lettres : la plus fréquente cache sans doute un E. Les mots d’une ou deux lettres (LE, LA, DE, ET) aident beaucoup.'
		],
		epilogue:
			'Le Czar soupçonne un traître ! Il ignore que toutes ses lettres passent par le Cabinet Noir. La suivante vient de son trésorier…'
	},
	{
		number: 6,
		title: 'Le message du trésorier',
		story:
			'Le trésorier du Czar n’aime que les calculs. Il multiplie le rang de chaque lettre par un nombre, en ajoute un autre, et ne garde que le reste de la division par 26. Il se croit à l’abri.',
		plaintext:
			'Trésorier du Czar au général. Les caisses sont vides : la campagne contre le Royaume a coûté plus cher que prévu. Nous ne pourrons payer les soldats qu’à la fin du mois.',
		key: { cipher: 'affine', a: 11, b: 4 },
		namedInStory: false,
		hints: [
			'C’est un chiffre affine : la lettre de rang x devient celle de rang a·x + b, modulo 26.',
			'Deux lettres suffisent : supposez que la plus fréquente cache un E, puis cherchez quelle autre lettre fréquente donne une clé valide. La force brute marche aussi : il n’y a que 312 clés.'
		],
		epilogue:
			'Les caisses du Czar sont vides ! La Mère Ubu en rit encore. Furieux, le Czar adopte un chiffre réputé indéchiffrable…'
	},
	{
		number: 7,
		title: 'Le chiffre indéchiffrable',
		story:
			'Cette fois, le Czar a sorti le grand jeu : un mot secret, répété tout au long du message, change le décalage à chaque lettre. Ses conseillers le jurent : personne ne lira jamais cela.',
		plaintext:
			'À tous les généraux de l’Empire. Nos ennemis lisent nos dépêches, mais ce chiffre-ci ne craint personne : chaque lettre change de décalage selon le mot secret que seuls mes conseillers connaissent. Préparez la grande marche vers Sandomir. Nous partirons le premier jour du mois de Lumenal, quand les Galopins seront occupés à réviser. Le Père Ubu ne verra rien venir, et la couronne sera enfin à nous.',
		key: { cipher: 'vigenere', key: 'HIVER' },
		namedInStory: false,
		hints: [
			'C’est le chiffre de Vigenère : un César dont le décalage change à chaque lettre.',
			'Trouvez d’abord la longueur de la clé (Kasiski, indice de coïncidence), puis cassez chaque colonne comme un César. La clé est un mot de saison.'
		],
		epilogue:
			'La clé était HIVER, comme le palais du Czar. La grande marche est démasquée. Le Czar comprend que ses lettres sont lues, et s’en remet à son mathématicien…'
	},
	{
		number: 8,
		title: 'Le rapport du mathématicien',
		story:
			'Le mathématicien du Czar chiffre les lettres deux par deux, avec une matrice. Un détail le trahit : à la cour du Czar, tout rapport commence par le mot RAPPORT.',
		plaintext:
			'Rapport au Czar. La matrice est inversible, le chiffre est sûr. Seul un Galopin qui connaîtrait le début du message pourrait retrouver la clé.',
		key: { cipher: 'hill', key: { a: 9, b: 4, c: 5, d: 7 } },
		namedInStory: false,
		hints: [
			'C’est le chiffre de Hill : les lettres vont par paires et passent par une matrice 2 × 2.',
			'Vous connaissez les quatre premières lettres du clair : RAPP. L’attaque à clair connu donne M = C·P⁻¹.'
		],
		epilogue:
			'Le mathématicien avait raison sur un point : il suffisait de connaître le début. Le Czar ne fait plus confiance qu’aux nombres premiers…'
	},
	{
		number: 9,
		title: 'Le grand décryptage',
		story:
			'Dernière dépêche, la plus importante. Le Czar l’a chiffrée avec sa clé publique, qu’il affiche fièrement sur les murs du palais d’Hiver : (n, e) = (2021, 5). Selon lui, personne ne trouvera jamais sa clé privée.',
		plaintext:
			'Ordre du Czar : la grande bataille aura lieu le jour du Décervelage Suprême. Que les Galopins tremblent.',
		key: { cipher: 'rsa', ...CZAR_RSA_KEY },
		namedInStory: false,
		hints: [
			'C’est RSA : la clé publique est (n, e) = (2021, 5).',
			'2021 n’est pas si grand : factorisez-le, recalculez φ(n), puis la clé privée d.'
		],
		epilogue:
			'Cornegidouille ! Le Czar Alexis vous attend au Décervelage Suprême. Mais grâce au Cabinet Noir, le Royaume connaît tous ses plans. Bravo, agent : toutes les dépêches sont décryptées.'
	}
];

// Functions

export function dispatchCiphertext({ plaintext, key }: Dispatch): string {
	switch (key.cipher) {
		case 'cesar':
			return caesarEncrypt(plaintext, key.shift).text;
		case 'atbash':
			return atbash(plaintext).text;
		case 'polybe':
			return polybiusEncrypt(plaintext).text;
		case 'scytale':
			return scytaleEncrypt(plaintext, key.lettersPerTurn).text;
		case 'substitution':
			return substitutionEncrypt(plaintext, keyFromKeyword(key.keyword)).text;
		case 'affine':
			return affineEncrypt(plaintext, key.a, key.b).text;
		case 'vigenere':
			return vigenereEncrypt(plaintext, key.key).text;
		case 'hill':
			return hillEncrypt(plaintext, key.key).text;
		case 'rsa':
			return rsaEncrypt(plaintext, rsaKeys(key.p, key.q, key.e)).text;
	}
}

/**
 * La réponse est juste si ses lettres sont celles du clair : accents, espaces
 * et ponctuation ne comptent pas. Polybe rend I pour J ; Hill et RSA ajoutent
 * un X à un clair de longueur impaire : les deux formes sont acceptées.
 */
export function checkAnswer(dispatch: Dispatch, answer: string): boolean {
	const fold = (text: string) =>
		dispatch.key.cipher === 'polybe' ? lettersOnly(text).replaceAll('J', 'I') : lettersOnly(text);
	const given = fold(answer);
	const expected = fold(dispatch.plaintext);
	if (given === '') return false;
	const padded = ['hill', 'rsa'].includes(dispatch.key.cipher) && expected.length % 2 === 1;
	return given === expected || (padded && given === `${expected}X`);
}

/** Une dépêche s'ouvre quand la précédente est décryptée */
export function isUnlocked(number: number, solved: readonly number[]): boolean {
	return number === 1 || solved.includes(number - 1);
}
