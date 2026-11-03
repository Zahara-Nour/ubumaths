# Automatismes de 1re — point de reprise

> Mis à jour le 2026-09-28. Pour reprendre dans une nouvelle session : lire ce fichier, puis
> [ADR 0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md) et
> [`docs/pratiques/fiches-exercices.md`](../pratiques/fiches-exercices.md) § 2 bis.

## Reprendre ici

_Mis à jour le 2026-11-03 : phase 0 du lot « Droites » en cours (§ Lot « Droites »)._

- **État** : pilote « évolutions » fait (#508) — 5 modèles **publiés** en prod, fiche `9217dfaa` encore en
  **brouillon** ; lots droites, lectures graphiques, statistiques **pas commencés** · **Prochaine action** : faire valider
  les comportements (figer `tracer:`, modèle neuf), puis worktree `automatismes-1spe` et PR ·
  **En attente de David** : questions 2 à 4 (§ Questions ouvertes) ; la 1 est tranchée par `CONTEXT.md` (« Série »
  = composition de questions, « Série figée » = exercice de fiche d'automatismes) · **Pièges en cours** : question 3
  (`==` dans `conditions`) non revérifiée depuis le 2026-09-28 · **Worktree / branche** : aucun (journal seul).
- Hors de ce chantier, même niveau : 18 fiches « Entraînement technique » / « Applications » de 1re spé en
  brouillon depuis septembre, à relire et publier par David (`docs/pratiques/fiches-exercices.md` § 1, § 3).

## Décisions de David (figées)

- Les **automatismes** de 1re (partie « Automatismes » du nouveau programme) passent par le
  **système de questions** (modèles paramétrés, corrigés automatiquement, Automaths), puis on en
  tire des fiches.
- Fiche = exercices ordinaires (« séries ») faits d'**instances figées par une graine** : même copie
  pour toute la classe. Lien vivant (une copie par élève) écarté. → ADR 0011.
- Une série par exercice (≈ 8 questions), ≈ 2 séries par fiche ; script versionné d'abord, bouton
  dans l'application plus tard si l'usage le justifie.
- Les modèles d'autres niveaux (seconde) sont **réutilisés tels quels** : on n'ajoute pas `1_SPE` à
  leurs `grades` (un niveau accède déjà aux niveaux inférieurs ; Automaths ne filtre pas par niveau).
- Rangement : thème d'exercices « Automatismes », fiches « Automatismes : <sujet> (n) ».
- Tout est créé en **brouillon** : David publie (questions comme fiches).

## Fait (pilote « évolutions », PR #508)

| Élément                                                                                                                        | Où                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `buildSerie` (instances → énoncé à pointillés / corrigé, réponses en gras) + 14 tests                                          | `src/lib/worksheets/serie-automatismes.ts`                                                                        |
| Création de modèles neufs en brouillon (`checkTemplate` obligatoire, `--mettre-a-jour`)                                        | `scripts/create-questions.ts`                                                                                     |
| 5 modèles « évolutions » de 1re (70 specs), niveaux 7-11 de Proportionnalité › Pourcentages › Variations                       | `scripts/questions/evolutions-1spe/*.json` (en base : `c4372fd8`, `1c443c35`, `bbd511cb`, `36abc642`, `8b59ca4b`) |
| Fiche « Automatismes : évolutions (1) », 2 séries de 8 (+ 4 modèles de seconde `e12e58cb`, `d98aa53a`, `2562438e`, `e05bb79b`) | `scripts/create-automatismes-evolutions-1spe.ts` ; fiche `9217dfaa`                                               |

Vérifié : `pnpm question:specs` vert pour les 5 modèles, réponses recalculées indépendamment ;
fiche régénérée depuis la base, compilée par le compilateur de prod, 0 débord, pages relues.

## Lot « Droites » — phase 0 (2026-11-03)

Relevé en prod, séries essayées par `buildSerie` (lecture seule, 3 graines par modèle) :

| Capacité (BO 1re, Automatismes)                     | Modèles                                                                                                                                | Série                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Coefficient directeur par deux points               | `7d6cf480` (déjà 1re)                                                                                                                  | ✅                                                |
| Lire graphiquement l'équation réduite               | aucun ; lectures séparées `f381c646` (pente), `c64028b0` (ordonnée à l'origine), `0d0e88f5`, `b9771108` (coef. entier / fractionnaire) | ✅                                                |
| Tracer (équation réduite ; point + coef. directeur) | `8d4bd94d`, `dc5d7cb6`                                                                                                                 | ❌ « 0 case pour 1 réponse » : `tracer:` non figé |
| Entretien seconde                                   | `49df6491`, `7f308eb4`, `c23f5a94`, `336451af`, `e6552232`, `6e074f0e`                                                                 | ✅                                                |

Écartés : `09f0c9ec`, `ae0ad163` (image PNG fixe parmi 30 ; préférer les `courbe`).

**Tranché par David (2026-11-03)** : (1) apprendre à `buildSerie` à figer une droite à
tracer (énoncé : repère vide ; corrigé : droite tracée) ; (2) modèle neuf « lire l'équation
réduite sur un graphique », en brouillon.

## Questions ouvertes (à poser à David)

1. **Collision de vocabulaire « série ».** `CONTEXT.md` définit désormais **Série** = exercice de
   fiche fait d'instances figées (ADR 0011). Mais la spec en attente
   [`series-de-questions-dans-un-chapitre-spec.md`](../archive/wip/series-de-questions-dans-un-chapitre-spec.md)
   (2026-09-14) appelle « série » une évaluation interactive (`assessments`). Deux sens pour un même
   mot : faire trancher lequel garde « série » et renommer l'autre (puis corriger `CONTEXT.md`).
2. **Modèle 5 (évolution répétée)** : `(1+0{,}03)^5`, `(103/100)^5` sont jugés `bad_form` (calcul
   non effectué). `requiredForm: "power"` les accepterait mais refuserait les décimaux exacts
   (`1{,}159\,274\,074\,3`). Quelle écriture privilégier ?
3. **Bug du moteur** : `==` ne fonctionne pas dans les `conditions` d'un modèle (`!=` oui) —
   contourné dans le modèle 4 ; à corriger ?
4. Séries 1 q7 (−40 % puis +10 %) et 2 q8 (+10 % puis −40 %) ont la même réponse — gardées pour
   montrer que l'ordre ne compte pas ; changer une graine si David préfère.

## Suite

Même démarche (§ 2 bis du guide) pour les autres automatismes du programme de 1re :

1. **Droites** : coefficient directeur (deux points, lecture), ordonnée à l'origine, équation
   réduite, droites parallèles — réutiliser les modèles de seconde « Déterminer le coefficient
   directeur », « Déterminer l'ordonnée à l'origine » (à retrouver en base).
2. **Lectures graphiques** : image, antécédents, signe, variations, résolution graphique
   d'équations et d'inéquations (demande des figures : vérifier ce que le moteur de questions sait
   afficher avant de rédiger).
3. **Statistiques** : moyenne, médiane, écart type, fréquences conditionnelles.

Pour chaque lot : phase 0 (liste des modèles, validation par David), modèles JSON + specs,
`question:specs`, `create-questions.ts`, fiche par séries, vérification PDF, PR.
