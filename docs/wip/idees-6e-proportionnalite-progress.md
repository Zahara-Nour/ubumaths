# Chantier `idees-6e-proportionnalite`

## Reprendre ici

_Mis à jour le 2026-11-26, après #3175 (migration jouée en prod)._

- **État** : #3175 en prod : 28 modèles publiés à arrondi écrivent les zéros de l'arrondi (`;aN`), specs remises à la règle de #3170. Réservations « zéros des arrondis » retirées du tableau de répartition. Lot écrit et poussé sur `docs/idees-6e-proportionnalite`, prix encore écrits en texte (`7,2\,€`).
- **Prochaine action** : reprise du lot : worktree mis à jour (`git merge origin/main`), prix en grandeurs €, `zeros: off` des N1 à N3 et de e0ccaf84 à retirer s'il ne sert plus, retouches validées 3 à 5, essai en base locale.
- **En attente de David** : rien.
- **Pièges en cours** : F4 (06df72fd : niveau 6 + point 6-190) = migration écrite à la main, gabarit `20261118202805_questions_1techno_lot5_communs_tags.sql` + son test. Niveaux des neufs à relever en prod avant la migration de rangement. `round(x)` garde l'arrondi historique des moitiés négatives (−2,5 → −2), `round(x, 0)` donne −3. D'autres modèles publiés hors des 32 peuvent avoir des specs rouges depuis #3170 (non balayé).
- **Worktree / branche** : lot `../ubumaths-wt-idees-6e-proportionnalite` (`docs/idees-6e-proportionnalite`).

## Journal

### 2026-11-25 : réservation, relevé, phase 0

- Ligne 6P3 du tableau de répartition passée à « prise » (commit `1b949686e`, direct sur `main`).
- Relevé des 16 exercices par deux agents (Sonnet), échantillon vérifié dans le code. Verdicts : ✅ 3 · 🟡 9 · ❌ 4.
- Points de 6e en jeu : 6-189, 6-190, 6-191, 6-192, 6-193, 6-211. Aucun modèle de 6e ne fait la linéarité additive, le retour à l'unité, ni compléter un tableau par le calcul, alors que le BO les nomme.
- Rien dans leur format qui manque au nôtre : pas de ligne pour `outils-manquants.md`. À vérifier à l'écriture : l'échelle graphique dessinée (F3) avec un bloc de figure existant.
- Question d'accès des futures migrations : personne ne gagne d'accès (rangement de modèles, variations ajoutées).

#### Fiches de phase 0 (page à cocher)

| Fiche | Idée                                                       | Recommandation                          | Point |
| ----- | ---------------------------------------------------------- | --------------------------------------- | ----- |
| F1    | Prix : masses à virgule, sens de la division               | 2 variations de e0ccaf84                | 6-191 |
| F2    | Tiers et quart de grands nombres et de décimaux            | 2 variations de 7981dab0                | 6-211 |
| F3    | Échelle graphique 1 cm pour 2, 4 ou 5 m, terrain rectangle | 1 variation de 52bf3fb9 + 1 de 5e4e5e9d | 6-193 |
| F4    | Situations de proportionnalité en mots                     | 06df72fd (5e) ouvert à la 6e, tag 6-190 | 6-190 |
| N1    | Retour à l'unité                                           | Nouveau modèle, 4 variations            | 6-191 |
| N2    | Linéarité additive                                         | Nouveau modèle, 4 variations            | 6-191 |
| N3    | Compléter un tableau de proportionnalité par la linéarité  | Nouveau modèle, 3 variations            | 6-192 |
| N4    | Grandeur ou unité ?                                        | Nouveau modèle, 2 variations            | 6-189 |
| N5    | Peut-on le calculer ? (piège de l'âge et de la taille)     | Nouveau modèle, 2 variations            | 6-190 |
| R1    | Déjà couverts                                              | Rien                                    | —     |
| R2    | Échelles 1/n                                               | Rien en 6e ; idée pour la session de 5e | —     |
| R3    | « A-t-il assez ? » (Oui / Non)                             | Rien                                    | —     |

#### Décision de David (2026-11-25)

« Je valide » : toutes les fiches acceptées telles que recommandées (aucune case cochée sur la page,
donc aucune note). Modèles publiés réservés dans le tableau de répartition : e0ccaf84, 7981dab0,
52bf3fb9, 5e4e5e9d, 06df72fd. Idée R2 (échelles 1/n) notée dans « Idées en attente » pour la 5e.

### 2026-11-25 : lot des modèles publiés

- Exportés de prod : e0ccaf84, 7981dab0, 52bf3fb9, 5e4e5e9d, 06df72fd (ce dernier inchangé : F4 se fait par migration).
- e0ccaf84 +2 (masses au dixième ; diviser), 7981dab0 +2 (tiers / quart de grands nombres ; de décimaux), 52bf3fb9 +1 et 5e4e5e9d +1 (échelle graphique dessinée par un bloc `figure`, 1 cm pour 2, 4 ou 5 m, deux cases). Coup de pouce et trois erreurs prévues par case.
- Écarts : prix écrits « 7,2 € » (la règle des zéros juge « 21,60 € » forme à améliorer) ; espace des milliers écrit à la main (`2\,700`) ; une échelle par terrain, ni tennis ni handball (dimensions connues).

### 2026-11-25 : modèles neufs

- N1 retour à l'unité (4 var., 23 specs), N2 linéarité additive (4, 17), N3 compléter un tableau (3, 26, point 6-192), N4 grandeurs (2 : choix plusieurs, relier ; 10), N5 peut-on le calculer (2, 12). `zeros: off` sur N1 à N3.
- Écarts : N3 moyen x pair ∈ {4, 8, 10} (sinon la différence vaut 1 = valeur pour 1) ; prix unitaire 1,10 à 3,50 € jamais entier ; N1 recette 2 à 10, sirop 2 à 9 ; certaines cases n'ont que deux erreurs prévues (pas d'invention) ; N5 v2 : l'âge du père se calcule par l'écart.

### 2026-11-25 : retouches validées par David (« je valide »)

1. e0ccaf84 : `zeros: off` (« 21,60 € » accepté), par migration de contenu (options).
2. Prix affichés à deux décimales : David demande pourquoi un outil à part, et propose que le moteur
   écrive lui-même une grandeur en € avec deux décimales (option du format). Vérifié : les
   modificateurs de `{{eval:…}}` sont `d`, `+`, `()`, `'`, `hms`, `sci`, `[unité]`
   (`src/lib/ubumark/parameterization/parser/eval-parser.ts`) ; rien pour les centimes. Choix posé à David.
3. N5 v2 : l'âge du père reste calculable par l'écart ; ajouter une situation vraiment incalculable
   (pointure du père) pour que « on ne peut pas » soit parfois juste.
4. N5 : le piège « valeur × quantité » seulement quand il reste vraisemblable, sinon l'écart ajouté.
5. N4 relier : une série tirée parmi 4 ou 5 situations.

### 2026-11-26 : écriture des nombres, réglages validés par David

PR du moteur à part, avant la suite du lot (prix à réécrire en grandeurs en €). Validé par David :

- **Règle des zéros finaux** : un zéro final ne s'écrit que s'il dit quelque chose. C'est le cas pour
  un arrondi (précision), pour des centimes, ou quand l'auteur le demande. Une valeur exacte s'écrit
  sans zéro final.
- **Euro automatique** : une grandeur en € à une décimale s'écrit avec deux (« 3,70 € ») ; un prix
  entier reste entier ; avec plus de deux décimales, on affiche tout, plus un avertissement (pas un
  refus) à la vérification du modèle.
- **`;dN`** : au moins N décimales, sans arrondir (1,5 → « 1,50 » ; 3,755 → « 3,755 » + avertissement).
- **`;aN`** : arrondit à N décimales (au plus proche, 5 vers le haut, calcul exact) et les écrit
  toutes (3,04 → « 3,0 » avec `;a1`).
- **`;pN`** : arrondit à N chiffres significatifs et les écrit tous (3,04 → « 3,0 » avec `;p2` ;
  1 234 → « 1 200 », « 1,2 × 10³ » avec `;sci;p2`).
- `;a` avec `;p`, `;d` avec `;a` ou `;p`, `;a`/`;p` avec `;hms`, `;a` sans chiffre : refusés à la
  vérification. Un réglage écrit l'emporte sur l'euro automatique.
- **`round(x, n)`** : la fonction, pour arrondir dans un calcul (même arrondi que `;aN`).
- **Juge** : « 3,0 » attendu (arrondi) → « 3,0 » juste ; « 3 » → forme à améliorer, message du type
  « Arrondi au dixième : écris le chiffre des dixièmes, même si c'est 0 ». « 3,70 € » jamais en forme
  à améliorer.

Pourquoi `;aN` tient : la réponse attendue s'écrit avec les mêmes `{{eval:…}}` que l'énoncé
(`"answer": "{{eval:n/d;d}}%"`), elle est donc arrondie de la même façon.

#### Vérification du juge actuel (2026-11-26)

Modèle d'essai passé à `question:specs` (cases avec et sans `precision`, attendu « 3 » ou « 3{,}0 ») :

| Case                                              | Réponse de l'élève | Aujourd'hui                       | Voulu                                              |
| ------------------------------------------------- | ------------------ | --------------------------------- | -------------------------------------------------- |
| prix 3,7 € (grandeur), avec ou sans `precision` 2 | 3,7 €              | juste                             | juste                                              |
| idem                                              | 3,70 €             | forme à améliorer                 | juste                                              |
| nombre exact 3,7                                  | 3,70               | forme à améliorer                 | forme à améliorer (inchangé)                       |
| `precision` décimale 1, arrondi de 3,04           | 3                  | juste                             | forme à améliorer                                  |
| idem                                              | 3,0                | forme à améliorer                 | juste                                              |
| idem                                              | 3,00               | mauvaise forme (« Arrondis… »)    | inchangé                                           |
| idem                                              | 3,04               | mauvaise forme (arrondi non fait) | inchangé                                           |
| sans `precision`, attendu écrit « 3{,}0 »         | 3 / 3,0            | juste / forme à améliorer         | les zéros de l'attendu ne comptent pas aujourd'hui |

Le juge retire les zéros finaux de la réponse sans regarder l'attendu (`removeZeros`,
`checkForm` et `cosmeticViolations` de `mathAST/cosmetic-transforms.ts`). La règle écrite dans
`docs/systeme/questions.md` (« moins de décimales accepté si la valeur est exactement l'arrondi ») sera
renversée. En prod : 32 modèles publiés ont une case à arrondi (décimales ou chiffres significatifs),
1 seul a une grandeur en €, et 66 ont `zeros: off`.

#### Renversement validé et écriture (2026-11-26)

- David valide le renversement pour les 32 modèles à arrondi, et « 3,7 € » qui reste juste. Dans
  une case au centième, « 3,7 € » est perfectible : la règle de l'arrondi passe d'abord.
- Écrit par deux agents en parallèle (mathAST : écriture des `{{eval}}` ; pédagogie : juge),
  tests rouges d'abord. Choix laissés aux agents, des défauts sans conséquence :
  - refus de `;sci` avec `;aN` ou `;dN` (renvoi vers `;pN`), et de `;dN` avec `;hms` ;
  - `0;pN` s'écrit « 0 » ;
  - bornes : `;a` de 0 à 15, `;p` et `;d` de 1 à 15 ;
  - `round(x, n)` invalide donne NaN dans le chemin compilé.
- Avertissements : collecteur ouvert seulement autour des tirages de `checkGeneration`
  (`eval-warnings.ts`), rien gardé dans l'appli.
- Essai de bout en bout : corrigé « 3,0 » et « 3,70 € » ; juge : « 3,0 » et « 3,70 € » justes,
  « 3 » et « 0,1 » en forme à améliorer.
- Suite : les 32 modèles écrivent leur attendu `round(k*x)/k;d`, qui perd les zéros (« 0,3 » au
  centième). Une migration de contenu les passera à `;aN` après le merge (les modèles à l'unité ne
  changent pas).
- #3170 mergée le 2026-11-26 (CI verte). Relecture Opus : aucun bug de correction ; corrigés avant
  l'ouverture : avertissements des tirages rejetés, `;dN` signalé dans une case sans `precision`,
  pas d'avertissement euro avec `;dN`.

### 2026-11-26 : zéros des arrondis dans les modèles publiés (#3175)

- 32 modèles à `precision` décimale relevés ; 27 touchés (5 à l'unité seulement ou sans `round…;d` : f7c15433, bf5dadf6, 245b4eb1, 5ec00b89, 10a51999). 126 écritures `;d` → `;aN`, valeur inchangée (le `round` reste), blocs `figure` exclus (60 coordonnées d'Al-Kashi).
- 11 specs de 7 modèles assertaient l'ancienne règle (rouges en prod depuis #3170) : remises à la règle ; 10a51999 ajouté pour sa spec seule (28 modèles migrés).
- `security-auditor` : aucun finding bloquant. Migration non jouée : deux autres migrations en attente.
- Migration jouée en prod par David le 2026-11-26 (avec les deux autres en attente) ; vérifiée par MCP (aucun `round…;d` hors figures).
