/**
 * Calcul aligné : la ligne ajoutée par Cmd+Entrée dans un bloc `$$`.
 *
 * `ajouterLigne` reçoit le LaTeX du bloc avec le marqueur à la place du curseur
 * et rend le LaTeX du calcul aligné, le marqueur à la nouvelle place du curseur.
 */

import { describe, it, expect } from 'vitest';
import {
	ajouterLigne,
	aUneLigneVide,
	retirerLigneVide,
	MARQUEUR_CURSEUR as M
} from '../calcul-aligne';

const aligne = (corps: string) => `\\begin{aligned}${corps}\\end{aligned}`;

describe('ajouterLigne — bloc simple', () => {
	it('coupe sur le = et reprend le = à la ligne suivante', () => {
		expect(ajouterLigne(`A=3+4${M}`)).toBe(aligne(`A&=3+4\\\\&=${M}`));
	});

	it('coupe sur le connecteur logique avant les =', () => {
		expect(ajouterLigne(`x^2-1=0\\iff x^2=1${M}`)).toBe(
			aligne(`x^2-1=0&\\iff x^2=1\\\\&\\iff ${M}`)
		);
	});

	it('reconnaît les autres connecteurs et relations', () => {
		expect(ajouterLigne(`a\\Rightarrow b${M}`)).toBe(
			aligne(`a&\\Rightarrow b\\\\&\\Rightarrow ${M}`)
		);
		expect(ajouterLigne(`2x\\le 4${M}`)).toBe(aligne(`2x&\\le 4\\\\&\\le ${M}`));
		expect(ajouterLigne(`u<v${M}`)).toBe(aligne(`u&<v\\\\&<${M}`));
	});

	it('ignore un = entre accolades ou entre parenthèses', () => {
		expect(ajouterLigne(`\\frac{a=1}{2}+f(x=1)=3${M}`)).toBe(
			aligne(`\\frac{a=1}{2}+f(x=1)&=3\\\\&=${M}`)
		);
		expect(ajouterLigne(`\\left(a=b\\right)=c${M}`)).toBe(
			aligne(`\\left(a=b\\right)&=c\\\\&=${M}`)
		);
	});

	it('ne prend pas \\left pour \\le', () => {
		expect(ajouterLigne(`\\left(x\\right)${M}`)).toBe(aligne(`&\\left(x\\right)\\\\&${M}`));
	});

	it('sans relation : aligné à gauche, nouvelle ligne vide', () => {
		expect(ajouterLigne(`3+4${M}`)).toBe(aligne(`&3+4\\\\&${M}`));
	});

	it('bloc vide : deux lignes vides', () => {
		expect(ajouterLigne(M)).toBe(aligne(`&\\\\&${M}`));
	});

	it('curseur au milieu de la formule : la formule entière reste sur la ligne', () => {
		expect(ajouterLigne(`A=3${M}+4`)).toBe(aligne(`A&=3+4\\\\&=${M}`));
	});
});

describe('ajouterLigne — curseur entre une commande et une lettre (revue #2410)', () => {
	it('garde l’espace : \\alpha x ne devient pas \\alphax', () => {
		expect(ajouterLigne(`A=\\alpha${M} x+1`)).toBe(aligne(`A&=\\alpha x+1\\\\&=${M}`));
	});

	it('idem après un connecteur', () => {
		expect(ajouterLigne(`a\\iff${M} x>0`)).toBe(aligne(`a&\\iff x>0\\\\&\\iff ${M}`));
	});
});

describe('ajouterLigne — intervalle demi-ouvert (revue #2410)', () => {
	it('une ) sans ( ne fait pas perdre la coupure', () => {
		expect(ajouterLigne(`x\\in[0,1)\\iff x<1${M}`)).toBe(
			aligne(`x\\in[0,1)&\\iff x<1\\\\&\\iff ${M}`)
		);
	});

	it('un aligned contenant [0,1) reste reconnu', () => {
		expect(ajouterLigne(aligne(`x&\\in[0,1)${M}`))).toBe(aligne(`x&\\in[0,1)\\\\&${M}`));
	});
});

describe('ajouterLigne — bloc déjà aligné', () => {
	it('ajoute une ligne sous la dernière avec la même relation', () => {
		expect(ajouterLigne(aligne(`A&=3+4\\\\&=7${M}`))).toBe(aligne(`A&=3+4\\\\&=7\\\\&=${M}`));
	});

	it('ajoute la ligne sous celle du curseur, pas à la fin', () => {
		expect(ajouterLigne(aligne(`A&=3+4${M}\\\\&=7`))).toBe(aligne(`A&=3+4\\\\&=${M}\\\\&=7`));
	});

	it('lit la forme sérialisée par MathLive (espaces autour de &)', () => {
		expect(ajouterLigne(`\\begin{aligned}A & =3+4\\\\  & =7${M}\\end{aligned}`)).toBe(
			aligne(`A&=3+4\\\\&=7\\\\&=${M}`)
		);
	});

	it('curseur après l’environnement : ligne ajoutée à la fin', () => {
		expect(ajouterLigne(`${aligne('A&=3+4\\\\&=7')}${M}`)).toBe(aligne(`A&=3+4\\\\&=7\\\\&=${M}`));
	});

	it('reprend le connecteur logique', () => {
		expect(ajouterLigne(aligne(`x^2=1&\\iff x=1\\:\\mathrm{ou}\\:x=-1${M}`))).toBe(
			aligne(`x^2=1&\\iff x=1\\:\\mathrm{ou}\\:x=-1\\\\&\\iff ${M}`)
		);
	});

	it('ligne tapée tout entière à gauche (bouton du menu) : coupée sur sa relation', () => {
		expect(ajouterLigne(aligne(`A=3+4${M}`))).toBe(aligne(`A&=3+4\\\\&=${M}`));
		expect(ajouterLigne(aligne(`A=3+4${M}&`))).toBe(aligne(`A&=3+4\\\\&=${M}`));
	});

	it('respecte un & déplacé à la main', () => {
		expect(ajouterLigne(aligne(`A=3&+4${M}`))).toBe(aligne(`A=3&+4\\\\&${M}`));
	});

	it('laisse intacts les environnements imbriqués', () => {
		const cases = '\\begin{cases}x=1\\\\y=2\\end{cases}';
		expect(ajouterLigne(aligne(`S&=${cases}${M}`))).toBe(aligne(`S&=${cases}\\\\&=${M}`));
	});

	it('garde \\& et \\\\ échappés comme du contenu', () => {
		expect(ajouterLigne(`a\\&b=c${M}`)).toBe(aligne(`a\\&b&=c\\\\&=${M}`));
	});
});

describe('retirerLigneVide', () => {
	it('retire la ligne vide du curseur, curseur en fin de ligne précédente', () => {
		expect(retirerLigneVide(aligne(`A&=3+4\\\\&${M}`))).toBe(aligne(`A&=3+4${M}`));
		expect(retirerLigneVide(aligne(`A&=3+4\\\\${M}&\\\\&=7`))).toBe(aligne(`A&=3+4${M}\\\\&=7`));
	});

	it('première ligne vide : curseur au début de la suivante', () => {
		expect(retirerLigneVide(aligne(`${M}&\\\\A&=3`))).toBe(aligne(`${M}A&=3`));
	});

	it('ne fait rien si la ligne du curseur a du contenu', () => {
		expect(retirerLigneVide(aligne(`A&=3+4\\\\&=${M}`))).toBeNull();
	});

	it('ne retire pas la dernière ligne restante', () => {
		expect(retirerLigneVide(aligne(`&${M}`))).toBeNull();
	});

	it('ne fait rien hors d’un calcul aligné', () => {
		expect(retirerLigneVide(`A=3${M}`)).toBeNull();
	});
});

describe('aUneLigneVide', () => {
	it('repère une ligne vide, espaces de MathLive compris', () => {
		expect(aUneLigneVide('\\begin{aligned}A & =3+4\\\\  & \\end{aligned}')).toBe(true);
		expect(aUneLigneVide('\\begin{aligned}A & =3+4\\\\  & =7\\end{aligned}')).toBe(false);
		expect(aUneLigneVide('A=3+4')).toBe(false);
	});
});
