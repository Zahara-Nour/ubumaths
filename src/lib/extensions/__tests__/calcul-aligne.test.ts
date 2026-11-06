/**
 * Calcul aligné : la ligne ajoutée par Cmd+Entrée dans un bloc `$$`.
 *
 * `ajouterLigne` reçoit le LaTeX du bloc avec le marqueur à la place du curseur
 * et rend le LaTeX du calcul centré (`array{rcl}` : membre de gauche, relation
 * centrée, membre de droite), le marqueur à la nouvelle place du curseur.
 */

import { describe, it, expect } from 'vitest';
import {
	ajouterLigne,
	aRelationARanger,
	aUneLigneVide,
	effacerRelation,
	estCalculCentre,
	rangerRelation,
	relationEnCours,
	retirerLigneVide,
	MARQUEUR_CURSEUR as M
} from '../calcul-aligne';

const aligne = (corps: string) => `\\begin{aligned}${corps}\\end{aligned}`;
const centre = (corps: string) => `\\begin{array}{rcl}${corps}\\end{array}`;

describe('ajouterLigne — bloc simple', () => {
	it('coupe sur le = et reprend le = à la ligne suivante', () => {
		expect(ajouterLigne(`A=3+4${M}`)).toBe(centre(`A&=&3+4\\\\&=&${M}`));
	});

	it('coupe sur le connecteur logique avant les =', () => {
		expect(ajouterLigne(`x^2-1=0\\iff x^2=1${M}`)).toBe(
			centre(`x^2-1=0&\\iff&x^2=1\\\\&\\iff&${M}`)
		);
	});

	it('reconnaît les autres connecteurs et relations', () => {
		expect(ajouterLigne(`a\\Rightarrow b${M}`)).toBe(
			centre(`a&\\Rightarrow&b\\\\&\\Rightarrow&${M}`)
		);
		expect(ajouterLigne(`2x\\le 4${M}`)).toBe(centre(`2x&\\le&4\\\\&\\le&${M}`));
		expect(ajouterLigne(`u<v${M}`)).toBe(centre(`u&<&v\\\\&<&${M}`));
	});

	it('ignore un = entre accolades ou entre parenthèses', () => {
		expect(ajouterLigne(`\\frac{a=1}{2}+f(x=1)=3${M}`)).toBe(
			centre(`\\frac{a=1}{2}+f(x=1)&=&3\\\\&=&${M}`)
		);
		expect(ajouterLigne(`\\left(a=b\\right)=c${M}`)).toBe(
			centre(`\\left(a=b\\right)&=&c\\\\&=&${M}`)
		);
	});

	it('ne prend pas \\left pour \\le', () => {
		expect(ajouterLigne(`\\left(x\\right)${M}`)).toBe(centre(`&&\\left(x\\right)\\\\&&${M}`));
	});

	it('sans relation : aligné à gauche, nouvelle ligne vide', () => {
		expect(ajouterLigne(`3+4${M}`)).toBe(centre(`&&3+4\\\\&&${M}`));
	});

	it('bloc vide : deux lignes vides', () => {
		expect(ajouterLigne(M)).toBe(centre(`&&\\\\&&${M}`));
	});

	it('curseur au milieu de la formule : la formule entière reste sur la ligne', () => {
		expect(ajouterLigne(`A=3${M}+4`)).toBe(centre(`A&=&3+4\\\\&=&${M}`));
	});
});

describe('ajouterLigne — curseur entre une commande et une lettre (revue #2410)', () => {
	it('garde l’espace : \\alpha x ne devient pas \\alphax', () => {
		expect(ajouterLigne(`A=\\alpha${M} x+1`)).toBe(centre(`A&=&\\alpha x+1\\\\&=&${M}`));
	});

	it('idem après un connecteur', () => {
		expect(ajouterLigne(`a\\iff${M} x>0`)).toBe(centre(`a&\\iff&x>0\\\\&\\iff&${M}`));
	});
});

describe('ajouterLigne — intervalle demi-ouvert (revue #2410)', () => {
	it('une ) sans ( ne fait pas perdre la coupure', () => {
		expect(ajouterLigne(`x\\in[0,1)\\iff x<1${M}`)).toBe(
			centre(`x\\in[0,1)&\\iff&x<1\\\\&\\iff&${M}`)
		);
	});

	it('un aligned contenant [0,1) reste reconnu', () => {
		expect(ajouterLigne(aligne(`x&\\in[0,1)${M}`))).toBe(centre(`x&&\\in[0,1)\\\\&&${M}`));
	});
});

describe('ajouterLigne — bloc aligned existant : converti en calcul centré', () => {
	it('ajoute une ligne sous la dernière avec la même relation', () => {
		expect(ajouterLigne(aligne(`A&=3+4\\\\&=7${M}`))).toBe(centre(`A&=&3+4\\\\&=&7\\\\&=&${M}`));
	});

	it('ajoute la ligne sous celle du curseur, pas à la fin', () => {
		expect(ajouterLigne(aligne(`A&=3+4${M}\\\\&=7`))).toBe(centre(`A&=&3+4\\\\&=&${M}\\\\&=&7`));
	});

	it('lit la forme sérialisée par MathLive (espaces autour de &)', () => {
		expect(ajouterLigne(`\\begin{aligned}A & =3+4\\\\  & =7${M}\\end{aligned}`)).toBe(
			centre(`A&=&3+4\\\\&=&7\\\\&=&${M}`)
		);
	});

	it('curseur après l’environnement : ligne ajoutée à la fin', () => {
		expect(ajouterLigne(`${aligne('A&=3+4\\\\&=7')}${M}`)).toBe(
			centre(`A&=&3+4\\\\&=&7\\\\&=&${M}`)
		);
	});

	it('reprend le connecteur logique', () => {
		expect(ajouterLigne(aligne(`x^2=1&\\iff x=1\\:\\mathrm{ou}\\:x=-1${M}`))).toBe(
			centre(`x^2=1&\\iff&x=1\\:\\mathrm{ou}\\:x=-1\\\\&\\iff&${M}`)
		);
	});

	it('ligne tapée tout entière à gauche : coupée sur sa relation', () => {
		expect(ajouterLigne(aligne(`A=3+4${M}`))).toBe(centre(`A&=&3+4\\\\&=&${M}`));
		expect(ajouterLigne(aligne(`A=3+4${M}&`))).toBe(centre(`A&=&3+4\\\\&=&${M}`));
	});

	it('respecte un & déplacé à la main', () => {
		expect(ajouterLigne(aligne(`A=3&+4${M}`))).toBe(centre(`A=3&&+4\\\\&&${M}`));
	});

	it('a &\\iff& b : les & suivants ne sont que des points d’alignement', () => {
		expect(ajouterLigne(aligne(`a&\\iff&b${M}`))).toBe(centre(`a&\\iff&b\\\\&\\iff&${M}`));
	});

	it('laisse intacts les environnements imbriqués', () => {
		const cases = '\\begin{cases}x=1\\\\y=2\\end{cases}';
		expect(ajouterLigne(aligne(`S&=${cases}${M}`))).toBe(centre(`S&=&${cases}\\\\&=&${M}`));
	});

	it('garde \\& et \\\\ échappés comme du contenu', () => {
		expect(ajouterLigne(`a\\&b=c${M}`)).toBe(centre(`a\\&b&=&c\\\\&=&${M}`));
	});
});

describe('ajouterLigne — bloc déjà centré', () => {
	it('ajoute une ligne avec la même relation', () => {
		expect(ajouterLigne(centre(`A&=&3+4\\\\&=&7${M}`))).toBe(centre(`A&=&3+4\\\\&=&7\\\\&=&${M}`));
	});

	it('lit la forme sérialisée par MathLive', () => {
		expect(ajouterLigne(`\\begin{array}{rcl}A & = & 3+4\\\\  & = & 7${M}\\end{array}`)).toBe(
			centre(`A&=&3+4\\\\&=&7\\\\&=&${M}`)
		);
	});

	it('relation changée dans la colonne de droite : rangée au milieu, reprise', () => {
		expect(ajouterLigne(centre(`n=1&\\iff&n+1=2\\\\&&\\Rightarrow n=0${M}`))).toBe(
			centre(`n=1&\\iff&n+1=2\\\\&\\Rightarrow&n=0\\\\&\\Rightarrow&${M}`)
		);
	});

	it('suite écrite dans la colonne du milieu : renvoyée à droite', () => {
		expect(ajouterLigne(centre(`n=1&\\iff&n+1=2\\\\&\\Rightarrow n=0${M}&`))).toBe(
			centre(`n=1&\\iff&n+1=2\\\\&\\Rightarrow&n=0\\\\&\\Rightarrow&${M}`)
		);
	});

	it('première ligne du bouton, tapée d’un bloc : coupée sur sa relation', () => {
		expect(ajouterLigne(centre(`A=3+4${M}`))).toBe(centre(`A&=&3+4\\\\&=&${M}`));
	});

	it('n’accepte pas un autre tableau que rcl', () => {
		const tableau = '\\begin{array}{cc}a&b\\end{array}';
		expect(ajouterLigne(`${tableau}${M}`)).toBe(centre(`&&${tableau}\\\\&&${M}`));
	});
});

describe('retirerLigneVide', () => {
	it('retire la ligne vide du curseur, curseur en fin de ligne précédente', () => {
		expect(retirerLigneVide(aligne(`A&=3+4\\\\&${M}`))).toBe(aligne(`A&=3+4${M}`));
		expect(retirerLigneVide(aligne(`A&=3+4\\\\${M}&\\\\&=7`))).toBe(aligne(`A&=3+4${M}\\\\&=7`));
	});

	it('calcul centré : reste centré', () => {
		expect(retirerLigneVide(centre(`A&=&3+4\\\\&&${M}`))).toBe(centre(`A&=&3+4${M}`));
	});

	it('première ligne vide : curseur au début de la suivante', () => {
		expect(retirerLigneVide(aligne(`${M}&\\\\A&=3`))).toBe(aligne(`${M}A&=3`));
	});

	it('ne fait rien si la ligne du curseur a du contenu', () => {
		expect(retirerLigneVide(aligne(`A&=3+4\\\\&=${M}`))).toBeNull();
		expect(retirerLigneVide(centre(`A&=&3+4\\\\&=&${M}`))).toBeNull();
	});

	it('ne retire pas la dernière ligne restante', () => {
		expect(retirerLigneVide(aligne(`&${M}`))).toBeNull();
	});

	it('ne fait rien hors d’un calcul aligné', () => {
		expect(retirerLigneVide(`A=3${M}`)).toBeNull();
	});
});

describe('effacerRelation — Retour arrière au début de la colonne de droite', () => {
	it('efface la relation, le curseur reste à droite', () => {
		expect(effacerRelation(centre(`n=1&\\iff&n+1=2\\\\&\\iff&${M}`))).toBe(
			centre(`n=1&\\iff&n+1=2\\\\&&${M}`)
		);
	});

	it('lit la forme sérialisée par MathLive', () => {
		expect(
			effacerRelation(`\\begin{array}{rcl}n=1 & \\iff & n+1=2\\\\  & \\iff & ${M}\\end{array}`)
		).toBe(centre(`n=1&\\iff&n+1=2\\\\&&${M}`));
	});

	it('aussi quand la droite a déjà du contenu après le curseur', () => {
		expect(effacerRelation(centre(`A&=&3\\\\&=&${M}7`))).toBe(centre(`A&=&3\\\\&&${M}7`));
	});

	it('ne fait rien ailleurs qu’au début de la colonne de droite', () => {
		expect(effacerRelation(centre(`n=1&\\iff&n+${M}1=2`))).toBeNull();
		expect(effacerRelation(centre(`A&=&3\\\\&&${M}`))).toBeNull();
		expect(effacerRelation(aligne(`A&=3\\\\&=${M}`))).toBeNull();
	});
});

describe('rangerRelation — relation tapée en tête de la colonne de droite', () => {
	it('rangée au milieu dès que la suite s’écrit', () => {
		expect(rangerRelation(centre(`n=1&\\iff&n+1=2\\\\&&\\Rightarrow n${M}`))).toBe(
			centre(`n=1&\\iff&n+1=2\\\\&\\Rightarrow&n${M}`)
		);
	});

	it('pas tant que la relation est seule (raccourci <=> en cours)', () => {
		expect(rangerRelation(centre(`A&=&3\\\\&&<${M}`))).toBeNull();
		expect(rangerRelation(centre(`A&=&3\\\\&&\\le${M}`))).toBeNull();
	});

	it('pas quand le milieu a déjà sa relation', () => {
		expect(rangerRelation(centre(`A&=&3\\\\&=&=7${M}`))).toBeNull();
	});

	it('aRelationARanger : test rapide, sans curseur', () => {
		expect(
			aRelationARanger(
				'\\begin{array}{rcl}n=1 & \\iff & n+1=2\\\\  &  & \\Rightarrow n\\end{array}'
			)
		).toBe(true);
		expect(aRelationARanger(centre('A&=&3\\\\&&\\Rightarrow'))).toBe(false);
		expect(aRelationARanger(aligne('A&=3\\\\&\\Rightarrow n'))).toBe(false);
	});
});

describe('aUneLigneVide', () => {
	it('repère une ligne vide, espaces de MathLive compris', () => {
		expect(aUneLigneVide('\\begin{aligned}A & =3+4\\\\  & \\end{aligned}')).toBe(true);
		expect(aUneLigneVide('\\begin{aligned}A & =3+4\\\\  & =7\\end{aligned}')).toBe(false);
		expect(aUneLigneVide('\\begin{array}{rcl}A & = & 3\\\\  &  & \\end{array}')).toBe(true);
		expect(aUneLigneVide('A=3+4')).toBe(false);
	});
});

describe('estCalculCentre', () => {
	it('reconnaît un array{rcl}, et lui seul', () => {
		expect(estCalculCentre('\\begin{array}{rcl}A & = & 3\\end{array}')).toBe(true);
		expect(estCalculCentre(aligne('A&=3'))).toBe(false);
		expect(estCalculCentre('\\begin{array}{cc}a&b\\end{array}')).toBe(false);
	});
});

describe('revue #2422', () => {
	it('relation hors des listes déjà au milieu : gardée, et reprise', () => {
		expect(ajouterLigne(centre(`A&\\subset&B${M}`))).toBe(centre(`A&\\subset&B\\\\&\\subset&${M}`));
		expect(ajouterLigne(centre(`x&\\in&E\\\\&\\equiv&F${M}`))).toBe(
			centre(`x&\\in&E\\\\&\\equiv&F\\\\&\\equiv&${M}`)
		);
	});

	it('\\left(0;1\\right] ne fait pas perdre la coupure', () => {
		expect(ajouterLigne(`x\\in\\left(0;1\\right]\\iff x>0${M}`)).toBe(
			centre(`x\\in\\left(0;1\\right]&\\iff&x>0\\\\&\\iff&${M}`)
		);
	});

	it('relation retapée devant une suite, curseur collé derrière : pas rangée', () => {
		expect(rangerRelation(centre(`A&=&3\\\\&&=${M}x=3`))).toBeNull();
		expect(rangerRelation(centre(`A&=&3\\\\&&\\Rightarrow${M} x=3`))).toBeNull();
	});

	it('au repos (champ quitté) : rangée, même seule', () => {
		expect(rangerRelation(centre('A&=&3\\\\&&\\Rightarrow x=3'), true)).toBe(
			centre('A&=&3\\\\&\\Rightarrow&x=3')
		);
		expect(rangerRelation(centre('A&=&3\\\\&&\\Rightarrow'), true)).toBe(
			centre('A&=&3\\\\&\\Rightarrow&')
		);
		expect(aRelationARanger(centre('A&=&3\\\\&&\\Rightarrow'), true)).toBe(true);
		expect(rangerRelation(centre('A&=&3\\\\&=&7'), true)).toBeNull();
	});

	it('relationEnCours : un atome qui peut encore devenir une autre relation', () => {
		expect(relationEnCours('=')).toBe(true);
		expect(relationEnCours('<')).toBe(true);
		expect(relationEnCours('\\le')).toBe(true);
		expect(relationEnCours('\\Rightarrow')).toBe(true);
		expect(relationEnCours('!')).toBe(true);
		expect(relationEnCours('n')).toBe(false);
		expect(relationEnCours('')).toBe(false);
	});
});
