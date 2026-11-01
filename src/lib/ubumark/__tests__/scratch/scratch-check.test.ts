/**
 * Bloc ```scratch — vérification des instructions (chantier `bloc-scratch`)
 *
 * `checkScratchProgram` lit le programme avec `scratchblocks`, en FRANÇAIS
 * seulement (décision du 2026-11-01) : une instruction inconnue donne un
 * message situé à l'auteur, jamais un dessin faux sans le dire.
 */

import { describe, it, expect } from 'vitest';
import { checkScratchProgram } from '$lib/ubumark/utils/scratch-check';

const messages = (source: string) => checkScratchProgram(source).map((e) => e.message);

describe('programmes justes : aucun message', () => {
	it.each([
		[
			'reste par soustractions successives (exemples 2026, p. 49)',
			[
				'quand le drapeau vert pressé',
				'demander [Quel est le nombre à diviser ?] et attendre',
				'mettre [reste v] à (réponse)',
				'demander [Quel est le diviseur ?] et attendre',
				"répéter jusqu'à ce que <(reste) < (réponse)>",
				'mettre [reste v] à ((reste) - (réponse))',
				'fin',
				'dire (reste)'
			]
		],
		[
			'conditions composées et sinon',
			[
				'si <<(âge) > [11]> et <(taille) > [140]>> alors',
				'dire [Tu peux monter]',
				'sinon',
				'dire [Pas encore]',
				'fin',
				'si <<(x) < [3]> ou <(x) > [8]>> alors',
				'dire [dehors]',
				'fin'
			]
		],
		[
			'plusieurs variables',
			[
				'mettre [a v] à (5)',
				'mettre [b v] à (3)',
				'mettre [a v] à ((a) + (b))',
				'ajouter (1) à [b v]'
			]
		],
		[
			'bloc personnalisé défini dans le même bloc',
			[
				'définir dessine carré (côté)',
				'répéter (4) fois',
				'avancer de (côté) pas',
				'tourner ↻ de (90) degrés',
				'fin',
				'',
				'quand le drapeau vert pressé',
				'mettre [i v] à (0)',
				"répéter jusqu'à ce que <(i) > [50]>",
				'ajouter (5) à [i v]',
				'dessine carré (i)',
				'fin'
			]
		]
	])('%s', (_, lines) => {
		expect(messages(lines.join('\n'))).toEqual([]);
	});
});

describe('erreurs de l’auteur, situées', () => {
	it('instruction inconnue : sa ligne et son texte', () => {
		expect(messages('dire [Bonjour]\nfaire un truc bizarre\ndire [Fin]')).toEqual([
			'Ligne 2 : instruction « faire un truc bizarre » non reconnue'
		]);
	});

	it('anglais refusé (un auteur écrit en français)', () => {
		expect(messages('when flag clicked\nsay [Hello]')).toEqual([
			'Ligne 1 : instruction « when flag clicked » non reconnue',
			'Ligne 2 : instruction « say [Hello] » non reconnue'
		]);
	});

	it('bloc personnalisé appelé sans être défini', () => {
		expect(messages('dessine carré (10)')).toEqual([
			'Ligne 1 : instruction « dessine carré (10) » non reconnue'
		]);
	});

	it('fin ou sinon en trop', () => {
		expect(messages('répéter (3) fois\ndire [a]\nfin\nfin')).toEqual([
			'Ligne 4 : « fin » en trop (aucune boucle ni « si » à fermer)'
		]);
		expect(messages('dire [a]\nsinon\ndire [b]')).toEqual([
			'Ligne 2 : « sinon » sans « si … alors » au-dessus'
		]);
	});

	it('après un si … sinon … fin, et après une boucle vide : les bonnes lignes', () => {
		expect(messages('si <(a) > [1]> alors\ndire [x]\nsinon\nbof\nfin\n\nbof bis')).toEqual([
			'Ligne 4 : instruction « bof » non reconnue',
			'Ligne 7 : instruction « bof bis » non reconnue'
		]);
		expect(messages('répéter (2) fois\nfin\nbof')).toEqual([
			'Ligne 3 : instruction « bof » non reconnue'
		]);
	});

	it('commentaires // et majuscules à Fin / Sinon : les lignes restent justes (revue #2122)', () => {
		expect(messages('quand le drapeau vert pressé\n// un commentaire\nbidule\ndire (a)')).toEqual([
			'Ligne 3 : instruction « bidule » non reconnue'
		]);
		expect(messages('répéter (10) fois\nFin\nbidule')).toEqual([
			'Ligne 3 : instruction « bidule » non reconnue'
		]);
		expect(
			messages('si <(a) > [1]> alors\ndire [x]\nSinon // autrement\nbof\nFIN\nbof bis')
		).toEqual([
			'Ligne 4 : instruction « bof » non reconnue',
			'Ligne 6 : instruction « bof bis » non reconnue'
		]);
	});

	it('instruction inconnue dans une boucle : la bonne ligne', () => {
		expect(messages('répéter (3) fois\ndire [a]\nsauter très haut\nfin')).toEqual([
			'Ligne 3 : instruction « sauter très haut » non reconnue'
		]);
	});
});
