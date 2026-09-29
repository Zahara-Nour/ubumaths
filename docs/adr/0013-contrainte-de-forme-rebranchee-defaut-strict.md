# 0013 — Contrainte de forme rebranchée, défaut `strict`

- **Statut** : acceptée
- **Date** : 2026-09-29 · **Décidée par** : David

## Contexte

En mode exact, `checkFormUnified` applique à la réponse de l'élève et à la réponse attendue un pipeline
de retouches cosmétiques (fractions réduites, `×1`, parenthèses inutiles, signes…). Chaque retouche a
sa contrainte (`brackets`, `zeros`, `factorOne`…) et son mode (`strict` / `warn` / `off`), `warn` par
défaut. Au bout du pipeline, les deux expressions sont comparées : si elles diffèrent, la réponse n'a
pas la forme attendue.

Faits vérifiés (git, code de TinyMath `new-tinymath/…/correction.ts`) :

- TinyMath : contraintes cosmétiques `warn` par défaut (`require-…` = `strict`, `no-penalty-for-…` =
  `off`) ; la comparaison finale (étape 6) donne **toujours** `BAD_FORM`, sans option.
- Chiphre a rangé cette comparaison parmi les contraintes, sous le nom `form` (2025-11-26). Avec le
  défaut `warn` posé pour toutes les contraintes (2026-02-06), `400+80` était compté juste pour `480`.
- Le commit `521505b97` (2026-02-24) a rendu la comparaison finale inconditionnelle, mais a laissé
  `form` dans la liste des contraintes et dans l'éditeur : son réglage n'était plus lu (mesuré :
  `form` absent, `warn`, `off`, `strict` → même verdict).
- Conséquence : aucun moyen d'accepter `6×2^{n−1}` pour `3×2^n` (« Deviner le terme général »,
  #623), alors que la consigne ne demande aucune forme.

## Décision

Le réglage `form` gouverne de nouveau la comparaison finale, avec un défaut **propre à `form` :
`strict`**. Les autres contraintes gardent leur défaut `warn`.

Critère d'usage :

- **Transformer une expression donnée** (développer, factoriser, réduire) : la forme est l'objet de
  l'exercice → `strict` (défaut). La souplesse vient des contraintes cosmétiques ; la comparaison
  finale refuse une réponse trop proche de l'expression de départ.
- **Trouver l'expression de quelque chose** (terme général d'une suite, expression d'une fonction) :
  la valeur est l'objet → `warn`, question par question.

## Écarté

- **Défaut `warn` pour `form`**, comme les autres contraintes : rouvre `400+80` pour `480` sur toutes
  les questions qui ne précisent rien (c'est le défaut corrigé le 2026-02-24).
- **Retirer `form` de l'éditeur** et garder la comparaison finale toujours stricte (comportement
  TinyMath) : aucun moyen d'accepter une autre écriture quand la consigne ne demande pas de forme.

## Conséquences

- Sans réglage, aucun verdict ne change (les 640 modèles au 2026-09-29).
- `warn` accepte aussi un calcul inachevé (avec avertissement) : à réserver aux questions où c'est
  acceptable.
- Les hypothèses de l'énoncé (ADR 0012) changent le verdict en `warn` / `off` ; en `strict`, seulement
  le message.
- Le mode `off` (juste sans remarque) existe aussi ; les questions passées en `warn` sont choisies par
  David.
