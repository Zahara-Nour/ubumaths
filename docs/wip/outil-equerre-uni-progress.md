---
title: Lot d'outils equerre-uni — journal
date: 2026-11-28
status: outil 40 en phase 0, en attente de David
---

# Lot `equerre-uni` (outils 40, puis 38, puis 45)

## Reprendre ici

_Mis à jour le 2026-11-28, avant toute PR._

- **État** : outil 40 (perpendiculaire / parallèle par un point, à l'équerre, sur papier uni) en phase 0 (§ 1) ·
  **Prochaine action** : tests rouges de l'outil 40 après la réponse de David · **En attente de David** : les
  4 questions du § 1 · **Pièges en cours** : le lot `triangle-quadrillage` touche le même module (figure à
  compléter) : `merge origin/main` avant chaque PR · **Worktree / branche** : `../ubumaths-wt-outil-equerre-uni`,
  `feat/outil-equerre-uni`.

## 1. Outil 40 — phase 0 (2026-11-28)

**Vérifié dans le code** : l'outil manque encore. Le juge sait déjà qu'une droite tracée à l'équerre est construite
(`isSupported`, `construction/instruments.ts` : équerre posée le long d'un trait, glissée jusqu'à un point construit ;
parallèle « à la 6e » = perpendiculaire en un point quelconque du trait, puis perpendiculaire à celle-ci). Ce qui
manque :

- la **garde de l'auteur** (`assertLines`, `construction/line.ts`) : sur papier uni, elle refuse toute droite qui
  n'est ni une médiatrice ni une bissectrice (« sinon ajouter grille: 1 ») ;
- des **messages** qui disent la cause : aujourd'hui, une droite fausse reçoit « Ta droite n'est pas à sa place. ».

**Syntaxe d'auteur** : rien de neuf, celle du quadrillage sans `grille:` :

```
outils: droite, equerre
verifier: droite p = perpendiculaire(A, d)
verifier: droite q = parallele(A, d)
```

**Exemple d'élève** (CM1-167, papier uni) : une droite (d) oblique et un point A hors de (d). « Trace la
perpendiculaire à (d) passant par A. »

- **Nominal** : l'élève pose l'équerre le long de (d), la fait glisser jusqu'à A et trace → juste. Parallèle : il
  trace une perpendiculaire à (d) n'importe où sur (d), puis la perpendiculaire à celle-ci par A → juste ; la
  perpendiculaire intermédiaire est un trait de construction, ignoré.
- **Limites** : A sur (d) → la perpendiculaire en A, juste. Une parallèle construite au compas (parallélogramme)
  → juste aussi (elle passe par deux points construits). Une droite à la bonne place mais tracée à la règle, par A
  et un point posé à l'œil → « Ta droite est tracée à l'œil : construis-la avec tes instruments. » (message
  existant).
- **Erreurs**, messages proposés (perpendiculaire ; parallèle de même) :
  - rien de tracé : « Trace la perpendiculaire à (d) passant par A. » / « Trace la parallèle à (d) passant par A. »
  - bonne direction, pas par A : « Ta droite est perpendiculaire à (d) mais ne passe pas par A. » / « Ta droite est
    parallèle à (d) mais ne passe pas par A. »
  - par A, mauvaise direction : « Ta droite passe par A mais n'est pas perpendiculaire à (d). » / « … n'est pas
    parallèle à (d). »
  - l'une pour l'autre (par A) : « Ta droite est parallèle à (d) : on demande la perpendiculaire. » et l'inverse.

**Garde de l'auteur** (erreurs à la création du modèle, sur papier uni) : (d) doit être un trait droit de la figure
(l'équerre se pose le long d'un trait), A visible dans la fenêtre, au moins 2 unités de la droite attendue dans la
fenêtre (comme la médiatrice).

**Correction** : la droite attendue ; pour la perpendiculaire, l'angle droit codé au pied ; pour la parallèle, la
perpendiculaire intermédiaire en trait fin, avec ses deux angles droits codés.

**Questions à David** :

1. Les comportements et les messages ci-dessus : OK ?
2. Sur papier uni, **exiger l'équerre dans `outils:`** (sinon erreur d'auteur « ajouter equerre à outils: ») ?
   Reco : oui, sans équerre l'élève ne peut que tracer à l'œil.
3. Les nouveaux messages aussi **sur quadrillage** (les modèles en prod CM1-167, 168 et leurs jumeaux CM2 les
   recevraient tout de suite) ? Reco : oui, même juge, et « pas à sa place » n'aide pas l'élève.
4. La correction (angle droit codé ; trait fin de la perpendiculaire intermédiaire pour la parallèle) : OK ? Reco :
   oui ; sinon la droite seule, comme aujourd'hui.
