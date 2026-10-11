# Bouton retour — uniformisation

Chantier ouvert le 2026-10-11. Règle : [composants-ui.md § BackLink](../pratiques/composants-ui.md#backlink--bouton-retour-obligatoire).

## Décisions de David (2026-10-11)

1. Le bouton mène à la **page parente, lue dans l'adresse** — jamais l'historique (l'hybride « page d'avant si elle est sur le site » a été écarté).
2. Position : **au-dessus du titre**, lien avec texte (pas de flèche seule à gauche du titre).
3. Page en pleine activité : **« Quitter »**, destination = page parente.
4. Fil d'Ariane : arborescences de plus de deux niveaux seulement, jamais avec un bouton retour.
5. Périmètre : **tout convertir**, une PR par espace.

## État des lieux (2026-10-11)

~110 boutons retour (heuristique : flèche ou ← près de « Retour », d'un lien ou d'une navigation) :
77 icône + texte, 33 icône seule ; 59 liens `href`, 50 `goto()` au clic, 2 `history.back()` ;
46 au-dessus du titre, 32 à gauche du titre, 32 ailleurs (fins de parcours, fenêtres).

## Lots

| Lot | Périmètre                                                                                          | Branche / PR             | État     |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------ | -------- |
| 1   | `BackLink` + règle + espace prof (`dashboard/teacher/**`)                                          | `refactor/bouton-retour` | en cours |
| 2   | Espace élève (`dashboard/student/**`, `dashboard/revisions/**`, `dashboard/navadra/**`)            | —                        | à faire  |
| 3   | Admin + pages protégées hors dashboard (messages, notebooks, constructions, tableur, organisation) | —                        | à faire  |
| 4   | Pages publiques + composants partagés (`components/test/`, `srs/`, `student/worksheets/`)          | —                        | à faire  |

## Cas douteux à soumettre à David

(aucun pour l'instant)
