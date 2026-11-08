# Chantier « cercle-triangle-rectangle » — cercle de centre donné et triangle rectangle à construire

> Lignes n° 19 et n° 20 de [outils-manquants.md](outils-manquants.md). Débouchés : CE2-070 (lot 12b de
> [questions-ce2](questions-ce2-progress.md)), CE1-072. Code : `src/lib/questions/construction/` (`circle.ts`,
> `triangle.ts`), suite du chantier archivé [controles-figure](../archive/wip/controles-figure-progress.md).
> Ouvert le 2026-11-08 depuis la session `questions-ce2`, à la demande de David.

## Reprendre ici

_Mis à jour le 2026-11-08, phase 0 validée._

- **État** : phase 0 validée (§ 1) ; n° 19 en cours (tests rouges).
- **Prochaine action** : tests rouges du cercle de centre donné, puis implémentation dans `circle.ts`.
- **En attente de David** : rien.
- **Pièges en cours** : correction des réponses → tests d'abord, revue `code-reviewer` en `model: opus` sur la PR ;
  `verifier: cercle` refuse aujourd'hui toute autre expression que `cercle_circonscrit` (à la publication).
- **Worktree / branche** : `../ubumaths-wt-cercle-triangle-rectangle`, `feat/cercle-triangle-rectangle`.

## 1. Phase 0 — comportements (validée le 2026-11-08)

**Question d'accès** : aucune — code pur de la case « figure », ni table, ni policy, ni route.

### n° 19 — Cercle de centre donné

Écriture de l'auteur : `verifier: cercle c = cercle(O, passant=A)` (de centre O passant par A) et
`verifier: cercle c = cercle(O, rayon=u)` (rayon pris sur un segment u de la figure ; écriture exacte calée sur le
langage des figures). Le rayon en cm (« cercle de rayon 4 cm ») dépend de la règle graduée (n° 18, chantier
`regle-graduee`) : hors de ce chantier.

- **Nominal** : l'élève pique le compas en O et l'ouvre jusqu'à A → « Juste ». Rayon donné : Report sur [u], puis
  pointe en O → « Juste ». Les autres cercles et droites sont des traits de construction, ignorés (règle du cercle
  circonscrit).
- **Limite** : quadrillage (CE1-072 : « cercle de centre donné passant par un point donné ») : O et A sur des nœuds,
  compas aimanté aux nœuds. Papier uni : O et A sont des points de la figure.
- **Erreurs, dans l'ordre** : il manque le cercle (« Trace le cercle de centre O passant par A. ») ; mauvais centre
  (« Pique ton compas en O. ») ; bon centre, ne passe pas par A (« Ton cercle a le bon centre mais ne passe pas par
  A. ») ; rayon ouvert à l'œil (« Ton compas est ouvert à l'œil : ouvre-le jusqu'à A. ») ; rayon reporté d'un autre
  segment (« Ton cercle n'a pas le bon rayon. »).

### n° 20 — Triangle rectangle

Recommandation : **étendre la vérification `triangle`** (un angle de 90° construit à l'équerre, pas au rapporteur,
hors cycle 2), plutôt qu'une vérification neuve.

Écriture : `verifier: triangle ABC : CAB = 90 ; AC = u` ([AB] tracé ; angle droit en A ; AC reportée de u), ou
`CAB = 90` seul (triangle rectangle quelconque : C n'importe où sur la perpendiculaire).

- **Nominal, papier uni** : équerre le long de (AB) en A → perpendiculaire ; Report de u piqué en A → C au
  croisement ; segments [AC] et [BC] → « Juste ». Les deux C (de part et d'autre de (AB)) sont justes.
- **Nominal, quadrillage** : sans instrument, C sur un nœud ; côtés sur les lignes ou obliques (pas (3;1) →
  perpendiculaire (−1;3)).
- **Erreurs** : côté manquant (messages actuels de `triangle.ts`) ; angle en A non droit (« Ton angle en A n'est pas
  droit : trace la perpendiculaire à (AB) avec l'équerre. ») ; perpendiculaire tracée à l'œil (« Ton côté [AC] est
  tracé à l'œil : utilise l'équerre. ») ; mauvaise longueur (message actuel).

### Questions à David

- **Q1** — Cercle : quadrillage ET papier uni ? (reco : oui, les deux ; le CE1-072 cite le quadrillé et le pointé)
- **Q2** — Triangle rectangle : extension de `triangle` avec `= 90` à l'équerre (reco), ou vérification neuve
  `triangle_rectangle` ?
- **Q3** — Triangle rectangle sur quadrillage : comment donner la longueur de AC ? (reco : en carreaux, côtés sur les
  lignes ; sur les obliques, `AC = AB` seulement, le triangle rectangle isocèle)
- **Q4** — Ordre : n° 19 puis n° 20, une PR chacun, puis le lot 12b du CE2 dans `questions-ce2` (reco : oui)

**Décisions de David (« je suis tes recos », 2026-11-08)** : Q1 quadrillage et papier uni ; Q2 extension de
`triangle` (`CAB = 90` à l'équerre) ; Q3 carreaux sur les lignes, `AC = AB` seul sur les obliques ; Q4 n° 19 puis
n° 20, une PR chacun, revue `code-reviewer` en `model: opus`, puis le lot 12b du CE2.
