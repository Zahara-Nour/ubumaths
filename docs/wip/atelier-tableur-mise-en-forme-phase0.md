---
title: Atelier — tableur intégré : la mise en forme des cases (phase 0)
date: 2026-10-18
status: phase 0 PROPOSÉE, à valider par David (Q-MF-1 à Q-MF-5)
---

# Atelier — tableur intégré : la mise en forme des cases

Le tableur intégré est complet (lots 1 à 5, #1410 → #1439, pas encore en prod). Demande de David
(2026-10-18), après l'inventaire de `/spreadsheet` : reprendre dans l'atelier **la mise en forme**
de V4. Phase 0 du tableur : [atelier-tableur-phase0.md](atelier-tableur-phase0.md). Journal :
[atelier-tableur-progress.md](atelier-tableur-progress.md).

## Ce que fait V4 (`/spreadsheet`), mesuré le 2026-10-18

- Gras, italique (boutons, Ctrl/⌘+B et +I).
- Alignement gauche, centre, droite (les nombres à droite par défaut).
- 8 couleurs de texte et 8 de fond, en palettes fixes.
- Formats de nombre : Nombre, Pourcentage (×100, 0 décimale), Monnaie (€) ; pas de réglage du
  nombre de décimales.
- « Effacer le formatage » ; une seule case à la fois ; ni annulation, ni recopie.

## Déjà décidé (rappel)

- **Q2 / Q-L3-2** — Une case montre sa valeur exacte courte, un décimal fini en décimal, sinon
  `≈` et 4 décimales ; la valeur exacte se voit sous la barre (option 3 : seulement si elle vient
  d'une division).
- **T6** — Ctrl+Z défait un geste de la grille.
- **Q4** — Le lien contient tout, ou il est refusé (plafond : 1 800 caractères compressés).
- **Lot 2** — Recopie (Ctrl+D, poignée, bouton) et copier-coller interne décalent les formules.
- **Règle 2 du projet** — un choix dans une liste passe par `MySelect`.

---

## Comportements proposés

### 1. Ce qu'on peut mettre en forme

- **Nominal** — Sur la **zone sélectionnée** (une case ou plusieurs, Q-MF-2) :
  - **gras** et _italique_ (boutons, Ctrl/⌘+B, Ctrl/⌘+I) ;
  - **alignement** gauche, centre, droite ;
  - **couleur du texte** et **couleur du fond**, dans une palette de 6 couleurs du thème, lisibles
    en mode clair comme en mode sombre (Q-MF-3) ;
  - **format de nombre** (Q-MF-1) :
    - **Nombre à n décimales** (0 à 6) : `=1/3` → `0,33` ; `=2` → `2,00` ;
    - **Pourcentage** (n décimales) : `0,125` → `12,5 %` ;
    - **Monnaie** (€, 2 décimales) : `12,5` → `12,50 €`.
- **Nominal** — Une barre d'outils au-dessus de la grille, à côté de la barre de formule : `G`, `I`,
  les trois alignements, les deux couleurs, le format de nombre (`MySelect`), « Effacer la mise en
  forme ». Sur téléphone, elle passe à la ligne.
- **Nominal** — Les boutons montrent l'état de la case sélectionnée (`G` enfoncé si elle est en
  gras), et le disent aux lecteurs d'écran (`aria-pressed`).

### 2. Ce que la mise en forme change, et ce qu'elle ne change pas

- **Nominal** — Elle ne change que l'**affichage** de la case. La valeur reste la même : une
  formule qui cite une case affichée `12,50 €` calcule avec 12,5 ; les statistiques d'une liste
  aussi.
- **Nominal** — Un format de nombre arrondit l'affichage, jamais la valeur : `=1/3` en
  « 2 décimales » montre `0,33`, et la barre garde « Valeur exacte : 1/3 ». Un mot ou une erreur
  n'est pas touché par un format de nombre.
- **Nominal** — Une case vide peut être mise en forme : on prépare une colonne « Monnaie », puis on
  tape. Vider une case (Suppr) garde sa mise en forme ; « Effacer la mise en forme » la retire.
- **Nominal** — Le CSV téléchargé et la copie vers un autre logiciel gardent les **valeurs**, sans
  mise en forme (comme aujourd'hui).
- **Nominal** — Une colonne nommée (une liste) se met en forme comme les autres ; sa carte montre les
  valeurs, pas leur mise en forme.

### 3. Recopie, copier-coller, annuler (Q-MF-4)

- **Nominal** — Mettre en forme est un geste de la grille : Ctrl+Z le défait (T6).
- **Nominal** — La recopie (Ctrl+D, poignée) et le copier-coller **dans** la grille emportent la mise
  en forme, comme dans LibreOffice. Un collage venu d'un autre logiciel n'apporte que les valeurs.

### 4. Sauvegarde et lien (Q-MF-5)

- **Nominal** — La mise en forme est rangée avec la grille, et voyage dans le lien.
- **Technique** — Elle est rangée **par zone** (`A1:B20 → gras, monnaie`), pas case par case :
  mettre en forme une colonne de 200 cases coûte une ligne, et le lien tient sous son plafond.
- **Limite** — Un atelier reçu et gardé (T7) : ses zones de mise en forme suivent ses colonnes.

---

## Questions — à trancher par David

**Q-MF-1 — Quels formats de nombre ?**

- **(a)** Ceux de V4 (Nombre, Pourcentage, Monnaie), **plus le nombre de décimales** (0 à 6).
- **(b)** Exactement ceux de V4.

**Reco (a).** « Arrondir au centième » est le geste le plus courant au collège ; V4 l'imposait à
2 décimales sans réglage. Pourcentage et Monnaie prennent aussi le nombre de décimales.

**Q-MF-2 — Une case, ou la zone sélectionnée ?**

- **(a)** La zone sélectionnée (une case, une colonne, un bloc).
- **(b)** Une case à la fois, comme V4.

**Reco (a).** La grille de l'atelier sait déjà sélectionner une zone ; mettre en forme une colonne
case par case serait pénible.

**Q-MF-3 — Quelles couleurs ?**

- **(a)** 6 couleurs du thème (rouge, orange, jaune, vert, bleu, violet), en texte et en fond, dont
  le contraste est vérifié en clair et en sombre.
- **(b)** Les 8 couleurs fixes de V4.

**Reco (a).** Les couleurs fixes de V4 ne suivent pas le mode sombre (un fond jaune clair y rend le
texte illisible). Six suffisent à surligner ou à classer.

**Q-MF-4 — La recopie et le copier-coller emportent-ils la mise en forme ?**

- **(a)** Oui, dans la grille ; un collage venu d'ailleurs, non.
- **(b)** Non, seulement les contenus.

**Reco (a).** C'est ce qu'attend quelqu'un qui a déjà utilisé un tableur.

**Q-MF-5 — La mise en forme voyage-t-elle dans le lien ?**

- **(a)** Oui, rangée par zone pour rester légère.
- **(b)** Non : elle reste dans le navigateur.

**Reco (a).** Q4 (« le lien contient tout ») ; un professeur qui partage un tableau mis en forme
veut que l'élève le voie pareil.

**Alignement par défaut** — sans objet : la grille cale déjà un nombre à droite et un mot à gauche
(`td.nombre`, `DataView.svelte`, vérifié le 2026-10-18) ; un alignement choisi le remplace.

---

## Découpage en PR

1. **Le modèle** : les zones de mise en forme dans l'`Atelier` (poser, retirer, annuler, recopie,
   copier-coller, sauvegarde, lien, fusion) et l'affichage (formats de nombre). Tests en node.
2. **La barre d'outils** : boutons, `MySelect`, raccourcis, `aria-pressed`, couleurs du thème,
   affichage dans les cases. Tests dans un vrai navigateur, captures en clair et en sombre.

Doc : [atelier.md](../systeme/atelier.md) à chaque PR (section « La grille »).
