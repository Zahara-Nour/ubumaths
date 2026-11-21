# Chantier `idees-format` — journal

Mettre en œuvre les idées retenues dans [idees-format-exercices.md](idees-format-exercices.md)
(« Les 5 meilleures idées », « Décisions de David »). Ordre : idée 1, puis 2 à 5, puis revue du lot
« nombres et calculs » de Seconde.

## Reprendre ici

_Mis à jour le 2026-11-21, après #2954._

- **État** : idée 1, PR 1 mergée (#2954) ; PR 2 (avertissement du panier) en cours, sur sa branche.
- **Prochaine action** : PR 2 : CI, relecture `code-reviewer` (Sonnet), merge. Puis idées 2 à 5.
- **En attente de David** : rien (pas de `deploy:prod` demandé).
- **Pièges en cours** : test d'intégration local bloqué par des données d'une autre session
  (`class_journal_share_tokens`), la CI fait foi ; le worktree `automaths-serie` touche aussi le panier.
- **Worktree / branche** : `../ubumaths-wt-idees-format` · `feat/idees-format-panier`.

## Idée 1 — phase 0 validée (David, 2026-11-21)

**Q1. Retrouver la question plus tard → choisir la graine** (option A, validée). On n'impose pas
la variation : la variation est le premier tirage de `generateInstance`, on essaie donc les graines
suivantes jusqu'à tomber sur la variation voulue. La graine seule redonne la question partout
(évaluation, erreurs rejouées dans les statistiques, fiches) : ni migration ni colonne.
Défaut compensé (question de David) : l'instance porte `selectedVariationIndex` ; `variationOfSeed`
lit la variation d'une graine sans générer ; un test verrouille l'accord des deux.

**Q2. Pas assez de questions différentes → jamais de répétition** (David : « je n'aime pas l'idée
de remettre les mêmes questions »). Proposition de David : vérifier le nombre quand le prof le
choisit et proposer de l'abaisser. Puis David a suivi mes recommandations (« je suis tes recos ») :
vérification **dans le panier seulement** (pas côté serveur) ; si le modèle a changé après coup, la
ligne est **raccourcie** au moment de jouer la série.

**Q3. Doublon = « b + a »** (validé) : mêmes nombres tirés (variation + variables) **ou** même
énoncé affiché (choix d'un QCM triés). Deux calculs de même réponse (« 12 × 5 », « 15 × 4 ») ne sont
pas un doublon (David). « 2 + 3 » et « 3 + 2 » peuvent sortir tous les deux. Précision
d'implémentation, dite à David : l'empreinte des nombres n'est pas utilisée quand l'énoncé tire
lui-même (`{{carré|rectangle}}`), sinon sa ligne tomberait à une question.

## PR 1 — tirage (#2954, mergée le 2026-11-21)

- `src/lib/questions/series-draw.ts` : `variationOfSeed`, `questionFingerprints`,
  `drawLineQuestions` (tours mélangés de variations, 50 essais par variation avant de la dire
  épuisée), `distinctQuestionCount` (graine fixe).
- `series-items.ts` : une graine par **ligne** (plus par question), d'où sortent celles de ses
  questions ; `drawSeriesQuestions` génère et rend l'instance ; `buildSeriesItems` s'appuie dessus.
- `evaluation-attempts.ts` : utilise l'instance du tirage (plus de seconde génération).
- Conséquence : un lien « Mêmes nombres pour tous » envoyé avant la mise en prod donnera d'autres
  questions après (même effet qu'un modèle modifié).
- Tests : `series-draw.test.ts` (18, vrai générateur ; vérifiés rouges sans répartition, sans
  refus des doublons, sans la précaution des tirages dans le texte, sans le tri des choix).
- Relecture (`code-reviewer`, Sonnet) : aucun bloquant. Corrigé : variations épuisées retenues pour
  les lignes suivantes du même modèle (coût), échec de génération journalisé par le logger serveur
  en évaluation. Accepté : une variation presque vidée peut être dite épuisée à tort (~1 %).

## PR 2 — avertissement du panier (2026-11-21)

- `series-draw.ts` : `distinctLimit(template, quantity, generate)` rend N quand la quantité dépasse
  les N questions différentes, sinon `null`. Cache par modèle (`WeakMap`) : modèle épuisé jamais
  recompté, quantité déjà atteinte non plus ; un `+` au-delà relance un compte plus loin.
- `CartQuestionCard` : « Ce modèle n'a que N questions différentes. » (« qu'une question. » pour 1),
  bouton « Passer à N » (`questionCart.updateQuantity`). Icône `CopyX` en `text-warning`.
- Panier seulement (décision Q2) : l'éditeur de série n'avertit pas, le tirage raccourcit.
- Tests : 3 de `distinctLimit` (vérifiés rouges avant l'écriture), 3 de la tuile (rendu, singulier,
  rien quand assez).
- Relecture (`code-reviewer`, Sonnet) : bloquant corrigé, une génération en échec donnait « Passer à
  0 » (le clic retirait la ligne) → échec = pas d'avertissement, rien en cache. Corrigé aussi :
  recherche au moins deux fois plus loin (monter de 1 à 99 recomptait à chaque pas), `role="status"`,
  bouton nommé « Passer à N répétitions ». Laissé : focus perdu après le clic (le bouton disparaît).
