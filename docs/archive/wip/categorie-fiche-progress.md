# Catégorie et notion d'une fiche d'exercices — journal

## Reprendre ici

_Mis à jour le 2026-11-22 : chantier **clos**._

- **État** : clos le 2026-11-22. Découpage recompté contre les PR et le code : PR 1 #2901, 2a #2903, 2b #2912 (+ #2919), 3a #2928, branche en titre #2938, 3b #2939 (reprise des 49 fiches vérifiée en prod), 4 #2985 ; les trois migrations sont jouées en prod · **Durable** : [ADR 0041](../../adr/0041-categorie-et-notions-d-une-fiche.md), `docs/systeme/fiches-et-pdf.md`, `docs/systeme/base-de-donnees.md` · **Reste hors chantier** : `/` non échappé par `escapeTypst` (écart 11 de `fiches-et-pdf.md`) ; noms anglais des notions (chantier séparé) · **Worktree** : aucun

### 2026-11-22 — reprise vérifiée, PR 4

- Prod lue par le MCP (lecture) : les 49 fiches du fichier de réponses ont la catégorie et les
  notions attendues, dans l'ordre ; « Suites · Applications », « Dérivation · Applications » ;
  automatismes et évaluation en titre libre.
- PR 4 : module `scripts/fiches/automatismes-notions.ts` (notions vérifiées dans l'arbre : au
  moins une, sans doublon, notion ou sous-notion, non archivée ; posées dans le `try` de la
  fiche, un refus défait tout). Chaque script déclare `NOTIONS` = celles validées à la reprise
  pour sa fiche (1). Les 5 autres fiches d'automatismes (dérivation, évolutions, second degré)
  n'ont pas de script dans `scripts/`.

### 2026-11-20 — relecture de la page, règle de la branche

- David a proposé de classer sous une branche ; tranché : on classe toujours sous des notions, et
  deux notions ou plus d'une même branche impriment la branche en titre (« Suites · Entraînement
  technique » ; PDF : branche en grand, notions dessous, catégorie en petit). #2938, sans migration.
- Page cochée : 49 réponses « ok », identiques aux propositions (Produit scalaire en évaluation
  compris). Fichier de réponses : 49 lignes, ordre du relevé.

## Synthèse de la phase 0 (2026-11-19)

- **Catégorie de fiche** (fiche d'exercices seulement) : Entraînement technique · Applications ·
  Automatismes · Révisions.
- **Notions** (nœuds de l'arbre) : fiche d'exercices → 0 ou 1 notion, **plusieurs pour Révisions
  et Automatismes** ; évaluation, examen, quiz, devoir maison → 0 à N notions, pas de catégorie.
- **Rendu page 1** : badge(s) du niveau à gauche (forme courte, plein orange, texte blanc), QR à
  droite. Au centre : sans titre libre → notion(s) en grand (« Suites · Dérivation »), catégorie
  en petit gris dessous ; titre libre (ou titre des autres types) → lui seul, **ni notions ni
  catégorie dessous** (David, 2026-11-20).
- **Bas de page** : `[1ère Spé] Suites · Entraînement technique   n / N   gidouille chiph.re`.
- **Anglais** : catégories traduites ; notions en anglais = **chantier séparé** ; en attendant,
  pas de notion imprimée sur une fiche anglaise.
- **Automatismes (ADR 0011)** : le script pose catégorie + notions.
- **Reprise** : les 50 fiches de prod reclassées (page à cocher pour les déductibles du titre).
- **Synthèse validée par David** (2026-11-19).

## Stockage et accès (validés par David, 2026-11-19)

- **Stockage A** : table « fiche → notions » calquée sur `exercise_classifications` (fiche, nœud,
  position), nœud = notion ou sous-notion (pas de branche, comme les exercices) ; catégorie = une
  colonne de `worksheets` (liste fermée, vide hors fiche d'exercices). Règle « 1 notion sauf
  Révisions / Automatismes » vérifiée par l'éditeur ET par la base. Écarté : colonne + liste (B).
- **Question d'accès tranchée** : le prof lit/écrit catégorie et notions de ses fiches (on voit les
  notions d'une fiche quand on voit la fiche) ; **l'élève affecté et le visiteur d'un lien de
  partage pourront lire la catégorie, les notions ET le niveau de la fiche** (imprimés sur leur
  PDF ; migration en attente depuis #2891, faite dans la même PR). Noms des nœuds déjà publics.

## Titre en base (David, 2026-11-19)

- Le titre s'affiche à ~27 endroits de l'appli (listes, tableau de bord de l'élève, cahier…).
  **Choix de David : titre composé stocké.** `title` reste toujours rempli ; sans titre libre,
  l'éditeur y écrit « Suites · Entraînement technique » et le tient à jour ; la case
  `worksheets.custom_title` (vrai par défaut : les 50 fiches existantes) dit si c'est un titre libre.
  Écartés : titre vide recalculé partout (PR énorme, fiche sans nom au premier oubli) ; deviner
  le titre libre en comparant au texte composé (fragile).
- **Question d'accès tranchée (David, « oui » sur ma reco)** : la case se lit comme la fiche ; le
  lien de partage la transmet (son PDF doit être celui de la classe ; il recevait déjà titre et
  notions, rien de nouveau, rien de personnel).
- Découpage : la PR 2 devient **2a** (migration de la case) puis **2b** (éditeur + PDF), après
  `db:migrate` + `db:types`.

## Découpage (validé par David, 2026-11-19)

1. ✅ **PR 1 — ADR + migration** (#2901, migration jouée le 2026-11-19) : table, colonne, garde de la règle, fonction SQL du PDF élève /
   partage (catégorie, notions, niveaux), tests d'intégration rouges puis verts ; `db:migrate`,
   `db:types`.
2. ✅ **PR 2a — case « titre libre »** (#2903, migration `20261119182829` jouée le 2026-11-19).
   ✅ **PR 2b — éditeur + PDF** (#2912, mergée le 2026-11-19) : choix catégorie/notions dans l'éditeur,
   titre composé, badge du niveau, bas de page, tous les cas de la synthèse. Fait aussi : la vue
   élève, l'aperçu d'affectation, le corrigé de classe et le lien de cours transmettent niveau,
   catégorie, case et notions au PDF ; la duplication les recopie ; crochets échappés.
   Décidé en cours de route (sans changer la synthèse) : fiche d'exercices au titre composé passée
   en évaluation → titre libre (notions seules, sans catégorie) ; gabarit de prof sans
   `{{title_sub}}` → titre complet « notions · catégorie ».
3. ✅ **PR 3a — plusieurs notions pour toute fiche** (décidé par David le 2026-11-19, au relevé
   des 50 fiches) : migration qui retire la garde (DROP de deux déclencheurs et d'une fonction,
   sans perte), éditeur en liste seule, `allowsSeveralNotions` retiré, notions toujours sous un
   titre libre, majuscule en tête de chaque notion (`notionLabel`), ADR 0041 amendé (#2928, migration `20261119222741` jouée).
   ✅ **PR 3b — reprise des 50 fiches** : page à cocher (relevé en bas du journal), écriture en
   prod par David, après le `deploy:prod` (#2939 ; 49 fiches vérifiées en prod le 2026-11-22).
4. ✅ **PR 4 — script des automatismes** (ADR 0011) : pose catégorie + notions (#2985, mergée le 2026-11-22).

## L'idée (David, 2026-11-19)

Une fiche de type « fiche d'exercices » a **de quoi elle parle** et **quel genre de fiche** elle est.
Son titre se compose des deux (la catégorie en plus petit) ; un titre libre, s'il est saisi,
remplace le titre composé.

Aujourd'hui, les deux sont écrits en dur dans le titre, de façons variées (mesuré en prod le
2026-11-19, 50 fiches) : « Entraînement technique — Suites » (12), « Fonctions affines :
entraînement technique », « Applications des suites » (11), « Automatismes : dérivation » (14),
titres libres (« Préparation Bac Blanc 1 », « Produit scalaire »…).

## Proposition initiale (périmée, remplacée par la synthèse)

- **De quoi ça parle** → un **nœud de l'arbre** (`classification_nodes` : branche, notion ou
  sous-notion), comme les exercices (ADR 0019 : « un champ par question posée »). Pas de texte
  libre, pas le mot « thème ». Ex. « Applications de la dérivation » → notion Dérivation.
- **Quel genre de fiche** → **catégorie de fiche**, liste fermée, propre aux fiches (≠ catégories
  d'exercice). Premier jet : Entraînement technique · Applications · Automatismes · Révisions ·
  Préparation d'évaluation. Seulement pour le type « fiche d'exercices ».
- **Titre** : composé (catégorie au-dessus en petit, nœud en grand, niveau dessous) ; titre libre →
  il remplace le titre composé.
- **Coût** : ADR, migration additive (deux colonnes sur `worksheets`, aucun nouvel accès), éditeur,
  générateur PDF (en-tête et bas de page), reclassement des 50 fiches (37 déductibles du titre,
  page à cocher ; 13 à la main).

## Questions de phase 0

1. ✅ **Tranché (David, 2026-11-19)** : quatre catégories — Entraînement technique · Applications ·
   Automatismes · Révisions. « Préparation d'évaluation » retirée : Révisions joue ce rôle.
2. ✅ ~~**Tranché (David, 2026-11-19)**~~ **remplacée par la 7** : fiche à plusieurs notions → **aucun nœud + titre libre**
   (« Préparation Bac Blanc 1 », catégorie Révisions au-dessus). Le nœud est donc facultatif, et
   unique quand il est posé.
3. ✅ **Tranché (David, 2026-11-19)** : le **niveau devient un badge** (forme courte « 1ère Spé »,
   cadre arrondi, **plein orange, texte blanc** — choisi sur maquette ; deux niveaux → deux badges), à gauche de l'en-tête en
   page 1 et au début du bas de page ; il quitte la ligne sous le titre. **Catégorie en petit SOUS
   la notion, en gris** (maquette : https://claude.ai/artifact/4NVjLSrbd7J7XNPzaC3cur). Bas de page : `[1ère Spé] Suites · Entraînement technique` (notion puis catégorie).
   Question d'origine : disposition du titre composé (catégorie au-dessus ou dessous, taille, couleur) ; et au bas de
   page : « Suites · Entraînement technique · 1ère Spé » ?
4. ✅ **Tranché (David, 2026-11-19, sur maquette)** : fiche avec une notion ET un titre libre → le
   titre libre **remplace tout**, catégorie effacée (option B). **Même règle sans notion** (David) : dès qu'un titre
   libre est saisi, seul lui s'imprime ; la catégorie reste enregistrée (classement), non imprimée.
   Corrige la réponse 2 (« Révisions au-dessus » ne s'imprime pas).
5. ✅ **Tranché (David, 2026-11-19)** : fiches en anglais → **noms anglais pour les nœuds de
   l'arbre** (option C), et donc pour les catégories. Rejetés : titre libre obligatoire (A),
   catégorie traduite + notion en français (B). **Chantier séparé, après celui-ci** (David). En attendant, fiche anglaise sans titre
   libre → catégorie en anglais seule (4 noms à traduire), sans notion.
6. ✅ **Tranché (David, 2026-11-19, « je te suis » sur la reco A)** : le **script** qui fabrique
   une fiche d'automatismes (ADR 0011) pose lui-même catégorie « Automatismes » + notion. Les 14
   fiches existantes sont reclassées avec les autres, d'après leur titre.
7. ✅ **Tranché (David, 2026-11-19)** : évaluation, examen, quiz, devoir maison → **titre écrit à
   la main, pas de titre composé, pas de catégorie** (badge du niveau comme partout), **mais
   possibilité de poser plusieurs notions**, **imprimées** (en petit sous le titre, ex. « Suites ·
   Dérivation »). Fiche d'exercices : on garde une seule notion, **sauf certaines catégories
   (Révisions…, liste à décider)** où plusieurs notions sont possibles et s'impriment aussi.
   → stockage en liste (0 à N nœuds par fiche). **Validé (David)** : plusieurs notions pour
   **Révisions et Automatismes** ; une seule pour Entraînement technique et Applications.
   Rendu validé : sans titre libre, les notions forment le titre (« Suites · Dérivation ·
   Probabilités », catégorie en gris dessous) ; avec un titre libre (ou titre écrit à la main des
   autres types), les notions en petit dessous.

## Lié

- Niveau de la fiche imprimé sous le titre et au bas de page : PR #2891 (chantier `pied-gidouille`).
  ⚠️ Corrigé le 2026-11-19 : les deux fonctions de partage rendent DÉJÀ `grades` (prod = dépôt,
  md5 vérifié), et l'élève lit la ligne `worksheets` par la RLS. Aucune migration pour le niveau :
  c'est le code (route élève, vue partagée) qui ne le transmet pas au PDF → PR 2.

## Reprise des 50 fiches : décisions et relevé (2026-11-19)

Décisions de David (questions posées au relevé) :

- **Automatismes (14)** : titre libre gardé (le numéro « (1) », « (2) » compte) ; catégorie
  Automatismes et notions posées, imprimées en petit sous le titre.
- **Plusieurs notions pour toute fiche** (« il faudrait finalement autoriser plusieurs notions
  dans les fiches d'exercices ») → PR 3a.
- **Suites** (« Entraînement technique — Suites », « Applications des suites ») : **titre composé
  long** (« Généralités sur les suites · Suites arithmétiques · Suites géométriques »,
  catégorie dessous).
- **Sous-notion en minuscule** (loi géométrique) : majuscule mise par le code → PR 3a.

Relevé en prod (MCP lecture, 2026-11-19) : 50 fiches, aucune catégorie ni notion posée, toutes
`custom_title` vrai. Croisé avec les notions principales des exercices de chaque fiche
(`exercise_classifications`). Déductibles du titre : « Entraînement technique — X » (12),
« Applications de X » (11), « Fonctions affines : … » (2), « Automatismes : … » (14). À voir une
à une : « Ensembles de nombres », « Fonctions : généralités », « Produit scalaire » (catégorie ?),
« Avant de commencer les fonctions polynômes du second degré », trois « Préparation… »
(Révisions ?), « Evaluation : Produit scalaire » (type fiche d'exercices : passer en
évaluation ?), trois évaluations (notions seules), « ESSAI (copie) (copie) » (ne pas toucher).
Correspondances non évidentes : Trigonométrie → « Fonctions trigonométriques » ; Polynômes du
second degré → « Second degré » ; Loi géométrique → sous-notion « loi géométrique » (Probabilités >
Autres lois). Les titres anglais (`translations.en.title`, une vingtaine de fiches) ne
s'impriment plus au titre composé (catégorie seule en anglais, décision 5).
