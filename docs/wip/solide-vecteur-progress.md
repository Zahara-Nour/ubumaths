# Chantier « solide-vecteur » — tracer un vecteur sur un solide

> Origine : ligne 13 de [`outils-manquants.md`](outils-manquants.md) (« Tracer un vecteur sur un solide »),
> pour TSPE-334 « Représenter des combinaisons linéaires de vecteurs donnés » (BO Tle spé p.6 ; supports : cube,
> pavé, tétraèdre), classé C au lot 9 de terminale spé
> ([`questions-tspe-lot9`](../archive/wip/questions-tspe-lot9-progress.md), Q2). Bloc concerné : ` ```solide `
> ([ADR 0034](../adr/0034-solides-trois-blocs-un-noeud-une-scene-cavaliere.md), `docs/systeme/ubumark.md`
> § Solide en perspective cavalière). Modèle du geste : « Vecteur à tracer » du ` ```courbe ` (même doc).

## Reprendre ici

_Mis à jour le 2026-11-03, après #2347._

- **État** : lots 1 (#2331), 2 (#2339) et D-SV2 (#2347 : fractions de dénominateur ≤ 4, vecteurs nommés de
  `vecteurs:` dans `tracer:`) mergés, pas en prod. Revue Opus de #2347 : 0 erreur de correction ; zéros en tête
  (`1/04`) désormais refusés, tests d'extrémité ajoutés.
- **Prochaine action** : lot 3 (modèle TSPE-334), nouveau worktree
  `git worktree add -b feat/solide-vecteur-modele ../ubumaths-wt-solide-vecteur origin/main`. En ouverture du
  lot : étiquette indicée sur la figure (`w1` → w₁, comme `\vec{w_{1}}` de la phrase), tranché (a) par David le
  2026-11-03 ; suivre la convention des noms de points indicés déjà affichés sur les solides.
- **En attente de David** : rien.
- **Pièges en cours** : le geste ne vise que des points connus en 3D (`solideClickablePoints`) ; une
  combinaison dont l'extrémité ne tombe sur aucun point touchable est refusée. `stroke-width` explicite sur
  tout cercle SVG du geste. Une ligne `vecteurs:` fausse masque les erreurs de `tracer:` (voulu). Code en
  ligne : nombre pair de backticks.
- **Worktree / branche** : aucun (D-SV2 nettoyé).

---

## Existant (relevé du 2026-11-03)

- ` ```solide ` dessine cube, pavé, prisme, pyramides, solides ronds en perspective cavalière ; sommets nommés
  (`sommets:`), `marquer: face | arete | sommet`, `cotes:`, `section:`. **Aucune flèche, aucun point hors
  sommet** (piège noté au lot 9 : F1-F8 écrivaient les vecteurs dans l'énoncé).
- Le ` ```courbe ` a déjà le geste `tracer: vecteur (3 ; -2) [depuis A]` (`CourbePlacer.svelte`,
  `utils/courbe-vecteur.ts`) : boutons « Origine » / « Extrémité », flèche, réponse `x1;y1/x2;y2`, phrases
  d'erreur (sens inversé, coordonnées échangées), correction en vert, PDF repère seul / `solved` avec la flèche.
- Les gestes des autres genres du nœud `espace` (`cubes` : `dessiner:` / `retrouver:` ; `patron` : `designer:` /
  `completer:`) suivent le même contrat : un geste par bloc, une case, aiguillage par genre.

## Phase 0 (2026-11-03, validée)

### Ce que verra l'élève (nominal)

1. **Vecteurs donnés dessinés** (affichage) : `vecteurs: AB, AE` dans un ` ```solide ` dessine des flèches
   entre deux points nommés ; `vecteurs: u = AB` pose aussi l'étiquette $\vec{u}$ au milieu de la flèche.
2. **Tracer une combinaison** (geste) : `tracer: vecteur AB + AD - 1/2 AE` (somme de vecteurs entre points
   nommés, coefficients entiers ou demis), `depuis A` facultatif. L'élève touche un point pour l'origine, puis
   un point pour l'extrémité, parmi les **points cliquables** (sommets, plus les points déclarés, Q1) ; une
   flèche se dessine. Origine imposée : posée d'office, seul le bouton « Extrémité » reste.
3. **Juge** : juste si extrémité − origine = la combinaison (calcul en 3D sur les coordonnées du solide, donc
   n'importe quel représentant quand l'origine est libre), et si l'origine est A quand elle est imposée. Une
   case, réponse `A/G` (noms des deux points).
4. **Phrases** : « Il faut placer l'origine et l'extrémité. » ; « Ton origine et ton extrémité sont au même
   endroit. » ; sens inversé : « Ta flèche va dans le mauvais sens. » ; sinon « Ta flèche représente
   $\overrightarrow{AC}$, pas $\overrightarrow{AB}+\overrightarrow{AD}-\frac{1}{2}\overrightarrow{AE}$. »
5. **Correction** : la flèche juste en vert, depuis l'origine imposée (sinon depuis le premier point du premier
   vecteur de la combinaison). **PDF** : le solide seul ; `solved` dessine la flèche juste.

### Limites et erreurs (message au prof, cadre « Solide indisponible » pour l'élève)

- Solides : **polyèdres seulement** (cube, pavé, prisme, pyramides dont le tétraèdre) ; solides ronds refusés.
- Refusé : nom de point inconnu, vecteur nul, combinaison dont l'extrémité ne tombe sur **aucun point
  cliquable** depuis l'origine imposée (ou depuis aucun point si l'origine est libre), `depuis A` sans A, deux
  lignes `tracer:`.
- `vecteurs:` et `tracer:` peuvent aller ensemble (vecteurs donnés dessinés, combinaison à tracer).

### Questions

- **Q1 (points cliquables)** : sommets seuls, ou aussi des points déclarés par l'auteur (`points: I milieu AE,
O centre ABCD`), dessinés et nommés ? Reco : **points déclarés** — les manuels utilisent milieux et centres
  (coefficients ½), et cela lève aussi le piège « pas de point hors sommet » du lot 9. Pas de milieux
  automatiques : 26 points sur un cube brouilleraient la figure.
- **Q2 (origine)** : imposée seulement, libre seulement, ou les deux (`depuis A` facultatif) ? Reco : **les
  deux**, comme le ` ```courbe ` ; origine libre = l'élève choisit un représentant.
- **Q3 (vecteurs donnés en flèches)** : la clé d'affichage `vecteurs:` dans ce chantier (lot 1, avant le
  geste) ? Reco : **oui** — « vecteurs donnés » du BO, et les modèles du lot 9 pourraient s'en servir.
- **Q4 (modèle TSPE-334)** : écrire le modèle de terminale spé dans ce chantier, une fois l'outil en prod
  (démarche `couvrir-niveau`, lot à part) ? Reco : **oui**, dernier lot.
- **Q5 (accès)** : qui pourra lire quoi, qu'il ne pouvait pas lire avant ? Reco : **personne** — l'outil ne
  touche pas la base ; le modèle de 334 arrivera en brouillon, rangé et tagué par migration comme les autres.

**D-SV (David, 2026-11-03, réponses aux questions)** : Q1 points déclarés (`points: I milieu AE, O centre
ABCD`), pas de milieux automatiques ; Q2 origine imposée ou libre (`depuis A` facultatif) ; Q3 `vecteurs:` en
lot 1 ; Q4 modèle TSPE-334 en dernier lot ; Q5 accès : personne ne gagne ni ne perd d'accès.

### Lots proposés

1. Affichage : `points:` (si Q1) et `vecteurs:` — parseur, scène, écran, PDF, catalogue, doc.
2. Geste `tracer: vecteur` — parseur, juge, phrases, `SolideGeste.svelte` (ou équivalent), correction, PDF.
3. Modèle TSPE-334 (si Q4) : brouillon, rangement + tag, page à cocher, publication.

Agents : `pedagogy-expert` (Opus) pour le juge et les phrases ; `frontend-developer` (Sonnet) pour le geste ;
revue `code-reviewer` en `model: opus` sur chaque PR (correction des réponses).

## Lot 1 — affichage `points:` + `vecteurs:` (2026-11-03)

- Parseur : `points:` (`milieu`, `centre` d'une face, `centre ABCDEFGH` pour cube / pavé), `vecteurs:` (`AB`,
  `u = AI`) ; polyèdres nommés seulement ; au plus 8 de chaque ; vecteur nul refusé en 3D.
- Scène : `SolideScene.points`, `SolideScene.arrows` (petite flèche au-dessus d'un nom de vecteur) ; noms posés
  sans toucher étiquette, trait ni point (`firstFree`, `segmentHitsBox`). Vérifié au rendu sur 4 figures (cube,
  tétraèdre, pavé, cube à flèches croisées) : premier jet, la lettre v touchait la flèche w → évitement des
  traits ajouté.
- Écran `Solide.svelte`, PDF `espace-typst.ts` (compilation réelle testée), catalogue (2 exemples, 1 erreur),
  doc `ubumark.md`. Tests : `solide-vecteurs.test.ts` (19, vus rouges), `Solide.svelte.test.ts` (+1).

## Lot 2 — geste `tracer: vecteur` (2026-11-03)

- Worktree créé ; logique confiée à pedagogy-expert (Opus), écran à frontend-developer (Sonnet).
- PR #2339 ouverte : logique (pedagogy-expert), écran (frontend-developer). Rendu vu dans Chrome : disque
  d'origine géant (pas de `stroke-width` → 1 cm de contour) et pointe cachée par le disque d'extrémité, corrigés
  avec test vu rouge. Exemple `AB + AD - 1/2 AE depuis A` refusé sur un cube (hors du cube) → catalogue en
  `+ 1/2 AE` avec `points: I milieu CG`.

**D-SV2 (David, 2026-11-03, choix hors spec du lot 2)** : « Il faut placer l'extrémité. » (origine imposée,
rien posé) et « Ta flèche ne part pas de l'origine imposée. » (garde-fou) gardés ; flèche juste du PDF corrigé
en **noir** (comme le ` ```courbe `) ; refus du coefficient nul et de plus de 6 vecteurs gardés. **Changent**
(PR de suite, après #2339) : coefficients **fractions simples, dénominateur ≤ 4** (tiers : `G centre BCD`) ;
**vecteurs nommés de `vecteurs:` admis dans `tracer:`** (`tracer: vecteur 2 u - v`, TSPE-334 « vecteurs
donnés »).

- #2339 mergé (d0e468c). Revue Opus : phrase « extrémité » dans la correction (origine imposée) et en origine
  libre posée, exemple refusé retiré de l'aide, zones de toucher disjointes (demi-distance), nom accessible de
  la figure de correction.

## PR D-SV2 — fractions et vecteurs nommés dans `tracer:` (2026-11-03)

**Phase 0 validée (David, 2026-11-03)** : coefficients entiers ou fractions de dénominateur 2, 3 ou 4 ;
**fraction réductible refusée** (`2/4` → « écrire 1/2 », la phrase de l'élève reprend l'écriture de
l'auteur) ; vecteur de `vecteurs:` écrit par son nom dans `tracer:` (`2 u - v`, mélange avec `AB` permis),
phrases en $\vec{u}$ ; nom inconnu → « u : aucun vecteur de ce nom dans vecteurs: ». Accès : personne.

- Codé dans la session (pas d'agent : 3 fichiers de logique). Tests `solide-gestes.test.ts` : 10 vus rouges,
  puis verts. `SolideVectorTerm.name` (facultatif) garde le nom pour les phrases. Catalogue : exemple
  tétraèdre (`1/3 u + 1/3 v + 1/3 w depuis S` → G) et erreur `2/4`.
