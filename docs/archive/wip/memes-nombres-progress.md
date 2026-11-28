# Chantier `memes-nombres` — « Mêmes nombres pour tous » sur un lien de série

Proposition 5 du chantier `inspiration` (docs/wip/inspiration-progress.md, décisions du 2026-11-18).

## Reprendre ici

_Mis à jour le 2026-11-20 : chantier clos et archivé._

- **État** : **clos**. #2922 livrée en prod (v0.98.0, 2026-11-19) ; durable versé dans `docs/systeme/evaluations.md` et `questions.md`. Suite : « Recommencer » de la Course aux nombres corrigé (#2929, journal `course-recommencer` archivé).
- **Prochaine action** : aucune.

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

### Décisions de David (2026-11-19, sur mes recommandations)

1. « Recommencer » redonne **les mêmes** questions (libellé « Recommencer les mêmes questions »).
2. Lien « Sans forme (ouvre Ma série) » : **case cachée**.
3. Une graine neuve à chaque fois qu'on coche ; pas de bouton « Autres nombres ».

## Historique

- 2026-11-19 : graine `graine=<n>` dans le lien (`SERIES_SEED_PARAM`), `seriesSeedSequence`, case dans `SeriesLinkShare`, libellé de Recommencer (`sameQuestions`) dans Flash, Saisie, Contrôle blanc ; tests de rendu (deux ouvertures du lien, Recommencer) ; doc `evaluations.md` et `questions.md`.
- 2026-11-19 : revue (`code-reviewer`) : une ligne au modèle absent décalait les graines suivantes → `drawSeriesQuestions` tire la graine même pour une ligne sautée (test).
