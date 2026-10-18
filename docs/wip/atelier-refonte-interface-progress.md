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

## Lot 2 — console déroulante

Branche `feat/atelier-console-deroulante`, partie d'origin/main après #1482 (onglet Géométrie).

- [x] `console-key.ts` (module pur) : touche sous Échap par `event.code` (Mac : `IntlBackslash` ou `Backquote` ; ailleurs `Backquote`), sans effet dans un champ ; Ctrl+Entrée partout (pas Cmd, pas avec Maj / Alt). Tests : `console-key.test.ts` (13, rouges d'abord).
- [x] Plus d'onglet Calcul : Graphe · Géométrie · Données. Volet « Console » par-dessus la vue (région nommée, non modale, `inert` fermée, montée en permanence), ~40 %, poignée (souris + flèches), toute la scène sous 640 px. Bouton « Console » dans la barre (groupe de droite, avant Partager), `aria-expanded`, infobulle avec les deux raccourcis, compteur A3. Tests : `console-deroulante.svelte.test.ts` (14, rouges d'abord).
- [x] Lisibilité : invite `>` (hors du paragraphe de la saisie, qui décrit les étapes), `-->` devant la réponse (`aria-hidden`), commande en texte en chasse fixe, « f est correctement défini » avec le nom en couleur (`definedName`, `desk.svelte.ts`), boutons de ligne au survol / focus / toujours au toucher. Couleur d'accent : `#b25f00` en clair (4,6:1), `#ffc400` en sombre — pas `--color-primary` (2,3:1).
- [x] Export ubumark dans le menu « ⋮ » de la console (copier ou télécharger) ; le lien sous l'historique est retiré.
- [x] `FigureView` : « Dans la console, écris… ».

Règles de bascule relues (toutes dans `AtelierContainer.svelte`) :

| Règle                                                           | Avant                                    | Après                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Vue de départ                                                   | Calcul                                   | Graphe ; console ouverte sauf vue demandée (`/grapheur` : fermée) ; prop `consoleAtStart` pour forcer |
| G7 : une action écrit sa ligne                                  | dans Calcul, sans y aller                | dans la console, sans l'ouvrir                                                                        |
| A3 : repère d'un résultat qui attend                            | nombre sur l'onglet Calcul               | nombre sur le bouton Console ; `seen` mis à jour à l'ouverture et à la fermeture                      |
| Annonce d'une ligne hors de vue                                 | « Nouvelle ligne dans l'onglet Calcul. » | « Nouvelle ligne dans la console. » (console fermée seulement)                                        |
| Commande préparée (`needs-argument`)                            | bascule sur Calcul                       | ouvre la console, focus au champ                                                                      |
| A5 : Tracer, nuage, diagramme, Tabuler, Afficher dans Géométrie | change de vue                            | change de vue (`revealView`) ; sous 640 px, referme aussi la console qui couvrirait tout              |
| Échap                                                           | —                                        | dans la console : la ferme (une liste de propositions ouverte le garde pour elle)                     |

Choix faits en codant (à signaler à David) :

- Le bouton Console est dans le groupe de DROITE (Console, Partager, Réglages) : ce n'est pas une action sur le fichier.
- Les tests qui cliquaient l'onglet Calcul ouvrent maintenant la console (ou lisent son historique, monté en permanence) ; ceux qui voulaient « sur le Graphe, console fermée » montent l'atelier avec `view: 'graphe'`.

## Lots suivants

Lot 3 (cartes de fonction), lot 4 (autres objets), lot 5 (annuler / rétablir) : pas commencés.
