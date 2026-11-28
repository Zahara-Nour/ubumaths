# Chantier `idees-6e-angles` — idées reprises d'ailleurs, rubrique « Angles » de 6e

## Reprendre ici

_Mis à jour le 2026-11-28, lot écrit._

- **État** : phase 0 validée (« je te suis »). Lot écrit : 3 modèles neufs (`scripts/questions/idees-6e-angles-neufs/`),
  6 variations ajoutées à 3 publiés (`…-publies/`), specs vertes, sonde des figures à 0, essayé en base locale et vu à
  l'écran. PR des fichiers ouverte.
- **Prochaine action** : merger la PR (CI verte), puis David lance
  `pnpm tsx scripts/create-questions.ts --dir scripts/questions/idees-6e-angles-neufs --publier`.
- **En attente de David** : la création des 3 brouillons en prod.
- **Pièges en cours** : c8741112, 3be08965, 2291c83c réservés ; les variations s'ajoutent à la fin.
- **Worktree / branche** : `../ubumaths-wt-idees-6e-angles`, `feat/idees-6e-angles`.

## Phase 0 (2026-11-28)

12 exercices lus : 3 ✅ ou couverts, 5 🟡, 3 ❌, 1 hors rubrique (6G41, perspective cavalière). Question d'accès de la
migration : **personne ne gagne d'accès**, on range des modèles du prof. Aucun outil ne manque.

### Fiches

- **N1 — Les noms d'un même angle** (modèle neuf, 6-168, 3 variations). Chez eux (6G4A) : triangle avec des points sur
  les côtés, QCM à plusieurs réponses. Chez nous : un seul nom demandé (4c1ce174 au CM, c8741112 v4). Case choix à
  **plusieurs bonnes réponses** (leur forme gardée : un nom d'angle ne se tape pas avec `\widehat` au clavier).
  (a) M sur [BA] : cocher les noms de l'angle marqué de sommet B ($\widehat{ABC}$, $\widehat{CBA}$, $\widehat{MBC}$,
  $\widehat{CBM}$ ; faux : $\widehat{BAC}$, $\widehat{BMC}$) ; (b) M sur [BA] et N sur [BC] (huit noms justes, six
  proposés) ; (c) angle de sommet I, point d'intersection de (AN) et (CM) ($\widehat{AIC}$, $\widehat{CIA}$ ;
  $\widehat{NIM}$, opposé par le sommet, est un autre angle : faux). Lettres tirées dans une réserve de trois jeux. Erreurs prévues :
  le sommet pas au milieu ($\widehat{BAC}$), un point qui n'est pas sur un côté de l'angle, l'angle voisin.
- **N2 — Calculer un angle sur une figure simple** (modèle neuf, point : **Q1**, 6 variations). Chez eux (6G4A-4,
  14 types ; 6G4A-3 pour les supplémentaires) : figure, saisie d'un nombre. Chez nous : rien en 6e. Case nombre, ° écrit
  après. (a) angle droit codé partagé par [AD) : $\widehat{BAD}$ 25..65 affiché, $\widehat{DAC}$ ? ; (b) B, A, C
  alignés (angle plat) : $\widehat{BAD}$ 25..155 sans 90, $\widehat{DAC}$ ? (« les deux angles sont supplémentaires ») ;
  (c) $\widehat{BAC}$ donné (51..179) et $\widehat{BAD}$ (25..$\widehat{BAC}$ − 25), $\widehat{DAC}$ ? ; (d) angle
  droit partagé en n parts égales codées (`marque="arcs2"`, n ∈ 2, 3, 5, 6) : une part ? ; (e) angle plat partagé
  en n parts égales (n ∈ 3, 4, 5, 6, 9), k parts (2..n − 1, sans 90) : l'angle de k parts ? ; (f) deux ou trois
  angles consécutifs affichés (25..60) : leur somme ? Erreurs prévues : (a) 90 + x ; (b) 90 − x au lieu de 180 − x ;
  (c) la somme au lieu de la différence ; (d) 90 × n ; (e) une seule part ; (f) un seul des angles.
- **N3 — Mesures des angles particuliers** (3 variations ajoutées à c8741112, publié, 6-168). Chez eux (6G4B-2,
  6G4A-2) : phrases à compléter, nul et plein compris. Chez nous : ces mesures ne sont que dans le corrigé de v1.
  (e) « Un angle plat mesure ?° » (nul 0, droit 90, plat 180, plein 360), case nombre ; (f) « Un angle obtus mesure
  entre ?° et ?° » (aigu : 0 et 90), deux cases ; (g) « Un angle mesure N°. Comment s'appelle-t-il ? », N parmi 0,
  20..80, 90, 100..170, 180, 360, case choix des six noms (leur forme gardée : la réponse est un mot). Saillant et
  rentrant : rien (bornes de 6-168). Erreurs prévues : 100° pour un angle plat, 180° pour un angle plein, un angle
  plat pris pour un angle nul.
- **N4 — Mesurer : autre graduation, angle entre deux côtés** (2 variations ajoutées à 3be08965, publié, 6-169). Chez
  eux (6G4B-1) : rapporteur dessiné, base vers la droite ou la gauche, angles consécutifs. Chez nous : base toujours
  vers la droite quand le rapporteur est posé. (c) rapporteur posé, [OA) vers la **gauche** (l'élève lit l'autre
  graduation), a 15..165 ; (d) trois demi-droites [OA), [OB), [OC), rapporteur à poser : mesure de $\widehat{BOC}$
  (35..120), [OA) au zéro ne sert à rien. Erreurs prévues : 180 − a (mauvaise graduation) en (c) ; la mesure de
  $\widehat{AOC}$ en (d).
- **N5 — Estimer un angle sans rapporteur** (modèle neuf, 6-169, 3 variations). Chez eux (6G4B) : QCM exact à
  6 propositions. Chez nous : rien. Case nombre à précision **tolérance de 10°** (une estimation se tape ; le QCM ne
  ferait que repérer la bonne). Pas de rapporteur dans la figure. (a) angle aigu 20..80 de 10 en 10 ; (b) obtus 100..160 ;
  (c) premier côté tourné (20..340). Le corrigé compare à l'angle droit : « plus petit qu'un angle droit, un peu plus
  de la moitié… ». Erreurs prévues : 180 − a (aigu pris pour obtus), 90 pour un angle de 60 ou 120.
- **N6 — Construire sur une base inclinée** (1 variation ajoutée à 2291c83c, publié, 6-170). Chez eux (6G4C) : [yx)
  tournée de −50 à +50°, sens imposé. Chez nous : base horizontale. (c) [OA) tournée de 20 à 50°, a 15..165. Le sens
  imposé : rien (le BO ne le demande pas, notre juge accepte les deux côtés). Erreurs prévues : les messages du juge
  (rapporteur mal posé, repère à l'œil).
- **Rien** : 6G4A-1 (couvert par 8da9f669 au CM), 6G4B-3 (3be08965 v2), 6G4C-1 (notre juge vérifie le tracé). 6G41
  (perspective cavalière) va à la rubrique « Espace » 6G8 : noté dans « Idées en attente » du tableau.

### Questions

- **Q1 — Point de N2 (calculer un angle sur une figure).** Le BO de 6e ne nomme pas le calcul d'angles hors du
  triangle (6-176). Recommandation : **6-168** (« connaître et utiliser… angle droit, angle plat, angles adjacents,
  angles supplémentaires »), dont (a), (b) et (f) sont l'usage direct. Autre choix : 6-169 (mesurer).
- **Q2 — Estimation (N5) : tolérance de 10°, ou un choix entre quatre mesures éloignées (30°, 60°, 120°, 150°) ?**
  Recommandation : **tolérance de 10°**, la saisie oblige à estimer.

## Historique

- 2026-11-28 : lot écrit (`docs/wip/questions/idees-6e-angles-neufs.py`, `…-publies.py`). Écarts à la phase 0,
  vus à l'écran : (d) sans n = 9 (éventail de 9 parts illisible sur téléphone) ; une case choix ou figure ne porte
  pas d'erreurs prévues (N1, N3 g, N4, N6 : specs seules) ; un choix partiel de N1 est jugé « à améliorer »,
  pas faux. Specs : N1 10, N2 20, N5 10, c8741112 +15, 3be08965 +7, 2291c83c +5, toutes vertes ; sonde des
  figures : 0 problème. Essai en base locale (copies « — essai » des publiés), figures vues dans `/dev/modeles` :
  nom du point d'intersection déplacé, arcs agrandis, angle rouge de (e) qui n'était pas dessiné.
- 2026-11-28 : David répond « je te suis » aux fiches N1 à N6 et aux questions (Q1 : 6-168 ; Q2 : saisie à 10°
  près). c8741112, 3be08965, 2291c83c réservés dans le tableau (b7629a9d76) et exportés de prod.

- 2026-11-28 : rubrique prise (09e666cfcf), relevé par deux agents Sonnet, plages recoupées dans le code, nos modèles
  relevés en prod ; phase 0 écrite.
