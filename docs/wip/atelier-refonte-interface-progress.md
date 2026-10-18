# Atelier — refonte de l'interface : journal

Phase 0 : `docs/wip/atelier-refonte-interface-phase0.md` (validée par David le 2026-10-18, deux passes).

## Lot 1 — barre d'icônes, Enregistrer / Charger

Branche `feat/atelier-barre-icones`.

- [x] Module pur `atelier-file.ts` : fichier `.atelier.json` = état complet (`persistence.ts`) + historique de la console ; relecture bornée et validée (Zod), ancien JSON « pour rejouer » accepté. Tests : `atelier-fichier.test.ts`.
- [x] Barre d'icônes : Repartir de zéro, Charger, Enregistrer à gauche ; Partager, Réglages à droite. Icônes seules, infobulle (`title`, comme la mise en forme du tableur) et `aria-label`. Pas d'Annuler / Rétablir (lot 5). Tests : `barre-icones.svelte.test.ts` (11 rouges sur l'ancien conteneur).
- [x] Barre « Exporter l'historique » retirée de la vue Calcul ; l'export ubumark reste, en lien discret (le lot 2 le range dans le menu de la console).
- [x] Doc système (`docs/systeme/atelier.md`), vérification manuelle notée.

Choix faits en codant (à signaler à David) :

- Charger est absent d'un atelier reçu par lien, comme Repartir de zéro : on y regarde l'atelier d'un autre. Enregistrer y reste.
- Un fichier refusé se dit dans la zone des avis de l'atelier (lue à voix haute), pas dans un toast qui disparaît.

## Lots suivants

Lot 2 (console déroulante), lot 3 (cartes de fonction), lot 4 (autres objets), lot 5 (annuler / rétablir) : pas commencés.
