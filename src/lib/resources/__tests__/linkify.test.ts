/**
 * Tests — transformation des références en liens dans du HTML.
 *
 * Le sujet réel : le cahier de texte stocke du HTML, pas de l'ubumark. Ces tests
 * fixent ce que l'élève voit, y compris quand la ressource n'a pas de page pour
 * lui.
 */

import { describe, it, expect } from 'vitest';
import { linkifyResourceReferences } from '../linkify';

const UUID = '3f2a1b4c-5d6e-4f7a-8b9c-0d1e2f3a4b5c';

describe('linkifyResourceReferences', () => {
	it('laisse le HTML intact quand il ne contient aucune référence', () => {
		const html = '<p>Exercices 3 et 5, page 42.</p>';
		expect(linkifyResourceReferences(html, { role: 'student' })).toBe(html);
	});

	it('transforme un exercice en lien vers la page élève', () => {
		const html = `<p>Faire [[exercise:${UUID}|Fractions]] pour demain.</p>`;
		const out = linkifyResourceReferences(html, { role: 'student' });

		expect(out).toContain(`href="/dashboard/student/exercises/${UUID}"`);
		expect(out).toContain('>Fractions</a>');
		expect(out).not.toContain('[[');
	});

	it('mène un exercice de fiche vers la résolution élève, pas vers la fiche', () => {
		const html = `<p>[[worksheet_exercise:${UUID}|Exercice 3 — Fiche : Dérivées]]</p>`;
		const out = linkifyResourceReferences(html, { role: 'student' });

		// L'élève n'atteint pas une fiche mais la distribution qui le concerne :
		// c'est la route de résolution qui fait cette traduction.
		expect(out).toContain(`href="/dashboard/student/worksheets/exercice/${UUID}"`);
		expect(out).toContain('Exercice 3 — Fiche : Dérivées');
	});

	it('conduit le professeur vers sa propre route', () => {
		const html = `<p>[[worksheet_exercise:${UUID}|Exercice 3]]</p>`;
		const out = linkifyResourceReferences(html, { role: 'teacher' });

		expect(out).toContain(`href="/dashboard/teacher/contenu/worksheets/exercice/${UUID}"`);
	});

	it('rend le libellé lisible, en inerte, quand le lecteur n’a pas de page', () => {
		// Un document n'a aucune page de détail : le lien n'existe pour personne.
		const html = `<p>Voir [[document:${UUID}|Le cours]].</p>`;
		const out = linkifyResourceReferences(html, { role: 'student' });

		expect(out).not.toContain('<a ');
		expect(out).toContain('Le cours');
		expect(out).toContain('non consultable ici');
	});

	it('ignore un type inconnu plutôt que de le masquer', () => {
		const html = `<p>[[licorne:${UUID}|Rien]]</p>`;
		expect(linkifyResourceReferences(html, { role: 'student' })).toBe(html);
	});

	it('ne transforme pas une référence écrite dans un attribut', () => {
		// Sans découpage balise/texte, le `<a>` produit serait inséré AU MILIEU de
		// la balise ouvrante, ce qui casse le document.
		const html = `<p title="[[exercise:${UUID}|Piège]]">Texte</p>`;
		expect(linkifyResourceReferences(html, { role: 'student' })).toBe(html);
	});

	it('transforme plusieurs références dans le même paragraphe', () => {
		const html = `<p>[[exercise:${UUID}|Un]] puis [[exercise:${UUID}|Deux]]</p>`;
		const out = linkifyResourceReferences(html, { role: 'student' });

		expect(out.match(/<a /g)).toHaveLength(2);
	});

	it('ne ré-échappe pas un libellé déjà échappé', () => {
		// Le HTML stocké a déjà traversé l'assainisseur : « & » y est « &amp; ».
		const html = `<p>[[exercise:${UUID}|Aires &amp; volumes]]</p>`;
		const out = linkifyResourceReferences(html, { role: 'student' });

		expect(out).toContain('Aires &amp; volumes');
		expect(out).not.toContain('&amp;amp;');
	});

	it("ne s'échappe pas d'une valeur d'attribut contenant un « > »", () => {
		// La sérialisation HTML n'échappe QUE `&` et `"` dans un attribut : le `>`
		// y survit littéralement. Un découpage `/(<[^>]*>)/` naïf coupait donc la
		// balise en plein `title`, et injectait le `<a>` À L'INTÉRIEUR de la valeur
		// — attribut refermé trop tôt, classe du `<p>` écrasée, texte qui fuit.
		const html = `<p title="a>[[exercise:${UUID}|X]]">bonjour</p>`;

		expect(linkifyResourceReferences(html, { role: 'student' })).toBe(html);
	});

	it("n'injecte rien quand un libellé contient une balise littérale", () => {
		// Deux défenses qui se croisent : le découpage voit `<img src=x>` comme une
		// balise, donc la référence est coupée en deux et n'est PAS reconnue. Elle
		// reste du texte tel quel — c'est laid, mais rien n'est injecté.
		const html = `<p>[[exercise:${UUID}|<img src=x>]]</p>`;

		expect(linkifyResourceReferences(html, { role: 'student' })).toBe(html);
	});

	it('échappe les guillemets et chevrons du libellé', () => {
		// Un `"` ne coupe pas le découpage : il atteint donc bien le libellé, et
		// c'est l'échappement qui l'empêche de sortir d'un attribut le jour où le
		// libellé en garnirait un.
		const html = `<p>[[exercise:${UUID}|Dire " et > ]]</p>`;
		const out = linkifyResourceReferences(html, { role: 'student' });

		expect(out).toContain('Dire &quot; et &gt;');
	});

	it('refuse un classId qui n’est pas un uuid plutôt que de le mettre dans une URL', () => {
		// `resolve()` substitue les paramètres VERBATIM, sans encodage.
		const html = `<p>[[chapter:${UUID}|Le chapitre]]</p>`;
		const out = linkifyResourceReferences(html, {
			role: 'teacher',
			classId: '" onload="alert(1)'
		});

		expect(out).not.toContain('onload');
		// Sans classe utilisable, la route prof n'existe pas : texte inerte.
		expect(out).not.toContain('<a ');
		expect(out).toContain('Le chapitre');
	});

	it('accepte un classId bien formé', () => {
		const classId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
		const html = `<p>[[chapter:${UUID}|Le chapitre]]</p>`;
		const out = linkifyResourceReferences(html, { role: 'teacher', classId });

		expect(out).toContain(`href="/dashboard/teacher/cours/${classId}/${UUID}"`);
	});

	it('accepte un uuid en majuscules', () => {
		const html = `<p>[[EXERCISE:${UUID.toUpperCase()}|Titre]]</p>`;
		const out = linkifyResourceReferences(html, { role: 'student' });

		expect(out).toContain(`href="/dashboard/student/exercises/${UUID}"`);
	});
});
