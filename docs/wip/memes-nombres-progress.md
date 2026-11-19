# Chantier `memes-nombres` — « Mêmes nombres pour tous » sur un lien de série

Proposition 5 du chantier `inspiration` (docs/wip/inspiration-progress.md, décisions du 2026-11-18).

## Reprendre ici

_Mis à jour le 2026-11-19, ouverture du chantier._

- **État** : phase 0 écrite (ci-dessous), rien de codé.
- **Prochaine action** : validation de la phase 0 par David, puis tests rouges → code.
- **En attente de David** : les 3 questions de la phase 0.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `../ubumaths-wt-memes-nombres` · `feat/memes-nombres`.

---

## Phase 0 (2026-11-19)

### Ce qui existe

- `SeriesLinkShare` : « Copier le lien » + QR, avec le choix d'une forme ; le lien porte la composition (`?modeles=…&mode=…`).
- Chaque question est tirée avec sa propre graine, au hasard (`drawSeriesQuestions`, `nextSeed`) ; tout le hasard d'une question vient de sa graine (une seule source, consommée dans l'ordre).
- **Vérifié le 2026-11-19 sur la prod (lecture seule)** : 2 724 modèles (2 593 publiés, 131 brouillons), 3 graines chacun, générés deux fois → **2 724 identiques, 0 écart, 0 échec**.
- Aucune forme ne mélange l'ordre des questions.
- Le lien court du QR (`/l/<code>`) garde la requête entière : il gardera la graine.

### Comportements proposés

- **Nominal** : case « Mêmes nombres pour tous » sous le choix de la forme, décochée par défaut. Cochée → une graine de série est tirée et ajoutée au lien (et au QR). Tous ceux qui ouvrent ce lien ont les mêmes questions, dans le même ordre ; le prof aussi, ce qui lui permet de projeter la correction (forme En classe).
- **Lignes répétées** : une ligne « 3 × additions » donne 3 additions différentes entre elles, mais les mêmes 3 pour tout le monde (une graine par question, tirée de la graine de série).
- **Limite** : un modèle modifié entre l'envoi du lien et son ouverture peut donner d'autres nombres (rien à faire). Un lien sans graine se comporte comme aujourd'hui.
- **Erreur** : une graine abîmée dans l'URL → ignorée, nombres au hasard (pas de message).

### Questions à David

1. « Recommencer » à la fin : mêmes questions, ou nouvelles ?
2. Lien « Sans forme (ouvre Ma série) » : case cachée, ou proposée aussi ?
3. Quand change-t-on de graine : à chaque fois qu'on coche la case ?

## Historique
