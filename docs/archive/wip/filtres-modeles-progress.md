# Chantier `filtres-modeles` — filtres plus fins et série dans `/dev/modeles`

## Reprendre ici

_Mis à jour le 2026-11-10, après #2533._

- **État** : chantier clos — #2533 mergée (filtres titre, point, série dans `/dev/modeles`), doc dans `docs/systeme/questions.md`, journal archivé · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : retirés

## Origine

Né du chantier `cours-suites` : David veut voir le rendu des 30 brouillons « Cours : … » dans
`/dev/modeles` et filtrer plus finement, et afficher les modèles d'une série enregistrée.

## Phase 0 (validée par David le 2026-11-10 : « je te suis »)

Retenus : recherche dans le titre, point du programme, série. Écartés pour l'instant : question de
cours, date.

1. **Titre** (`?titre=`) : contient le texte, sans casse ni accents ; vide ou espaces = pas de
   filtre ; plus de 100 caractères → 400. Se combine avec le nœud et les autres filtres ; sans
   nœud, plafond de 80 fiches avec le total annoncé.
2. **Point** (`?point=`) : modèles tagués sur ce code, casse indifférente ; point sans modèle →
   « Aucun modèle sur ce point » ; code absent des points en base → « Point inconnu » ; format
   invalide (pas `XXX-123`) → 400.
3. **Série** (`?serie=`) : sélecteur « titre · niveau », trié niveau puis titre ; modèles dans
   l'ordre de la série avec « × quantité · délai s » ; les autres filtres s'appliquent en plus ;
   un modèle deux fois → deux fiches ; modèle supprimé → « Modèle introuvable » ; la série remplace
   le nœud (gardé dans l'adresse) ; aucune série → pas de sélecteur ; id mal formé → 400 ; série
   disparue → « Cette série n'existe plus ».
4. « Tout effacer » vide aussi les nouveaux filtres. Pas de migration ; `/dev` reste admin.

Séries : seul un professeur en crée (`series_insert_teacher`) ; en prod, 5 séries, un seul
créateur (mono-professeur) → le sélecteur liste toutes les séries.

## Journal

- 2026-11-10 : worktree créé ; phase 0 validée.
- 2026-11-10 : tests (19 verts), code, doc `docs/systeme/questions.md` ; rendu vérifié en local (série d'essai
  avec doublon et modèle disparu, supprimée ensuite ; 400 ; point inconnu ; recherche). Revue
  `code-reviewer` : corrigés — code de point mal tapé = aide sous la case (plus de page 400), paramètres
  rognés avant Zod, champs texte (la croix des champs « search » ne déclenche pas `change`), composition
  lue pour la seule série choisie, longueurs en constantes. Laissés : « œ » non décomposé, compte des
  lignes introuvables (conforme à la phase 0). Non vérifié : un point réellement tagué (base locale sans tags).
- 2026-11-10 : #2533 mergée (CI verte), worktree et branche retirés, journal archivé.
