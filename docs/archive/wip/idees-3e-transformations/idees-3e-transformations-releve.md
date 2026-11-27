# Relevé `idees-3e-transformations` — rubrique « Homothétie et rotation » de 3e (3G1)

_Relevé le 2026-11-27, dans le code de la copie locale (8 exercices, plus 2 « flash » de la même rubrique). Nos modèles
relevés en prod (lecture seule) le même jour._

## Bornes

- **Hors programme** : rotation et homothétie sont absentes du BO de cycle 4 en vigueur
  (`docs/systeme/programmes/bornes/cycle4.md`, bornes générales n° 13 : « Aucun point ne doit les générer »). Elles
  ne sont pas non plus au programme de Seconde, ni dans un autre programme du dépôt, sauf la 1re techno, série
  STD2A seulement : « frises et pavages », « transformations du plan » (1TECHNO-015, 016, 018, 019, 109, 110, 114).
- Précédents : Seconde (2026-11-20), puis `idees-3e-thales` (agrandissement H1, triangles semblables H2). Les modèles
  hors programme sont **gardés et rangés sans point**.
- Nœuds existants, **vides** : « Géométrie > Rotations » (`e71ca26c`), « Géométrie > Homothéties » (`30509bf4`),
  notions sans sous-notion. « Géométrie > Agrandissement et réduction » porte 1584c3b5 (aires et volumes, k², k³).

## Nos modèles

Aucun modèle de rotation ni d'homothétie au collège ou au lycée. Seuls deux brouillons de Terminale expertes
(8d69e3a9, 93539700 : matrices). Symétries (CE2 à 5e), translations (4e, 3e : e7ef2835, 0150ef82, c8306505) et
1584c3b5 (agrandissement, 3e, sans point) sont publiés.

Outils : le langage des figures a `rotation(M, centre=O, angle=θ)` et `homothetie(M, centre=O, rapport=k)`
(`docs/systeme/geometrie/dsl-builtins.md`). Le contrôle `point A' = …` de la figure à compléter calcule le point
attendu par ce langage (`src/lib/questions/construction/positions.ts`). **Sur quadrillage**, toute expression qui
tombe sur un nœud est jugeable ; **sur papier uni**, seuls le symétrique, le milieu, le centre du cercle circonscrit
et le 4e sommet d'un parallélogramme le sont (`point.ts`). Message d'erreur générique hors symétrie (« Ce point n'est
pas à sa place »). Repère à placer : ` ```courbe ` `placer:`.

## Relevé

| Id        | Ce qu'on demande                                                                                                                                                                                                                                                                                                                                                                      | Forme de réponse chez eux                                      | Nos modèles                                   | Verdict                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 3G10-1    | Coordonnées de l'image de A, B, C dans un repère, par 3 transformations au choix (défaut 4-5-6 : rotation, homothétie décimale, homothétie fractionnaire). Rotation de 90° (sens direct ou indirect), 60°, 120° ; homothétie k ∈ {1,5 ; 2 ; 2,5 ; 3 ; −1 ; −1,5 ; −2 ; −2,5 ; −3} ou 1/k, k ∈ {±2, ±4, ±5}. Centre O' de −3 à 3, points de −7 à 7. Symétries et translation en option | Deux nombres par point (coordonnées), une question à 3 parties | Symétries, translation : publiés (5e, 4e, 3e) | ❌ rotation, homothétie → **N1 (e)**, **N2 (e)** ; 60°/120° → **O1**                               |
| 3G10-2    | Grille de 100 points numérotés : donner le numéro de l'image par une rotation de 90° (centre O), une homothétie (k ∈ ±{1 ; 1,5 ; 2 ; 2,5 ; 3 ; 4 ; 5} ou ±1/2, ±1/3, ±1/4) ou une translation                                                                                                                                                                                         | Le numéro tapé                                                 | Aucun                                         | ❌ → **N1**, **N2** : l'élève place le point (le numéro n'est qu'un moyen de répondre sans placer) |
| 3G10-3    | Construire au rapporteur et au compas l'image de 1 à 5 points par une rotation d'angle 10° à 80° (sens tiré), sur papier uni ; une « cible » autour de l'image pour se corriger                                                                                                                                                                                                       | Sur papier (cible)                                             | Aucun                                         | ❌ → **O1** (papier uni : outil manquant)                                                          |
| 3G11      | Construire l'image de 1 à 5 points par une homothétie de rapport ±0,5, ±1,5, ±2, sur papier uni, avec cible                                                                                                                                                                                                                                                                           | Sur papier (cible)                                             | Aucun                                         | 🟡 ±2 et ±0,5 sur quadrillage → **N2** ; papier uni → **O1**                                       |
| 3G11-1    | Tableau de 6 rapports (0,1 à 0,9 ; −2 à −9 ; 1,1 à 4,9 ; −0,1 à −0,9 ; n/d < 1 ; −d/n) : cocher réduction ou agrandissement                                                                                                                                                                                                                                                           | Cases à cocher (deux choix par rapport)                        | 1584c3b5 : k donné, jamais ce choix           | ❌ → **N3 (f)** (encadrer k, choix à 4 : pas de choix à deux)                                      |
| 3G12      | Pavage (7 pavages au choix : triangles, carrés, hexagones, mixtes) : image d'une figure numérotée par une rotation de centre A, angle et sens donnés                                                                                                                                                                                                                                  | Le numéro tapé                                                 | Aucun                                         | ❌ → **N4**                                                                                        |
| 3G12-1    | Même exercice, rotation de 90° seulement (niveau 3 du gabarit de 6e)                                                                                                                                                                                                                                                                                                                  | Le numéro tapé                                                 | Aucun                                         | ❌ → **N4**                                                                                        |
| 3G13      | Calculs : rapport k (depuis OA et OA', depuis OA et AA'), longueur image, longueur de départ (une ou deux étapes), aire image, aire de départ, k depuis les aires, encadrer k (QCM à 4 : k < −1, −1 < k < 0, 0 < k < 1, k > 1). k = n/10 ou n/d, signe tiré, position (même côté ou de part et d'autre de O) dite en texte                                                            | Une case nombre (fraction acceptée), QCM pour l'encadrement    | 1584c3b5 : aires et volumes, k positif        | ❌ → **N3**                                                                                        |
| can3G1-01 | Longueurs × k ⇒ aire × k² ; aire × k² ⇒ longueurs × k ; aire d'un rectangle agrandi                                                                                                                                                                                                                                                                                                   | Une case nombre                                                | 1584c3b5                                      | ✅                                                                                                 |
| can3G1-02 | Image d'un point par une transformation (gabarit de 3G10-2, un seul point)                                                                                                                                                                                                                                                                                                            | Le numéro tapé                                                 | Aucun                                         | ❌ → **N1**, **N2**                                                                                |

## Ce que leur format fait et pas le nôtre

- **O1** : construire sur papier uni l'image par une rotation d'angle quelconque (rapporteur et compas) ou par une
  homothétie de rapport décimal (règle graduée, alignement) ; rotation de 60° ou 120° sur un réseau triangulaire. Notre
  contrôle `point` sur papier uni refuse ces expressions ; nos quadrillages sont carrés.
- Leur « cible » auto-corrective est un tour de papier : chez nous, le contrôle juge le point posé.
