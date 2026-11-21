# Chantier `idees-format` — journal

Mettre en œuvre les idées retenues dans [idees-format-exercices.md](idees-format-exercices.md)
(« Les 5 meilleures idées », « Décisions de David »). Ordre : idée 1, puis 2 à 5, puis revue du lot
« nombres et calculs » de Seconde.

## Reprendre ici

_Mis à jour le 2026-11-21, PR 1 (tirage) en cours._

- **État** : PR 1 = tirage d'une série (variations réparties, doublons refusés, ligne raccourcie).
- **Prochaine action** : PR 2 = avertissement dans le panier (« Ce modèle n'a que N questions
  différentes », bouton « Passer à N »), avec `distinctQuestionCount`.
- **En attente de David** : rien.
- **Pièges en cours** : test d'intégration local bloqué par des données d'une autre session
  (`class_journal_share_tokens`) ; la CI fait foi. Le worktree `automaths-serie` touche aussi le panier.
- **Worktree / branche** : `../ubumaths-wt-idees-format` · `feat/idees-format-repartition`.

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

## PR 1 — tirage (2026-11-21)

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
