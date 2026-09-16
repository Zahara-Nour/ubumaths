/**
 * La vue Calcul, vue depuis l'écran.
 *
 * Le parcours que le lot promet : je définis une fonction, je l'évalue sans la
 * redéclarer, je garde un résultat sous un nom, et je le retrouve dans « Mes
 * objets ».
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

/** Laisser Svelte appliquer ses effets ET le DOM se mettre à jour. */
async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	await tick();
}

function open(atelier = new Atelier()) {
	const view = render(AtelierContainer, { atelier, ephemeral: true });
	const field = view.container.querySelector('input[type="text"]') as HTMLInputElement;
	const form = view.container.querySelector('form') as HTMLFormElement;

	async function type(text: string) {
		field.value = text;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
	}

	async function submit(text: string) {
		await type(text);
		form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
		await settle();
	}

	return { ...view, atelier, field, type, submit };
}

describe('le parcours de la vue Calcul', () => {
	it('ouvre sur un champ de saisie', () => {
		const { field } = open();

		expect(field).toBeTruthy();
		expect(field.getAttribute('aria-label')).toContain('Calcul');
	});

	it('crée un objet quand on écrit une définition', async () => {
		const { atelier, submit, container } = open();

		await submit('f(x) = x^2 - 3x + 1');

		expect(atelier.names).toEqual(['f']);
		// Et « Mes objets » le montre, sans que l'élève change de vue
		expect(container.textContent).toContain('f');
	});

	// LE point du lot : l'élève ne redéclare rien
	it('évalue une fonction du panneau sans la redéclarer', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' });
		const { submit, container } = open(atelier);

		await submit('f(2)');

		// ⚠️ MathLive compose un vrai signe moins (U+2212), pas le tiret ASCII :
		// chercher « -1 » ferait échouer un rendu pourtant correct.
		expect(container.querySelector('.historique')?.textContent).toMatch(/[-\u2212]1/);
	});

	it('rend une fraction en mathématiques, pas en texte brut', async () => {
		const { submit, container } = open();

		await submit('1/3 + 1/6');

		// MathLive compose la fraction : le texte brut « 1/2 » ne suffirait pas
		expect(container.querySelector('.math')).toBeTruthy();
	});

	it('garde un résultat sous un nom proposé', async () => {
		const { atelier, submit, container } = open();
		await submit('1/3 + 1/6');

		const garder = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Garder')
		) as HTMLButtonElement;
		garder.click();
		await settle();

		expect(atelier.names.length).toBe(1);
		// ⚠️ `.retour`, pas `.avis` : le conteneur a sa propre région aria-live, et
		// interroger « .avis » lisait la sienne — vide — en croyant lire celle-ci.
		expect(container.querySelector('.retour')?.textContent).toContain('Gardé');
	});

	it('dit pourquoi quand une saisie est refusée', async () => {
		const { atelier, submit, container } = open();

		await submit('x = 3');

		expect(atelier.names).toEqual([]);
		expect(container.querySelector('.refus')).toBeTruthy();
	});
});

describe('les commandes se découvrent', () => {
	it('propose les commandes dès le point', async () => {
		const { type, container } = open();

		await type('.');

		const liste = container.querySelector('.commandes');
		expect(liste).toBeTruthy();
		// Bien plus que les 8 écrites en dur dans /calc
		expect(liste!.querySelectorAll('button').length).toBeGreaterThan(4);
	});

	it('filtre sur ce qui est tapé', async () => {
		const { type, container } = open();

		await type('.dér');

		const noms = [...container.querySelectorAll('.commandes .nom')].map((n) => n.textContent);
		expect(noms.some((n) => n?.includes('dériver'))).toBe(true);
	});

	it('décrit les commandes en français', async () => {
		const { type, container } = open();

		await type('.dér');

		expect(container.querySelector('.commandes .quoi')?.textContent).toContain('Dériver');
	});

	// ⚠️ `.taylor` est cassée dans l'interface web : visible et DÉSACTIVÉE avec
	// sa raison, jamais cachée — sinon l'élève conclut que l'outil ne sait pas.
	it('désactive une commande indisponible sans la cacher', async () => {
		const { type, container } = open();

		await type('.tay');

		const bouton = container.querySelector('.commandes button') as HTMLButtonElement;
		expect(bouton.disabled).toBe(true);
		expect(bouton.textContent).toContain('ne fonctionne pas encore');
	});

	it('ne propose plus rien une fois la commande choisie', async () => {
		const { type, container } = open();

		await type('.dériver x^2');

		expect(container.querySelector('.commandes')).toBeNull();
	});
});
