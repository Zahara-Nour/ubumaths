# Chantier `solide-segments` — segments et angles droits du bloc solide (outil n° 72)

## Reprendre ici

_Mis à jour le 2026-11-28, après #3264 (mergée). Chantier clos, journal archivé._

- **État** : `segments:` et `angles-droits:` du bloc ` ```solide ` mergés (#3264) ; pas en prod sans
  `deploy:prod` demandé par David. · **Prochaine action** : aucune ici ; F1 (`idees-3e-espace`) peut
  s'écrire, avec la diagonale [DF]. · **En attente de David** : rien. · **Pièges** : diagonale [AG] d'un
  cube sur l'arête [FG] en cavalière (plus bas). · **Worktree / branche** : retirés.

## Phase 0 (tranchée par David le 2026-11-28 : « je te suis »)

Exemple : `segments: [EG], [AG]` et `angles-droits: AEG` sur un cube.

- Segment d'un point à l'autre, sans dépasser ; en tirets là où une face passe devant (comme les
  droites) ; bouts : sommets ou points de `points:` ; crochets facultatifs.
- Angle droit : petit carré au sommet du milieu, dans le plan des trois points (losange penché en
  perspective) ; suit la rotation.
- Lecteur d'écran : « segment [AG] », « angle droit en E ».
- Refus : point inconnu, segment donné deux fois, segment qui est une arête, angle qui n'est pas droit ;
  au plus 6 segments, 3 angles droits.
- Polyèdres seulement ; pas encore avec `section:` ni `tracer:` ; marche avec `tourner: oui` et au PDF.
- Choix : (1) segments en **bleu**, comme les droites ; (2) carré d'angle droit **en tirets** s'il est
  caché ; (3) **pas** de longueur écrite sur un segment ; (4) **cylindre hors de l'outil** (v5 de F1 sans
  segment tracé, ou retirée) ; cône sans besoin ; pyramide par `points: O centre ABCD`.

## Journal

### 2026-11-28 — code, tests, rendu

- Clé `angles-droits` : `KEY_LINE_REGEX` du parser n'acceptait pas de tiret ; il en accepte un entre deux
  mots.
- Preuve rouge : les sources de `main` remises sous le test neuf → le fichier échoue (clé inconnue) ;
  restaurées depuis le commit.
- **Vu à l'écran** (page d'aide du bloc, WebKit, script Playwright dans `.captures/segments/`, ignoré) :
  - premier essai, `[EG], [AG]` + `AEG` : **[AG] passe par F puis se couche sur l'arête [FG]** dans le
    dessin. En cavalière (fuyantes à 45°, réduites de moitié), A = (0, 0), F = (a, a),
    G = (a + 0,35 a, a + 0,35 a) : alignés pour tout cube, et pour tout pavé de longueur égale à la
    hauteur. Le bout F → G se dessine en plein sur l'arête. L'exemple du catalogue prend donc
    **[HF], [DF], angle DHF** ; la doc le dit. **Pour F1** : la diagonale [DF] (ou `tourner: oui`).
  - carré d'angle droit trop petit à 0,07 × la plus grande dimension (à peine un tiret) : passé à 0,1.
    Vu ensuite : carré lisible en H (cube) et en O (pyramide, en tirets).
