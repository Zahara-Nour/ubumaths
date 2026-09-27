# Calcul avec des grandeurs dans `{{eval}}` — suivi

Chantier ouvert le 2026-09-27 pour le lot de relecture **Grandeurs** (#426–#470) : 31 questions
sur 45 ne génèrent pas, parce que TinyMath calcule avec des grandeurs (`7 mm × 5 mm = 35 mm²`,
`[_&1 h_min_]`, `_HMS_`) et que `{{eval}}` jette les unités **en silence**
(`3[h]+20[min]` → 23, `5[km]+3[m]` → 8). Aucune question en base n'en souffre (0 grandeur sur
475 templates, mesuré le 2026-09-27).

## Constat (mesuré)

- `evaluate` (mathAST) ignore l'unité **par construction** (`eval/evaluate.ts:600`) ; c'est lui
  que `{{eval}}` appelle.
- `evaluateWithUnits` existe mais : `7 mm × 5 mm` → « 35 m² », `120 km ÷ 2 h` → « 60 m·s⁻¹ »,
  facteurs h/min en flottant (`3 h ÷ 1 min` → 180,000…007). Hors du chemin retenu, à corriger à
  part (console mathAST).
- `tidy` calcule juste et choisit l'unité (`tidy/collect.ts` `chooseUnit`) : unités scolaires
  (`units/selection.ts` `SCHOOL_FAMILIES`), la plus grande dont la valeur est ≥ 1, candidates sans
  écriture décimale finie écartées. Écarts : `3 h ÷ 1 min` → « 3 h/min » (doit valoir 180) ;
  `5 m + 3 s` laissé tel quel (doit être une erreur dans `{{eval}}`).
- Une réponse d'élève en durée composée (« 2 h 15 min ») est refusée (« Unité inconnue »).

## Décisions de David (2026-09-27)

1. **Option A** : `{{eval}}` calcule avec des grandeurs (pas de réécriture à la main).
2. Calcul **exact** ; affichage **décimal exact**, tous les chiffres (espace des milliers dans la
   partie décimale), jamais de fraction d'unité, pas de notation scientifique.
3. **Unité du résultat (option a)** : l'unité écrite dans les données si la valeur y a une écriture
   décimale finie ; sinon le choix de `tidy` (unités scolaires) ; sinon **erreur visible** — pour
   faire réécrire la question, pas pour retirer un tirage (une condition, si voulue, s'écrit).
   → **option dans `tidy`** « garder l'unité écrite si elle tombe juste ».
4. « 2 h 75 min » (valeur juste, écriture non normalisée) : **juste mais perfectible**.
5. Ordre des lots : 1 → 2 → 4, puis 3 avant les questions de durées.

## Spécification (phase 0 validée)

### Lot 1 — `tidy` : unité écrite préférée

| Entrée (option active) | Attendu                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `4*7[mm]`              | `28 mm`                                                      |
| `7[mm]*5[mm]`          | `35 mm²`                                                     |
| `7[mm]*5[cm]`          | `350 mm²`                                                    |
| `3[h]+20[min]`         | `200 min`                                                    |
| `20[min]+3[h]`         | `200 min`                                                    |
| `1[h]+45[min]+30[min]` | `2,25 h`                                                     |
| `5[km]+3[m]`           | `5,003 km`                                                   |
| `120[km]/2[h]`         | `60 km/h`                                                    |
| `3[h]/1[min]`          | `180` (sans unité)                                           |
| `10[km]/3`             | fraction gardée (l'appelant décide : erreur dans `{{eval}}`) |

Sans l'option : comportement actuel inchangé (sauf `3 h ÷ 1 min` → 180, à mesurer).

### Lot 2 — `{{eval}}` avec grandeurs

1. Un calcul contenant une grandeur passe par `tidy` (option du lot 1) et **garde son unité** :
   `{{eval:4*a}}` (a = 7 mm) → `28[mm]`, affiché « 28 mm » en LaTeX comme en syntaxe maison ;
   une case à unité l'attend `28\unit{mm}`.
2. **« Exprimé en »** : modificateur `;[unité]` — `{{eval:3[h];[min]}}` → 180 min ;
   `{{eval:a*b;[mm^2]}}` → 35 mm² ; unité incompatible → erreur.
3. Grandeur ÷ grandeur de même dimension → nombre : `{{eval:3[h]/1[min]}}` → 180.
4. **Durée** : modificateur `;hms` — 135 min → « 2 h 15 min » ; 150 s → « 2 min 30 s » ;
   60 min → « 1 h » ; durée non entière en secondes → erreur.
5. **Erreurs visibles** : dimensions incompatibles (`5[m]+3[s]`) ; aucune écriture décimale finie
   (`10[km]/3`, `100[km]/3[h]`) ; jamais d'unité jetée en silence.
6. Non-régression : un calcul sans unité ne change pas (corpus TinyMath 633 + base 475).

### Lot 4 — convertisseur TinyMath

`&1 mm` → `a[mm]` ; `[_&3*&4_mm^2_]` → `{{eval:a*b;[mm^2]}}` ; `[_&1 h_min_]` →
`{{eval:a[h];[min]}}` ; `_HMS_` → `;hms` ; `&1 h &2 min` → `a[h]+b[min]` ; solution avec unité →
case `unit: { expected: true }`.

### Lot 3 — réponse en durée composée

« 2 h 15 min » = 135 min, juste si l'attendu vaut 135 min ou 2,25 h ; refusé si l'unité est
imposée (`required: 'min'`) ; « 2 h 15 kg » refusé (grandeur incompatible) ; « 2 h 75 min »
perfectible. Mesurer d'abord ce que MathLive produit au **vrai clavier**.

## Avancement

- [x] Phase 0 validée (2026-09-27)
- [x] Lot 1 — `tidy` (#483) : `unitChoice: 'written'` ; quotient de même dimension → nombre
      (aussi en mode scolaire, symbolique compris : `x[h]/y[min]` → `60x/y`) ; fraction dans
      l'unité écrite quand rien ne tombe juste.
  - Reste pour le lot 2 (relecture de #483, écart B) : `(3[h]+20[min])*1[km/h]` → « 200 min·km/h »
    (unités de même dimension au numérateur et au dénominateur non simplifiées) — un `{{eval}}`
    produira ces calculs (`1[h]+30[min]` × 60 km/h doit donner 90 km).
- [x] Lot 2 — `{{eval}}` (#484) : grandeurs gardées, `;[unité]`, `;hms` (affichage seulement ;
      interdit dans un attendu ; produit de durées refusé), zéro avec unité, attendu signé lu.
- [x] Affichage (#486) : grandeur dans une formule d'auteur ou dans le texte → `\unit`.
- [x] Lot 4 — convertisseur (#485) : lot Grandeurs 14 → 35/45 (+ #507–#509). Restent : #428, #429
      (listes de grandeurs), #457–#460 (décimal `&1,&2`), #462/#464/#466 (réponse « 2 h 15 min », lot 3),
      #508 v0 (source). À la relecture : #468 attend des minutes sans le dire ; #434 unité non annoncée.
- [ ] Lot 3 — durées composées
- [ ] Relecture du lot Grandeurs (#426–#470)
