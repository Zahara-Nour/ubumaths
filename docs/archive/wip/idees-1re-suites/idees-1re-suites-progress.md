# Chantier `idees-1re-suites` — journal

Idées reprises d'ailleurs, rubrique « Suites numériques » de Première spécialité (codes 1AL1,
19 exercices), selon le skill `idees-rubrique`. Relevé : [idees-1re-suites-releve.md](idees-1re-suites-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, chantier clos._

- **État** : rubrique **publiée** : les 4 modèles neufs sont publiés et validés par David ; les 26
  variations des 14 publiés aussi ; journal archivé · **Prochaine action** : aucune · **En attente
  de David** : rien · **Pièges retenus** : le juge refuserait peut-être
  `\frac{(n+2)4^n}{4^{n+1}(n+1)}` (non vérifié, ligne dans `docs/wip/verifications-manuelles.md`)
  · **Worktree / branche** : aucun.

## Historique

### 2026-11-22 — rubrique prise

- Pause des rubriques levée par David le même jour ; rubriques de Première ajoutées au tableau de
  répartition (leurs 10 rubriques de spécialité telles quelles, 8 d'automatismes).
- Existant en prod relevé (MCP lecture seule) : environ 90 modèles tagués sur les points de suites
  de 1re spé (1SPE-211 à 1SPE-380), dont une trentaine de brouillons « Cours : … ». Détail dans le
  relevé.

### 2026-11-22 — relevé et phase 0

- Relevé des 19 exercices : 3 ✅, 12 🟡, 2 ❌ (placer des termes en 1re spé, somme écrite en
  extension), 1 ✅ seulement en Terminale (arithmético-géométrique), 1 doublon (1AL11-8QCM). Détail : [idees-1re-suites-releve.md](idees-1re-suites-releve.md).
- Phase 0 : https://claude.ai/artifact/6ijd2FYjXxh9xx6dszdKnx. Trois questions d'ensemble
  (Q1 arithmético-géométrique en 1re : non recommandé ; Q2 monotone « à partir d'un rang » : oui ;
  Q3 questions enchaînées sur un même contexte : idée d'outil, plus tard). Seize fiches :
  4 nouveaux modèles (3, 11, 12, 13), 10 fiches de variations sur 14 modèles publiés (1, 2, 4 à 10, 14),
  1 « plus tard » (15), 1 « non » (16).
- Modèles publiés à réserver au tableau dès les verdicts : 45da9678, 7703e625, cea65372, 84114cb2,
  d2943133, 727fb88a, cf51cb93, 85afd455, 65e96f31, e67b1cbd, 44b32cad, b72fae4a, 5042401b,
  19961e67 (seulement ceux que David retient).

### 2026-11-22 — verdicts de la phase 0

- David : « je valide toutes tes recommandations dans la page à cocher » (message du 2026-11-22 ;
  la base de la page est restée vide). Donc : Q1 non (pas d'arithmético-géométrique avec suite
  auxiliaire en 1re), Q2 oui (monotone à partir d'un rang), Q3 plus tard (questions enchaînées :
  rien dans `outils-manquants.md`) ; fiches 1 à 14 oui, 15 plus tard, 16 non.
- Les 14 modèles publiés sont réservés au tableau ; export de prod dans
  `scripts/questions/1re-suites-publies/` (commit 2a85b7b809).
- Lot : `scripts/questions/1re-suites-a/` (4 nouveaux modèles : fiches 3, 11, 12, 13, script
  `docs/wip/questions/lot-1re-suites-a.py`) et variations ajoutées à la fin des 14 fichiers publiés
  (fiches 1, 2, 4 à 10, 14).

### 2026-11-22 — lot écrit

- Deux agents (pedagogy-expert) ; fichiers relus : anciennes variations des 14 publiés identiques,
  seuls variations, specs et description changent ; chaque nouvelle variation a son `hint`.
- Modèle 02 : la fiche 11 (« raison négative ») donnait toujours la même réponse. David, le
  2026-11-22 : mêler les raisons. Devenu « Sens de variation d'une suite géométrique, quelle que
  soit sa raison » (8 variations : 3 négatives, 4 positives selon q et u₀, q = 1).
- Signalé par l'agent, **non vérifié** : le juge refuse `\frac{(n+2)4^n}{4^{n+1}(n+1)}` (produit
  collé derrière une puissance) alors que la valeur est juste ; les specs « non simplifié » de 03
  sont écrites avec ×. À vérifier dans l'Atelier avant de le classer comme bogue de mathAST.
- Limites assumées : deux erreurs prévues (pas trois) sur la 2e case des variations à deux cases
  de 45da9678 ; dans 7703e625, `14/12` reste « forme non optimale » (réglage du modèle, que
  `migration-contenu` ne change pas) ; 01 v3 (u² − c) n'a que 6 tirages différents.

### 2026-11-22 — essai en base locale

- `create-questions --publier` en local sur `1re-suites-a` (ids restaurés par `git restore`, diff
  = ids seuls) ; les 14 publiés absents de la base locale : créés en brouillon depuis une copie sans
  id, hors dépôt. Aperçu joué par David à distance (lien Tailscale, `pnpm lien`) : « je valide
  tout ».

### 2026-11-22 — brouillons en prod, migrations

- David a lancé `create-questions --publier` : 4 brouillons en prod (b2aead94, 2938b16b, cdb5a1cf,
  63791bb6), vérifiés par MCP lecture seule.
- Rangement proposé (voisins publiés) : b2aead94 → représentation graphique, 1SPE-221 ; 2938b16b →
  Suites géométriques, 1SPE-229 ; cdb5a1cf et 63791bb6 → sens de variation, 1SPE-219. Question
  d'accès posée (« personne ne gagne ni ne perd d'accès »). David : « je suis tes recos » (réponse
  aux deux questions).
- Migration de contenu régénérée (prod relue) : 14 migrés, +26 variations, 0 corrigée. Tests
  d'intégration : 47 verts ; sans les migrations, 10 rouges.

### 2026-11-22 — #3007 mergée, migrations en prod

- `security-auditor` : aucun bloquant (deux mineurs hérités de la migration de Terminale : couple
  `disable`/`enable trigger` hors bloc explicite, `set local` hors transaction). CI verte, merge,
  `migration list --linked` (seules les deux du lot en attente), `db:migrate` ; état vérifié en prod.

### 2026-11-22 — série de relecture, verdict de David

- Série « Relecture — suites de 1re, 14 modèles publiés complétés » publiée par David
  (`scripts/series/1_SPE-relecture-suites-publies.json`, id 5cbf5d65).
- David, le 2026-11-22 : « je valide tout » (brouillons par `?point=` et série). Aucun verdict
  « À revoir » en base (table des relectures vide pour les 18 modèles).
- `publier-lot.ts --dir scripts/questions/1re-suites-a` en simulation : 4 brouillons passent.

### 2026-11-22 — publication, chantier clos

- David a lancé `publier-lot.ts --dir scripts/questions/1re-suites-a --publier` : les 4 modèles
  neufs sont publiés (vérifié par MCP lecture seule). #3009 mergée (série de relecture, journal).
- Clôture : journal et relevé archivés dans `docs/archive/wip/idees-1re-suites/`, rubrique 1AL1
  « publiée » dans `idees-ailleurs-repartition.md`, les 14 réservations retirées ; le doute sur le
  juge (`\frac{(n+2)4^n}{…}`) est noté dans `verifications-manuelles.md`.
