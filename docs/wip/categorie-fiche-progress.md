# Catégorie et notion d'une fiche d'exercices — journal

## Reprendre ici

_Mis à jour le 2026-11-19, PR 2a en cours._

- **État** : PR 1 mergée (#2901, migration jouée) · **PR 2a en cours** (`feat/categorie-fiche-editeur`) : migration `20261119182829_titre_libre_fiche.sql` (case `worksheets.custom_title` + les deux fonctions de partage), tests d'intégration rouges sans elle puis verts · **Prochaine action** : PR 2a mergée → `db:migrate` → `db:types` → PR 2b (éditeur + PDF) dans le même worktree, nouvelle branche · **En attente de David** : rien · **Pièges en cours** : `title` toujours rempli (titre composé écrit par l'éditeur quand `custom_title` est faux) ; retirer les notions en trop AVANT de passer en catégorie à une notion (23514) ; duplication (`api/worksheets/[id]/duplicate`) et publication en chapitre recopient catégorie + notions + `custom_title` ; la route élève ne sélectionne pas `grades` ; FK RESTRICT ; maquette : catégorie en italique minuscule gris `#5a5a5a` · **Worktree** : `../ubumaths-wt-categorie-fiche` · **Maquette** : https://claude.ai/artifact/4NVjLSrbd7J7XNPzaC3cur

## Synthèse de la phase 0 (2026-11-19)

- **Catégorie de fiche** (fiche d'exercices seulement) : Entraînement technique · Applications ·
  Automatismes · Révisions.
- **Notions** (nœuds de l'arbre) : fiche d'exercices → 0 ou 1 notion, **plusieurs pour Révisions
  et Automatismes** ; évaluation, examen, quiz, devoir maison → 0 à N notions, pas de catégorie.
- **Rendu page 1** : badge(s) du niveau à gauche (forme courte, plein orange, texte blanc), QR à
  droite. Au centre : sans titre libre → notion(s) en grand (« Suites · Dérivation »), catégorie
  en petit gris dessous ; titre libre (ou titre des autres types) → lui en grand, et dessous les
  notions **seulement si la fiche en admet plusieurs** ; jamais la catégorie sous un titre libre.
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
2. **PR 2a — case « titre libre »** (migration `20261119182829`, tests d'intégration).
   **PR 2b — éditeur + PDF** : choix catégorie/notions dans l'éditeur, titre composé, badge du
   niveau, bas de page, tous les cas de la synthèse.
3. **PR 3 — reprise des 50 fiches** : page à cocher (déduit du titre), écriture en prod par David.
4. **PR 4 — script des automatismes** (ADR 0011) : pose catégorie + notions.

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
