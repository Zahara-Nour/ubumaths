# Catégorie et notion d'une fiche d'exercices — journal

## Reprendre ici

_Mis à jour le 2026-11-19, phase 0 : 7 questions tranchées (rien de codé)._

- **État** : comportements tranchés, voir « Synthèse de la phase 0 » · **Prochaine action** : faire valider la synthèse à David, puis poser la question d'accès et proposer le stockage (liste de nœuds par fiche, à ne pas trancher seul) avant ADR + migration · **En attente de David** : validation de la synthèse · **Pièges en cours** : « thème » est un mot retiré (CONTEXT.md) → la fiche pointe des nœuds de l'arbre (ADR 0019) ; la « Proposition » plus bas (deux colonnes, catégorie au-dessus) est **périmée** · **Worktree / branche** : aucun (à créer : `feat/categorie-fiche`) · **Maquette** : https://claude.ai/artifact/4NVjLSrbd7J7XNPzaC3cur (à mettre à jour : plusieurs notions)

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
  Le PDF de l'élève et celui d'un lien de partage n'ont pas les niveaux (fonction SQL sans
  `grades`) : migration à décider, question d'accès « l'élève et le visiteur d'un lien de partage
  pourront lire le niveau de la fiche ».
