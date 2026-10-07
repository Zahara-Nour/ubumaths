# Arbre des notions — document de reprise

> Rédigé le 2026-10-07 à la fin de la session « arbre-notions », pour reprendre le chantier proprement
> dans une nouvelle session. À lire en entier avant toute action.
> Compléments : [ADR 0019](../../adr/0019-classement-branche-notion-sous-notion.md),
> [progression](../arbre-notions-progress.md), [LISEZMOI](LISEZMOI.md).

---

## 1. Où en est le chantier (état exact)

- **Branche LOCALE `feat/arbre-notions`**, worktree `../ubumaths-wt-arbre`. **Jamais poussée.**
  ⛔ Consigne de David : **rien ne part en prod ni sur `main`** tant que le chantier n'est pas prêt.
  Ne pas pousser, ne pas ouvrir de PR, ne pas lancer `db:migrate` sans sa demande explicite.
- **Rien n'est en base de production** pour l'arbre. La migration n'existe que sur la branche et n'a
  été appliquée qu'à la base Supabase LOCALE.
- **Sur `main`** : le glossaire et les ADR avaient été poussés par erreur, puis retirés (commit
  `9e875ea3c`, 2026-10-07). La branche a été rejouée par-dessus ce retrait et les réintroduit : une
  fusion future les apportera, elle ne les supprimera pas.
- **Faits en production, à la demande de David, hors chantier** (données, pas de code) :
  - fusion des thèmes d'exercices `Fonction` → `Fonctions` (1 ligne), `Bac` → `BAC` (2 lignes) ;
  - fiche « Fonctions : généralités » (seconde), brouillon `41737393`, 14 exercices neufs + « Calcul
    d'images » (`5b233301`) — PR #912, mergée.
- Fichier non suivi dans le worktree : `docs/wip/arbre-notions/nc-section.html` (intermédiaire produit
  par `dessin_branches.py`). Ne pas le supprimer sans demander (règle 0 du CLAUDE.md) ; il peut être
  ignoré.

Commits de la branche (du plus ancien au plus récent) : `37f9f784b` arbre validé → `e0c28d6cc`
descripteurs → `f81530622` accès → `46dbefa30` / `bcb2cec22` phase 0 → `478b989ed` migration + tests →
`267b3c26f` règles validées → `46ee8b34a` findings d'audit → `31dcdfc13` correspondance → `57a1403b4`
Inégalités → `48f58389e` Tle comp. → `963b38cb6` écarts aux programmes.

---

## 2. Vocabulaire (glossaire de la branche, `CONTEXT.md`)

| Terme                      | Sens                                                                                                   | ⚠️                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Branche**                | 1er niveau du classement, stable à tous les niveaux scolaires (« Fonctions », « Géométrie »)           | ≠ thème du programme                                      |
| **Notion**                 | De quoi parle un contenu (« Second degré », « Fractions : calculs »)                                   |                                                           |
| **Sous-notion**            | Subdivision facultative d'une notion (« discriminant », « tables »)                                    |                                                           |
| **Thème**                  | Regroupement du **programme officiel** (`curriculum_themes`) — inchangé                                | ne pas l'employer pour l'arbre                            |
| **Chapitre**               | **Unité de cours** d'une classe (`class_chapters`) — inchangé                                          | ⛔ jamais pour le classement (erreur faite puis corrigée) |
| **Catégorie** (d'exercice) | Genre de tâche : automatisme, application, recherche, synthèse… (`exercises.category`)                 | pas sur les questions                                     |
| **Question de cours**      | Marqueur existant d'un modèle (connaissance plutôt que procédure)                                      |                                                           |
| **Source**                 | Provenance d'un exercice (texte libre existant `exercises.source`) + **type de source** (liste fermée) | exercices seulement                                       |
| **Tag**                    | Mot-clé **transversal** (lecture graphique, algorithme, démonstration, modélisation)                   | jamais un contenu que l'arbre nomme                       |

Termes bannis ajoutés : « thème / domaine d'un exercice ou d'un modèle » → **branche / notion**.
« Type d'activité » a été proposé puis **supprimé** (voir § 4).

---

## 3. L'arbre

Source de vérité : `arbre-notions.json` (généré). Page visuelle : `arbre-notions.html` (artefact privé
de travail : https://claude.ai/artifact/6g66KoBWfZdQ91tNn66Hg5). Régénération depuis ce dossier :
`python3 dessin_branches.py && python3 page.py` (le JSON est réécrit par `dessin_branches.py`, qui
contient les listes ; `tpl.html` = gabarit).

**19 branches, 115 notions, 418 sous-notions** (avant les ajouts du § 7) :

| Branche                                       | Notions                                                                                                                                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nombres et calculs (15)                       | Entiers : numération / addition et soustraction / multiplication / division / priorités opératoires ; Décimaux : numération / calculs ; Fractions, Relatifs, Puissances, Racines carrées : chacun « sens et écritures » + « calculs »                                    |
| Arithmétique (4)                              | Divisibilité, Nombres premiers, PGCD Bézout et Gauss, Congruences                                                                                                                                                                                                        |
| Nombres complexes (5)                         | Forme algébrique, Module et argument, Formes trigo. et exponentielle, Équations polynomiales, Interprétation géométrique                                                                                                                                                 |
| Proportionnalité (5)                          | Situations de proportionnalité, Pourcentages, Évolutions, Échelle d'une carte, Vitesse                                                                                                                                                                                   |
| Algèbre (8)                                   | Calcul littéral (une seule notion) ; Équations : premier degré / produit et quotient / second degré ; Inéquations : idem ; Inégalités                                                                                                                                    |
| Fonctions (15)                                | Généralités ; Fonctions affines ; une notion par fonction de référence (carré, inverse, racine carrée, cube, valeur absolue) ; Second degré ; Dérivation (optimisation = sous-notion) ; Exponentielle ; Trigonométriques ; Limites ; Continuité ; Convexité ; Logarithme |
| Intégration (4)                               | Calcul d'intégrales, Intégrale et aire, Valeur moyenne, Fonction intégrale                                                                                                                                                                                               |
| Équations différentielles (5)                 | Généralités, y′ = f (les **primitives** en sous-notions), y′ = ay, y′ = ay + b, y′ = ay + f                                                                                                                                                                              |
| Suites (8)                                    | Généralités, Arithmétiques, Géométriques, Modélisation, Limites, Récurrence, Récurrentes, Arithmético-géométriques                                                                                                                                                       |
| Matrices (4), Graphes (4)                     | deux branches distinctes ; Chaînes de Markov dans Graphes                                                                                                                                                                                                                |
| Géométrie (8)                                 | Vecteurs, Espace, Orthogonalité : chacun « sans / avec coordonnées » ; Géométrie repérée ; Produit scalaire                                                                                                                                                              |
| Grandeurs et mesures (5)                      | Périmètres, Aires, Volumes, Durées, Unités et conversions                                                                                                                                                                                                                |
| Probabilités (6)                              | Expériences aléatoires, Conditionnelles, Variables aléatoires, Loi binomiale, Autres lois, Sommes et concentration                                                                                                                                                       |
| Dénombrement (4)                              | Principes, Arrangements et permutations, Combinaisons, Problèmes                                                                                                                                                                                                         |
| Statistiques (4)                              | Représenter des données, Indicateurs, Échantillonnage, Statistique à deux variables                                                                                                                                                                                      |
| Logique (4), Ensembles (3), Algorithmique (4) | branches distinctes                                                                                                                                                                                                                                                      |

**Règles de construction tranchées par David** (ne pas les re-proposer) :

- **Trois niveaux seulement.** Pas de sous-notion imbriquée.
- **Nombres et calculs rangé par TYPE DE NOMBRE**, l'opération en sous-notion ; les grosses notions
  sont découpées « Type : aspect » (« Entiers : multiplication »), et tous les types de nombres ont
  « sens et écritures » + « calculs » par cohérence.
- Une notion ne répète pas le nom de sa branche (« Situations de proportionnalité », « Expériences
  aléatoires »).
- **Second degré** : équations et inéquations dans **Algèbre** ; dans **Fonctions > Second degré** les
  énoncés « fonction » (racines, signe, formes, variations, parabole). Frontière : la consigne porte
  sur une équation → Algèbre ; sur une fonction → Fonctions.
- **Vecteurs / Espace / Orthogonalité** : « avec » ou « sans coordonnées » ; un énoncé sur un vecteur →
  Vecteurs, sur des points/droites/cercles dans un repère → Géométrie repérée.
- Arithmétique, Complexes, Matrices, Graphes, Intégration, Équations différentielles, Dénombrement,
  Logique, Ensembles, Algorithmique, Statistiques : **branches à part** (choix de David).
- Niveaux « Tle comp. » ajoutés aux 18 notions partagées avec les maths complémentaires.

---

## 4. Ce qui décrit un contenu, hors de l'arbre (un champ par question posée)

| Question                     | Exercices                                      | Questions                                | Champ                                 |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------- |
| De quoi ça parle ?           | 1 ou plusieurs nœuds (un principal facultatif) | **un seul** nœud                         | arbre                                 |
| Quel genre de tâche ?        | catégorie                                      | — (question de cours, sinon automatisme) | `category` / `options.courseQuestion` |
| D'où ça vient ?              | source + type de source                        | —                                        | `source`, `source_type_id`            |
| Dans quel ordre progresser ? | —                                              | niveau de difficulté 1-20                | `level`                               |
| Sous quelle forme répondre ? | —                                              | type (saisie, QCM, carte de cours)       | `type`                                |
| Mot-clé transversal          | tags                                           | —                                        | `resource_tags`                       |

« Type d'activité » supprimé : _Apprivoiser_ = niveau de difficulté bas ; _À trou_ = forme d'énoncé,
pas un classement ; _astucieux_ = sous-notion « calcul astucieux ». Tags de contenu → notions au
reclassement ; les exercices Python gardent leurs tags.

---

## 5. Base de données (PR 1, écrite et testée, NON appliquée)

- Migration `supabase/migrations/20261007120000_arbre_des_notions.sql` (additive, rollback en tête) :
  `classification_nodes` (kind branch/notion/subnotion, parent, name, position, grades, archived_at),
  `source_types`, `exercise_classifications` (exercice ↔ nœuds, `is_primary`), colonnes
  `exercises.source_type_id` et `question_templates.classification_node_id`. Les anciennes colonnes
  `topic`, `theme`, `domain`, `subdomain` sont **intactes**. Aucun remplissage de données.
- Règles : kind cohérent avec le parent ; 3 niveaux max ; niveaux d'une notion non vides, d'une
  sous-notion vides (hérite) ou inclus dans ceux de la notion ; nom unique entre frères (casse
  ignorée) ; genre d'un nœud immuable ; archiver un nœud à enfants actifs refusé ; pas de nœud actif
  sous un parent archivé ; suppression d'un nœud utilisé refusée ; ranger un contenu dans une branche
  refusé ; **nouveau** rangement dans un nœud archivé refusé (un rangement existant reste valide).
- **Accès (question d'accès tranchée par David)** : lecture de l'arbre et des types de source par
  tout le monde, anon compris ; écriture **admin seul** ; rangement d'un exercice = droits actuels de
  modification de l'exercice (**prof auteur**, l'admin ne peut pas — validé) ; rangement d'un modèle =
  admin (inchangé). Personne ne perd d'accès.
- Tests : `tests/integration/arbre-des-notions.test.ts`, **54 verts**, rouges sans la migration,
  neutralisations prouvées (policy d'écriture, policy UPDATE du rangement, refus du nœud archivé).
- `security-auditor` passé : **aucun finding bloquant** ; findings corrigés (tests manquants, REVOKE
  EXECUTE à authenticated, commentaire « ne pas restreindre la lecture sans revoir les triggers »).
- Conditions de `db:migrate` du CLAUDE.md : question d'accès ✅, tests rouges sans migration ✅,
  audit ✅, additive + rollback ✅ — mais **David a interdit toute mise en prod pour l'instant**.

---

## 6. Table de correspondance (proposition, rien écrit)

`correspondance/` : `modeles.csv` (1 005, un nœud chacun), `exercices.csv` (329, ≥ 1 nœud, principal
en premier, type de source), `tags.csv` (67 tags : 57 → notions, 10 transversaux), `synthese.md`.
Confiance : modèles 843 haute / 160 moyenne / 2 basse ; exercices 179 / 137 / 13. Tous les chemins
existent dans l'arbre (vérifié par script). Les deux modèles « Signe d'une expression » (`4cc21ccd`,
`c7cdca01`) ont été rangés dans **Algèbre > Inégalités > signe d'une expression** (validé).

⚠️ La correspondance a été produite **avant** les ajouts du § 7 : à relancer ou à ajuster une fois
l'arbre complété (les sous-notions « avec coordonnées », etc. changeront des lignes).

---

## 7. Écarts avec les programmes du lycée

`programmes-ecarts.md` (5 programmes fournis par David, textes extraits dans le scratchpad de la
session — les PDF sont dans `~/Downloads`). Bilan : **73 sous-notions, 4 notions, 10 niveaux à
ajouter**. Écarts majeurs : notion Tableaux croisés (2de) ; Évolutions (coefficient multiplicateur,
successives, réciproque) ; probabilités totales et inversion du conditionnement ; exponentielle aussi
en Tle et Tle comp. ; Logique et Ensembles aussi en Tle ; boîte à moustaches, écart interquartile,
déciles ; « isoler une variable » ; parité, taux de variation, opérations sur les dérivées,
comparaison des limites, dichotomie ; petit théorème de Fermat, ax ≡ b [n], formules d'addition ;
suites d'intégrales. Sens inverse : « estimation d'une proportion » (2de, ancien programme), IPP et
inégalités de convexité hors programme en Tle comp., sous-notions de trigonométrie de Tle sous une
notion marquée 1re (à régler par les niveaux des sous-notions).

---

## 8. Questions ouvertes (à poser à David, dans cet ordre)

1. **D1 — Automatismes** de 2de / 1re : ajouter ces niveaux aux notions du collège concernées ?
   (reco : oui, sinon une fiche d'automatismes de 2de ne trouve pas ses notions)
2. **D2 — Géométrie du collège** absente (Pythagore, Thalès, trigonométrie du triangle rectangle,
   repérage) : créer ces notions maintenant ? (reco : oui, collège + 2de ; le reste du collège quand
   David fournira les programmes du cycle 4)
3. **D3 — Divisibilité** « cycle 3 à Expertes » → « cycle 3 à 2de, Expertes » ? (reco : oui)
4. **Appliquer les ajouts de `programmes-ecarts.md`** : en bloc ou branche par branche sur le
   diagramme ? (les 5 compléments « Q2 » de l'agent de correspondance y sont inclus)
5. **Q3 — les 13 exercices incertains** de la correspondance (liste dans `synthese.md`) : accepter les
   propositions, sauf l'exercice **« debug »** (à exclure ; sa suppression en prod est une action
   destructive à décider à part) et **deux exercices sans titre** (à titrer).
6. Les **297 lignes de confiance moyenne** : les accepter en bloc ou relire un échantillon par branche ?
7. Programmes du **collège et du primaire** : non comparés (David ne les a pas encore fournis).

---

## 9. Étapes suivantes (dans l'ordre)

1. Trancher § 8 (1 à 4), compléter l'arbre (`dessin_branches.py`), régénérer JSON + page,
   republier l'artefact (même fichier → même URL depuis la session qui l'a créé ; sinon `url`).
2. Relancer ou ajuster la correspondance sur l'arbre complété ; faire valider § 8 (5, 6).
3. Écrire le **remplissage des données** (arbre + rangements) à partir du JSON et des CSV validés :
   script gardé ou migration de données, testé en local — à décider avec David.
4. **PR 2 (interface)** : page d'administration de l'arbre ; listes déroulantes filtrées par niveau
   dans les formulaires d'exercice et de modèle (notion obligatoire pour un nouveau contenu,
   avertissement si le niveau ne correspond pas) ; menu d'Automaths construit depuis l'arbre (seules
   les notions avec des questions publiées) ; `create-questions.ts` et scripts de fiches ;
   `/api/questions/categories`.
5. Plus tard, avec David : retrait des anciennes colonnes (destructif → inventaire des usages par grep,
   chaînes et schémas Zod compris, puis arrêt et explication en français).
6. Rappel du CLAUDE.md : `db:types` lit la production → la migration doit être en prod avant le code
   qui l'utilise (deux PR). Rien de tout ça sans le feu vert de David.

---

## 10. Pièges rencontrés dans cette session

- **« Chapitre » existait déjà dans le glossaire** (unité de cours) : vérifier `CONTEXT.md` avant de
  nommer un concept.
- **Commit direct sur `main` de la doc** : la règle « doc pure → main » ne s'applique PAS à ce
  chantier, que David veut garder sur sa branche.
- Les **tests UPDATE d'un rangement** passaient même sans la policy UPDATE (la policy SELECT masquait la
  ligne) : il a fallu un exercice public visible pour qu'ils prouvent quelque chose.
- `pnpm fiche:verifier` cassé sous pnpm 12 (`pnpm -s`) — corrigé dans #912.
- Un worktree neuf n'a ni `.env` ni `node_modules` : copier `.env`, `.env.local`, puis
  `pnpm install --prefer-offline` (sinon prettier du hook pre-commit échoue).
- Présenter **modèles et exercices dans des listes séparées** (David l'a demandé).
