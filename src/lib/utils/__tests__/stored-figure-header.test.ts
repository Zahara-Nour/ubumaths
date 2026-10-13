/**
 * En-tête d'une figure stockée ↔ champs du formulaire : un champ n'écrit que
 * sa ligne ; tout le reste (autres clés, lignes en erreur, script sous `---`,
 * commentaires du script) reste intact. Un script nu reste nu tant qu'aucun
 * champ ne prend une valeur.
 */
import { describe, it, expect } from 'vitest';
import {
	hasFigureHeader,
	readHeaderField,
	readWindowFields,
	withBareScriptHeader,
	writeHeaderField,
	writeWindowFields
} from '../stored-figure-header';
import { evaluateStoredFigure } from '../geometry-figure-script';

const SCRIPT = '# un commentaire\nA = point(0, 0)  # origine\nB = point(3, 1)';

const TEXT = `fénétre-inconnue: 3
fenêtre: -1 ; 8 ; -1 ; 6
taille: petite

axes: oui
---
${SCRIPT}`;

describe('lecture', () => {
	it('valeur brute de la clé, orthographe accentuée comprise', () => {
		expect(readHeaderField(TEXT, 'fenetre')).toBe('-1 ; 8 ; -1 ; 6');
		expect(readHeaderField(TEXT, 'taille')).toBe('petite');
		expect(readHeaderField(TEXT, 'axes')).toBe('oui');
		expect(readHeaderField(TEXT, 'rendu')).toBeNull();
		expect(readWindowFields(TEXT)).toEqual(['-1', '8', '-1', '6']);
	});

	it('script nu : aucune clé, même si le script contient « taille: »', () => {
		const bare = 'taille: grande\nA = point(0, 0)';
		expect(hasFigureHeader(bare)).toBe(false);
		expect(readHeaderField(bare, 'taille')).toBeNull();
		expect(readWindowFields(bare)).toEqual(['', '', '', '']);
	});

	it('une clé écrite SOUS --- n’est pas lue (c’est le script)', () => {
		expect(readHeaderField('axes: non\n---\nrendu: croquis', 'rendu')).toBeNull();
	});
});

describe('écriture', () => {
	it('remplace sur place, garde l’orthographe de la clé et tout le reste', () => {
		const out = writeHeaderField(TEXT, 'fenetre', '0 ; 4 ; 0 ; 3');
		expect(out).toBe(TEXT.replace('fenêtre: -1 ; 8 ; -1 ; 6', 'fenêtre: 0 ; 4 ; 0 ; 3'));
	});

	it('clé absente : ajoutée juste avant ---', () => {
		const out = writeHeaderField(TEXT, 'rendu', 'croquis');
		expect(out).toBe(TEXT.replace('axes: oui\n---', 'axes: oui\nrendu: croquis\n---'));
	});

	it('null : la ligne disparaît, le reste est intact', () => {
		expect(writeHeaderField(TEXT, 'taille', null)).toBe(TEXT.replace('taille: petite\n', ''));
		expect(writeHeaderField(TEXT, 'grille', null)).toBe(TEXT);
	});

	it('script nu : null ne change rien ; une valeur fait naître l’en-tête', () => {
		expect(writeHeaderField(SCRIPT, 'axes', null)).toBe(SCRIPT);
		expect(writeHeaderField(SCRIPT, 'deplacable', 'oui')).toBe(`deplacable: oui\n---\n${SCRIPT}`);
	});

	it('fenêtre en 4 champs : une borne modifiée, les autres gardées ; toutes vides → ligne retirée', () => {
		const bounds = readWindowFields(TEXT);
		bounds[1] = '10';
		expect(readHeaderField(writeWindowFields(TEXT, bounds), 'fenetre')).toBe('-1 ; 10 ; -1 ; 6');
		expect(readHeaderField(writeWindowFields(TEXT, ['', ' ', '', '']), 'fenetre')).toBeNull();
	});

	it('valeur en cours de frappe gardée telle quelle (« - »), même invalide', () => {
		const out = writeWindowFields(TEXT, ['-', '8', '-1', '6']);
		expect(readWindowFields(out)).toEqual(['-', '8', '-1', '6']);
	});
});

describe('aller-retour texte ↔ champs ↔ texte', () => {
	it('réécrire chaque champ avec sa propre valeur rend le texte à l’identique', () => {
		let out = TEXT;
		for (const key of ['taille', 'axes'] as const) {
			out = writeHeaderField(out, key, readHeaderField(out, key));
		}
		out = writeWindowFields(out, readWindowFields(out));
		expect(out).toBe(TEXT);
	});

	it('le script sous --- n’est jamais réécrit, quel que soit le champ', () => {
		let out = TEXT;
		out = writeHeaderField(out, 'grille', '1');
		out = writeHeaderField(out, 'graduations', 'non');
		out = writeHeaderField(out, 'deplacable', 'oui');
		out = writeHeaderField(out, 'rendu', 'mixte');
		out = writeHeaderField(out, 'axes', null);
		expect(out.endsWith(`---\n${SCRIPT}`)).toBe(true);
		expect(out.startsWith('fénétre-inconnue: 3\n')).toBe(true);
	});
});

describe('script nu : l’en-tête naît avec l’affichage actuel', () => {
	const BARE = 'A = point(1, 2)\nB = point(3, 4)';

	it('reprend toile, grille, axes et points déplaçables, le script intact', () => {
		const text = withBareScriptHeader(BARE);
		expect(text.endsWith(`\n---\n${BARE}`)).toBe(true);
		expect(readHeaderField(text, 'fenetre')).toBe('-6.5 ; 6.5 ; -6.5 ; 6.5');
		expect(readHeaderField(text, 'taille')).toBe('grande');
		expect(readHeaderField(text, 'axes')).toBe('oui');
		expect(readHeaderField(text, 'grille')).toBe('1 ; 1');
		expect(readHeaderField(text, 'deplacable')).toBe('oui');
	});

	it('un premier champ réglé ne change que lui', () => {
		const text = writeHeaderField(withBareScriptHeader(BARE), 'rendu', 'croquis');
		expect(readHeaderField(text, 'rendu')).toBe('croquis');
		expect(readHeaderField(text, 'deplacable')).toBe('oui');
		expect(readHeaderField(text, 'grille')).toBe('1 ; 1');
	});

	it('un texte qui a déjà un en-tête est rendu tel quel', () => {
		const text = `axes: non\n---\n${BARE}`;
		expect(withBareScriptHeader(text)).toBe(text);
	});

	it('l’en-tête né est valide pour le parseur des figures stockées', () => {
		const result = evaluateStoredFigure(withBareScriptHeader(BARE));
		expect(result.ok).toBe(true);
	});
});
