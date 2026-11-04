# Chantier « solide-vecteur » — tracer un vecteur sur un solide

> Origine : ligne 13 de [`outils-manquants.md`](outils-manquants.md) (« Tracer un vecteur sur un solide »),
> pour TSPE-334 « Représenter des combinaisons linéaires de vecteurs donnés » (BO Tle spé p.6 ; supports : cube,
> pavé, tétraèdre), classé C au lot 9 de terminale spé
> ([`questions-tspe-lot9`](../archive/wip/questions-tspe-lot9-progress.md), Q2). Bloc concerné : ` ```solide `
> ([ADR 0034](../adr/0034-solides-trois-blocs-un-noeud-une-scene-cavaliere.md), `docs/systeme/ubumark.md`
> § Solide en perspective cavalière). Modèle du geste : « Vecteur à tracer » du ` ```courbe ` (même doc).

## Reprendre ici

_Mis à jour le 2026-11-04, après #2372._

- **État** : v0.69.0 en prod (outil complet) ; brouillon TSPE-334 (`7ce9936b-7835-4b99-9e2b-f3644f2956af`)
  rangé sur « Géométrie > Espace > vecteurs de l'espace », tag TSPE-334 (#2372, `db:migrate` fait, vérifié MCP :
  `draft`, `updated_at` intact).
- **Prochaine action** : **David** relit le modèle en prod (`/dashboard/admin/questions/7ce9936b-7835-4b99-9e2b-f3644f2956af/preview`)
  et le publie ; ensuite, clore le chantier (ligne 13 de `outils-manquants.md`, versement, archivage du journal).
- **En attente de David** : relecture et publication du modèle.
- **Pièges en cours** : le geste ne vise que des points connus en 3D ; tétraèdre illisible (ligne 15 de
  `outils-manquants.md`) ; un point déclaré peut tomber sur un pointillé (vérifier le rendu).
- **Worktree / branche** : aucun (#2372 nettoyé).

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

## PR indice du nom d'un vecteur (2026-11-03)

Décision (a) de David : `w1` s'écrit w₁ sur la figure (écran : `tspan` abaissé ; PDF : `sub`), comme
`\vec{w_{1}}` de la phrase. La note « suivre la convention des points indicés » ne tient pas : les noms de
points (`O1`) sont en ligne partout (figure et `\overrightarrow{O1A}`), donc cohérents ; seuls les vecteurs
changent. Rendu vu (rendu serveur du composant ouvert dans Chrome) : w₁, v₂, u₁ u₂ u₃ lisibles sous leur
flèche. Tests vus rouges (scène, écran, PDF), compilation Typst réelle avec `v1 = OG`.

## Lot 3 — modèle TSPE-334 : phase 0 (2026-11-04, à valider)

Relevé prod (MCP, 2026-11-04) : TSPE-334 « Représenter des combinaisons linéaires de vecteurs donnés », nœud
« Géométrie > Espace > vecteurs de l'espace », **0 modèle**. Catégorie « Géométrie › Vecteurs, droites et plans
de l'espace › Sur une figure » : niveaux 1 à 5 pris (lot 9, publiés, tous niveaux scolaires confondus). Aucun
modèle en base n'utilise encore `tracer:` d'un ` ```solide `. En prod : le geste (lot 2) ; **pas encore** les
fractions ni les vecteurs nommés dans `tracer:` (D-SV2, #2347), ni l'indice (#2356).

**Un modèle**, `T_SPE`, « Espace : tracer une combinaison linéaire de vecteurs », réponse = le geste (une case,
`A/G`, jugée en 3D ; aucune réponse écrite à la main). Cube A(0;0;0)…H dans (AB, AD, AE) ; chaque cas tiré est
`k`, l'extrémité calculée par le script et vérifiée par une assertion. Corrigé : la relation de Chasles écrite,
plus la flèche juste dessinée par le geste.

| Var. | Figure                                                                                                                   | Exemples de cas                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| v0   | cube, origine imposée, coefficients ±1, vecteurs entre sommets                                                           | AB + AD depuis A (C) ; AB + AD + AE depuis A (G) ; AB − AD + AE depuis D (F) ; AE − AB depuis B (E) |
| v1   | cube, **origine libre** (tout représentant juste)                                                                        | AB + FG ; EF + BC + AE ; HG − HE                                                                    |
| v2   | cube, vecteurs donnés dessinés `u = AB, v = AD, w = AE`, milieux I, J, K, L de BF, CG, DH, AE déclarés (leurres compris) | u + ½ w depuis A (I) ; u + v + ½ w depuis A (J) ; v + ½ w depuis A (K) ; ½ w − u depuis B (L)       |
| v3   | tétraèdre SABC, `u = SA, v = SB, w = SC` dessinés, I milieu BC, G centre ABC                                             | ½ v + ½ w depuis S (I) ; ⅓ u + ⅓ v + ⅓ w depuis S (G) ; ½ v + ½ w − u depuis A (I)                  |

`testSpecs` : juste ; sens inversé (`C/A`) ; extrémité fausse (terme oublié) ; en v1, un second représentant juste.

### Questions

- **Q1** : un modèle, ces 4 variations ? Reco : oui (BO : « vecteurs donnés », supports cube et tétraèdre).
- **Q2 (niveau)** : niveau 6 de « Sur une figure » (1 à 5 pris et publiés) ? Reco : oui ; renuméroter des
  modèles publiés pour le mettre en tête coûterait une migration pour rien.
- **Q3 (ordre)** : v2 et v3 ont besoin de D-SV2 et #2356, pas en prod. Reco : PR des fichiers, puis
  `deploy:prod` (toi), puis `create-questions --publier` en brouillon (toi), rangement + tag, page à cocher,
  publication.
- **Q4 (accès)** : qui pourra lire quoi, qu'il ne pouvait pas lire avant ? Reco : personne (brouillon ; la
  migration ne pose que le nœud « vecteurs de l'espace » et le tag TSPE-334).

**D-SV3 (David, 2026-11-04, « je suis tes reco »)** : Q1 un modèle, 4 variations ; Q2 niveau 6 de « Sur une
figure » ; Q3 ordre : PR des fichiers, `deploy:prod`, brouillon, rangement + tag, page à cocher, publication ;
Q4 accès : personne. **v3 changée** (David, 2026-11-04, après l'aperçu) : le tétraèdre du bloc
(`pyramide triangle`) projette son sommet du fond presque sur le segment sommet – sommet de devant à droite
(écart < 3 mm, toutes hauteurs) : flèches confondues depuis le sommet, milieux et centre de gravité de la face
empilés depuis la base → v3 sur un **pavé droit** (`pave 6 6 7`, centres des faces ABCD, ABFE, BCGF et du
pavé) ; tétraèdre en ligne 15 de `outils-manquants.md`. Ligne 13 (geste) passée en « Livré ».

## Lot 3 — modèle écrit (2026-11-04)

- Script `docs/wip/questions/lot-tspe-334-tracer.py` → `scripts/questions/tspe-334-tracer/1-tracer-combinaison.json`
  (« Espace : tracer une combinaison linéaire de vecteurs », T_SPE, Sur une figure, niveau 6). Extrémités et
  règles (centres, Chasles) vérifiées en coordonnées par assertion ; une erreur de la phase 0 attrapée ainsi
  (HG − HE = EG, pas DB → cas remplacé par AB − AD).
- `create-questions` simulation : 28 specs vertes (justes, sens inversé, terme oublié, leurre voisin, second
  représentant en origine libre).
- Base locale, aperçu admin (Chrome) : v0 faux → « Ta flèche représente BF, pas AE − AB », flèche juste en vert,
  corrigé de Chasles ; v2 juste (K) ; v3 juste (O), corrigé lu ; 40 tirages, 17 cas sur 19, aucune formule en
  erreur ni figure indisponible. Pavé : J tombait sur le pointillé [DC] (`6 4 4`, `6 6 4`) → `6 6 7`.

## Lot 3 — brouillon en prod et rangement (2026-11-04)

- `deploy:prod` v0.69.0 (lancé par une autre session) : #2347 et #2363 en prod.
- Brouillon créé par David (`create-questions --publier`) : `7ce9936b-7835-4b99-9e2b-f3644f2956af`, [T_SPE],
  sans nœud ni tag. Relevé MCP : TSPE-334 actif, sur « Géométrie > Espace > vecteurs de l'espace » (active).
- Question d'accès posée, tranchée par David (« je te suis ») : personne ne gagne ni ne perd d'accès.
- Migration `20261104070713_questions_tspe_334_rangement_tags.sql` (forme du lot 9, un seul modèle) + test
  `tests/integration/questions-tspe-334-rangement-tags.test.ts` : 9 verts ; sans le bloc d'écriture, le
  nominal échoue au `beforeAll` (5 sautés) et 2 gardes ne se déclenchent pas.
- #2372 mergé (CI verte, `check:migrations` OK, `security-auditor` sans finding bloquant), `db:migrate` appliqué
  depuis `main` (seule migration en attente) ; vérification MCP : nœud et tag posés, `draft`, `updated_at` inchangé.
