# Chantier `idees-3e-transformations` — idées reprises d'ailleurs, rubrique « Homothétie et rotation » de 3e

## Reprendre ici

_Mis à jour le 2026-11-27, après la relecture de David._

- **État** : 4 brouillons en prod, rangés, **validés par David** (« je valide », 2026-11-27). Simulation de
  `publier-lot.ts` : les 4 passent le contrôle.
- **Prochaine action** : après la publication, relire le statut des 4 (`publier-lot.ts` en simulation : « publié »),
  puis clore le chantier (versement, journal archivé).
- **En attente de David** : la publication, `publier-lot.ts --dir` sur le dossier du lot, avec `--publier`.
- **Pièges en cours** : un point à `placer:` dans un ` ```courbe ` ne peut pas s'appeler `A'` ; un nom de point de
  ` ```figure ` refuse `'` et `′` ; la variable `i` est lue comme l'imaginaire ; `git restore` après un essai local
  annule aussi les fichiers régénérés depuis le dernier commit. Un modèle « ESSAI LOCAL pavage triangles » traîne
  dans la base locale seulement.
- **Worktree / branche** : aucun (retiré par `pr:merger`).

## Phase 0 (2026-11-27)

8 exercices lus (plus 2 « flash ») : 1 ✅, 1 🟡, 8 ❌. Tout est **hors programme** du cycle 4 : rotation et homothétie
sont absentes du BO en vigueur (`docs/systeme/programmes/bornes/cycle4.md`, n° 13). Les modèles sont rangés
**sans point**, `grades` = 3, comme 1584c3b5 (agrandissement, `idees-3e-thales`). Nœuds existants et vides :
« Géométrie > Rotations », « Géométrie > Homothéties ».

Question d'accès de la migration : **personne ne gagne d'accès**, on range des modèles du prof.

### Fiches

- **N1 — Image d'un point par une rotation, sur quadrillage** (modèle neuf, nœud Rotations, sans point,
  5 variations). Chez eux (3G10-2, can3G1-02) : grille de 100 points numérotés, l'élève tape le numéro de l'image.
  Chez nous : l'élève **place** le point (figure à compléter sur quadrillage, `point A' = rotation(A, centre=O,
angle=90)`), le numéro ne servait qu'à répondre sans placer. (a) quart de tour, sens inverse des aiguilles d'une
  montre, A à 1 à 4 carreaux de O en x et en y ; (b) quart de tour dans le sens des aiguilles ; (c) demi-tour (le
  corrigé fait le lien avec la symétrie de centre O, 5e) ; (d) image d'un triangle ABC par un quart de tour (trois
  points jugés ensemble) ; (e) dans un repère (3G10-1) : A et le centre donnés **par leurs coordonnées**, centre hors
  de l'origine (−3 à 3), l'élève place A' (` ```courbe ` `placer:`). Coups de pouce : « Trace [OA], puis tourne-le
  d'un quart de tour autour de O : OA' = OA ». Erreurs typiques (specs refusées) : le sens inversé, le symétrique
  par rapport à O, l'image par la translation de vecteur OA.
- **N2 — Image d'un point par une homothétie, sur quadrillage** (modèle neuf, nœud Homothéties, sans point,
  5 variations). Chez eux (3G10-2, 3G11) : numéro tapé, ou construction sur papier uni avec cible. Chez nous : figure
  à compléter sur quadrillage, `point A' = homothetie(A, centre=O, rapport=k)`. (a) k = 2 ou 3 ; (b) k = 1/2 (écarts
  pairs, l'image tombe sur un nœud) ; (c) k = −1 ou −2 ; (d) image d'un segment [AB] par k = 2 ou −2 (deux points) ;
  (e) dans un repère, coordonnées données, k ∈ {2 ; −2 ; 1/2 ; 1,5}, centre hors de l'origine. Erreurs typiques :
  le mauvais côté de O (signe oublié), A' à k carreaux **de A** (OA' = (k + 1) OA), 1/k au lieu de k.
- **N3 — Calculs liés à une homothétie** (modèle neuf, nœud Homothéties, sans point, 7 variations). Chez eux (3G13,
  3G11-1) : une case nombre (fraction acceptée), un QCM à 4 pour l'encadrement, un tableau à cocher
  réduction / agrandissement. Chez nous : la position est dite en texte (« A et A' du même côté de O » / « A, O et A'
  alignés dans cet ordre ») avec une figure à main levée. (a) k depuis OA et OA' (k = ±OA'/OA) ; (b) OA' depuis OA et
  k ; (c) OA depuis OA' et k ; (d) deux étapes : k depuis OA, OA', puis A'B' depuis AB ; (e) k depuis OA et AA' ;
  (f) encadrer k : choix à 4 (k < −1, −1 < k < 0, 0 < k < 1, k > 1), qui reprend aussi 3G11-1 (le choix à deux
  « réduction / agrandissement » est du hasard à 50 %) ; (g) aire de l'image, **rapport négatif** (aire × k²).
  Plages : |k| = n/10 (n de 2 à 9 ou de 15 à 40, n ≠ 10) ou n/d (d de 2 à 5), longueurs entières de 2 à 12 cm,
  résultats exacts à deux décimales au plus. Erreurs prévues (case) : OA/OA' (rapport inversé), le signe oublié
  ou ajouté, OA × k au lieu de OA' / k en (c), AA'/OA en (e), aire × k ou aire négative en (g).
- **N4 — Image d'une figure par une rotation dans un pavage** (modèle neuf, nœud Rotations, point : **Q2**,
  3 variations). Chez eux (3G12, 3G12-1) : 7 pavages, numéro de la figure image tapé. Chez nous : ` ```figure ` d'un
  pavage numéroté, une case nombre (le numéro est ici la vraie réponse : on désigne une pièce). (a) pavage de carrés
  (4 × 4), quart de tour autour d'un sommet ; (b) même pavage, demi-tour ; (c) pavage de triangles équilatéraux,
  rotation de 60° ou 120° autour d'un sommet (si le dessin passe `sonde-figures`, sinon la variation tombe). Erreurs
  typiques : le sens inversé, la pièce voisine (centre mal lu), l'image par une translation.
- **O1 — Outil manquant : construire l'image sur papier uni** (3G10-3, 3G11, 3G10-1 à 60°/120°). Rotation d'angle
  quelconque (rapporteur et compas), homothétie de rapport décimal (règle graduée), réseau triangulaire. Le contrôle
  `point` sur papier uni refuse ces expressions. Recommandation : le noter dans `outils-manquants.md` (§ 2,
  transformations), **pas maintenant** (hors programme).
- **R — Rien** : can3G1-01 (aire × k²) est couvert par 1584c3b5 ; les symétries et la translation de 3G10-1 sont
  publiées (5e, 4e, 3e).

### Réponse de David (2026-11-27)

« Je te suis » : toutes les recommandations sont suivies. N1 à N4 : oui. O1 : noté (`outils-manquants.md` n° 71), pas
maintenant. Q1 : oui, sans point. Q2 : sans point. La page à cocher est restée vide.

### Questions

- **Q1 — Garder ces modèles hors programme, rangés sans point ?** Recommandation : oui, comme en Seconde et pour
  `idees-3e-thales`. Non = la rubrique s'arrête là (relevé gardé).
- **Q2 — Point de N4 (pavage)** : sans point, ou 1TECHNO-114 « Analyser un pavage et en rechercher un motif
  élémentaire » (STD2A seulement), avec le niveau 1re techno dans `grades` ? Recommandation : **sans point**. Le
  point STD2A demande de trouver le motif d'un pavage, pas l'image par une rotation : ce serait un tag approximatif.

## Lot (2026-11-27)

Écarts aux fiches, écrits dans l'en-tête du script : N3 tire |k| = n/10 seulement (un rapport n/d rendrait les
longueurs non décimales), demande k « en écriture décimale », et ses corrigés n'écrivent jamais |k| (la notation
de la valeur absolue est hors des bornes du cycle 4) ; N3 (b) et (c) ont deux erreurs prévues ; N1 (e) et N2 (e)
nomment B le point à placer ; N4 (c) a six configurations fixes, pavage numéroté rangée par rangée.

## En prod (2026-11-27)

David a publié les brouillons (`create-questions --publier`) : 4c82bef9 (N1), a5e70b85 (N2), 277be356 (N3),
bc6321ed (N4), `draft`, `grades` = 3, vérifiés en prod. Migration de rangement générée
(`migration-rangement.ts`), sans tag, nœuds Rotations et Homothéties.

## Relecture (2026-11-27)

David : « je valide », les 4 sans correction. `publier-lot.ts` en simulation : 4 brouillons passent le contrôle.
