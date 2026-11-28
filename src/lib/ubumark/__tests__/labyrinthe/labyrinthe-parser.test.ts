/**
 * Bloc ```labyrinthe : parseur, graine posée par le générateur, juge (chantier `labyrinthe`)
 */

import { describe, it, expect } from 'vitest';
import {
	avecGraines,
	findLabyrinthesAParcourir,
	hasLabyrintheAParcourir,
	parseLabyrintheContent
} from '#lib/ubumark/parser/labyrinthe-parser.ts';
import {
	ecrireChemin,
	expectedLabyrintheAnswer,
	labyrintheAnswerVerdict,
	LABYRINTHE_ENTREE,
	LABYRINTHE_INTRUS,
	LABYRINTHE_SAUT,
	LABYRINTHE_SORTIE,
	lireChemin,
	readExpectedLabyrintheAnswer
} from '#lib/ubumark/utils/labyrinthe-answer.ts';
import { createRandomSource } from '#lib/utils/random.ts';

const bloc = (...lignes: string[]) => lignes.join('\n');

const QUESTION = bloc('grille: 6 x 4', 'règle: premier', 'parcourir: oui', 'graine: 7');

function messages(source: string): string {
	return parseLabyrintheContent(source)
		.errors.map((e) => e.message)
		.join(' ; ');
}

describe('parseLabyrintheContent', () => {
	it('question : grille, règle, nombres et chemin tirés de la graine', () => {
		const node = parseLabyrintheContent(QUESTION);
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({
			colonnes: 6,
			lignes: 4,
			regle: { kind: 'premier' },
			parcourir: true,
			solution: false
		});
		expect(node.spec?.nombres).toHaveLength(4);
		expect(node.spec?.chemin[0].col).toBe(1);
		// Même texte, même labyrinthe (écran, corrigé et juge voient la même grille)
		expect(parseLabyrintheContent(QUESTION).spec).toEqual(node.spec);
	});

	it('sans graine : tirée du texte, toujours la même', () => {
		const source = bloc('grille: 5 x 3', 'règle: multiple de 4');
		expect(parseLabyrintheContent(source).spec).toEqual(parseLabyrintheContent(source).spec);
		expect(parseLabyrintheContent(source).spec?.parcourir).toBe(false);
	});

	it('`solution: oui` : le chemin montré, sans case', () => {
		const node = parseLabyrintheContent(bloc('grille: 5 x 3', 'règle: premier', 'solution: oui'));
		expect(node.errors).toEqual([]);
		expect(node.spec?.solution).toBe(true);
	});

	it('`case:` lue avec `parcourir: oui`', () => {
		expect(parseLabyrintheContent(bloc(QUESTION, 'case: 2')).caseIndex).toBe(2);
	});

	it('erreurs d’auteur', () => {
		expect(messages(bloc('règle: premier'))).toMatch(/il manque la ligne grille:/);
		expect(messages(bloc('grille: 5 x 3'))).toMatch(/il manque la ligne règle:/);
		expect(messages(bloc('grille: 8 x 3', 'règle: premier'))).toMatch(
			/de 3 à 7 colonnes et de 2 à 7 lignes/
		);
		expect(messages(bloc('grille: 5 x 1', 'règle: premier'))).toMatch(/de 3 à 7 colonnes/);
		expect(messages(bloc('grille: 5 sur 3', 'règle: premier'))).toMatch(/colonnes x lignes/);
		expect(messages(bloc('grille: 5 x 3', 'règle: pair'))).toMatch(/règle « pair » inconnue/);
		expect(messages(bloc('grille: 5 x 3', 'règle: premier', 'couleur: rouge'))).toMatch(
			/clé « couleur » inconnue/
		);
		expect(messages(bloc('grille: 5 x 3', 'grille: 4 x 3', 'règle: premier'))).toMatch(
			/« grille » déjà donnée ligne 1/
		);
		expect(messages(bloc('grille: 5 x 3', 'règle: premier', 'case: 0'))).toMatch(
			/case: seulement avec parcourir: oui/
		);
		expect(messages(bloc(QUESTION, 'solution: oui'))).toMatch(
			/solution: oui ne va pas avec parcourir: oui/
		);
		expect(messages(bloc('grille: 5 x 3', 'règle: premier', 'graine: abc'))).toMatch(
			/graine « abc »/
		);
		expect(parseLabyrintheContent(bloc('grille: 5 x 3', 'règle: pair')).spec).toBeNull();
	});

	// Largeurs mesurées à 375 px (iPhone SE) dans la carte de question : 7 colonnes de nombres
	// de 3 caractères, 5 de 4 à 6 caractères, 4 de 7 caractères (chantier labyrinthe, n° 61)
	it('grille trop large pour un téléphone : refusée, avec le nombre de colonnes possible', () => {
		const refus = (grille: string, regle: string) =>
			messages(bloc(`grille: ${grille}`, `règle: ${regle}`, 'parcourir: oui'));
		expect(refus('6 x 4', 'chiffre des centaines = 4')).toMatch(
			/trop large pour un téléphone : au plus 5 colonnes avec des nombres comme 1234/
		);
		expect(refus('5 x 3', 'chiffre des dix-millièmes = 3')).toMatch(
			/au plus 4 colonnes avec des nombres comme 12,3456/
		);
		expect(refus('5 x 3', 'chiffre des dizaines de mille = 6')).toMatch(
			/au plus 4 colonnes avec des nombres comme 123 456/
		);
		expect(refus('6 x 3', 'multiple de 99')).toMatch(/au plus 5 colonnes/);
		expect(refus('6 x 3', 'chiffre des dixièmes = 3')).toMatch(/au plus 5 colonnes/);
		// Grille déjà refusée pour ses bornes : un seul message
		expect(
			parseLabyrintheContent(bloc('grille: 6 x 9', 'règle: chiffre des dix-millièmes = 3')).errors
		).toHaveLength(1);
		// Affichage seul aussi : le bloc s'affiche à l'écran (cours, corrigé)
		expect(
			messages(bloc('grille: 7 x 7', 'règle: chiffre des dix-millièmes = 0', 'solution: oui'))
		).toMatch(/au plus 4 colonnes/);
	});

	it('grilles qui tiennent : acceptées (modèles publiés et catalogue compris)', () => {
		const accepte = (grille: string, regle: string) =>
			parseLabyrintheContent(bloc(`grille: ${grille}`, `règle: ${regle}`, 'parcourir: oui')).errors;
		expect(accepte('7 x 5', 'premier')).toEqual([]);
		expect(accepte('7 x 3', 'multiple de 4')).toEqual([]);
		expect(accepte('7 x 3', 'chiffre des dizaines = 4')).toEqual([]);
		expect(accepte('5 x 4', 'chiffre des centièmes = 7')).toEqual([]);
		expect(accepte('5 x 4', 'chiffre des unités de mille = 2')).toEqual([]);
		expect(accepte('5 x 3', 'multiple de 99')).toEqual([]);
		expect(accepte('4 x 5', 'chiffre des dix-millièmes = 0')).toEqual([]);
		expect(accepte('4 x 5', 'chiffre des dizaines de mille = 9')).toEqual([]);
	});
});

describe('findLabyrinthesAParcourir, avecGraines', () => {
	const enonce = (corps: string) => `Trouve la sortie.\n\n\`\`\`labyrinthe\n${corps}\n\`\`\`\n`;

	it('trouve les blocs à parcourir seulement', () => {
		expect(hasLabyrintheAParcourir(enonce('grille: 5 x 3\nrègle: premier\nparcourir: oui'))).toBe(
			true
		);
		expect(hasLabyrintheAParcourir(enonce('grille: 5 x 3\nrègle: premier'))).toBe(false);
		const cite = `> \`\`\`labyrinthe\n> grille: 5 x 3\n> règle: premier\n> parcourir: oui\n> \`\`\``;
		expect(findLabyrinthesAParcourir(cite)[0].nested).toBe(true);
	});

	it('pose une graine dans chaque bloc à parcourir qui n’en a pas, une seule fois', () => {
		const texte = enonce('grille: 5 x 3\nrègle: premier\nparcourir: oui');
		const avec = avecGraines(texte, createRandomSource(1));
		expect(avec).toMatch(/```labyrinthe\ngraine: \d+\ngrille: 5 x 3/);
		expect(avecGraines(avec, createRandomSource(2))).toBe(avec);
		// Deux tirages, deux graines
		expect(avecGraines(texte, createRandomSource(3))).not.toBe(avec);
		// Un bloc d'affichage n'en reçoit pas
		const affichage = enonce('grille: 5 x 3\nrègle: premier');
		expect(avecGraines(affichage, createRandomSource(1))).toBe(affichage);
	});
});

describe('juge du chemin', () => {
	const node = parseLabyrintheContent(QUESTION);
	const spec = node.spec!;
	const attendue = expectedLabyrintheAnswer(spec);

	it('réponse attendue lisible : la grille, l’entrée et le chemin', () => {
		const lu = readExpectedLabyrintheAnswer(attendue);
		expect(lu).toEqual({
			colonnes: 6,
			lignes: 4,
			entree: spec.entree,
			chemin: spec.chemin
		});
		expect(readExpectedLabyrintheAnswer('n’importe quoi')).toBeNull();
	});

	it('chemin en texte, aller-retour', () => {
		expect(lireChemin('2,1 2,2 3,2')).toEqual([
			{ ligne: 2, col: 1 },
			{ ligne: 2, col: 2 },
			{ ligne: 3, col: 2 }
		]);
		expect(lireChemin(ecrireChemin(spec.chemin))).toEqual(spec.chemin);
		expect(lireChemin('2;1')).toBeNull();
	});

	it('le bon chemin est juste', () => {
		expect(labyrintheAnswerVerdict(ecrireChemin(spec.chemin), attendue)).toEqual({ juste: true });
	});

	it('vide : faux, sans message', () => {
		expect(labyrintheAnswerVerdict('', attendue)).toEqual({ juste: false });
	});

	it('ne part pas de l’entrée', () => {
		const ailleurs = spec.entree === 1 ? 2 : 1;
		expect(labyrintheAnswerVerdict(`${ailleurs},1`, attendue)).toEqual({
			juste: false,
			message: LABYRINTHE_ENTREE
		});
	});

	it('s’arrête avant une sortie', () => {
		expect(labyrintheAnswerVerdict(ecrireChemin(spec.chemin.slice(0, -1)), attendue)).toEqual({
			juste: false,
			message: LABYRINTHE_SORTIE
		});
	});

	it('saute une case', () => {
		const saut = [spec.chemin[0], spec.chemin[2], ...spec.chemin.slice(3)];
		expect(labyrintheAnswerVerdict(ecrireChemin(saut), attendue)).toEqual({
			juste: false,
			message: LABYRINTHE_SAUT
		});
	});

	it('passe par un intrus', () => {
		const [debut] = spec.chemin;
		const voisinIntrus = [
			{ ligne: debut.ligne - 1, col: 1 },
			{ ligne: debut.ligne + 1, col: 1 },
			{ ligne: debut.ligne, col: 2 }
		].find(
			(c) =>
				c.ligne >= 1 &&
				c.ligne <= spec.lignes &&
				!spec.chemin.some((p) => p.ligne === c.ligne && p.col === c.col)
		)!;
		expect(labyrintheAnswerVerdict(ecrireChemin([debut, voisinIntrus]), attendue)).toEqual({
			juste: false,
			message: LABYRINTHE_INTRUS
		});
	});

	it('attendue illisible : jamais juste', () => {
		expect(labyrintheAnswerVerdict(ecrireChemin(spec.chemin), 'abc')).toEqual({ juste: false });
	});
});
