# Chantier `idees-tle-limites` — journal

Idées reprises d'ailleurs, rubrique « Limites de fonctions » de Terminale spécialité (code TSA2,
18 exercices), selon le skill `idees-rubrique`. Relevé : [idees-tle-limites-releve.md](idees-tle-limites-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, PR #3010 ouverte._

- **État** : 4 brouillons en prod (créés par David) ; #3010 ouverte (ids, migration de rangement,
  migration de contenu des 7 publiés, +15 variations) ; intégration 53 verts, 11 rouges sans ·
  **Prochaine action** : réponse de David sur le rangement → merge, `migration list --linked`,
  `db:migrate` ; puis relecture dans `/dev/modeles` · **En attente de David** : rangement de F1
  (notion seule) ; F3 (a, b ou c) · **Pièges en cours** : ne pas merger avant la réponse (le
  `db push` d'une autre session jouerait la migration) ; `{{e}}` interdit (Euler) ·
  **Worktree / branche** : `ubumaths-wt-idees-tle-limites-migrations`, `feat/idees-tle-limites-migrations`.

## Historique

### 2026-11-22 — rubrique prise, relevé

- Rubrique choisie par David parmi les libres de Terminale ; ligne « prise » poussée sur `main`.
- Relevé : 4 exercices lus directement, 14 par deux agents (Sonnet) ; verdicts posés contre les
  énoncés de nos variations en base (MCP lecture seule). 13 modèles publiés sur les points de limites
  de fonctions (TSPE-400 à 406, 415, 416, 580 à 584). Trous nets : lecture d'une limite sur une
  courbe, limite par composition.
- Aucun des modèles candidats n'était réservé par une autre session.

### 2026-11-22 — phase 0 publiée

- Page à cocher : https://claude.ai/artifact/1F96L4GrKY7ThQKZsvWoL7 (12 fiches, 2 questions). Si tout
  est oui : 4 modèles neufs (13 variations : lecture sur courbe en +∞ et en −∞, composition, tableau
  de variations d'une homographique) et 15 variations de 7 modèles publiés (a4d8dc52, 04ec9518,
  5bf5b452, b97dabe1, ae70373c, 806c10f4, 7844be9a).
- Q1 : deux modèles de lecture sur courbe (TSPE-397 et TSPE-572) ou un seul. Q2 : quantité
  conjuguée, absente du BO de Tle → je recommande rien.
- Question d'accès : personne (rangement de modèles, variations ajoutées).
- Pour d'autres rubriques (« Idées en attente » du tableau) : ln(axⁿ + k) par composition (TSA2-35)
  → logarithme ; variations d'une homographique et fonction auxiliaire (TSA2-34, 52) → dérivation.
- Questions ouvertes, sans réponse = non tranchées : F1 à F12, Q1, Q2.

### 2026-11-22 — phase 0 validée

- David : « je valide tout et je garde les modèles hors programme ». Donc F1 à F11 oui, Q1 oui
  (deux modèles de lecture sur courbe, TSPE-397 et TSPE-572), Q2 : la quantité conjuguée devient un
  **modèle sans point**, 2 variations (√(ax + b) − √(ax + d) et √(x² + b) − √(x² + d) → 0) ; la fiche
  dit pourquoi : technique ni nommée ni illustrée au BO de Tle spé (`T_SPE.md`), qui demande des
  « cas simples ».
- Lot : **5 modèles neufs** (15 variations) et **15 variations** de 7 modèles publiés, réservés dans
  le tableau (a4d8dc52 +3, 04ec9518 +2, 5bf5b452 +1, b97dabe1 +2, ae70373c +3, 806c10f4 +3,
  7844be9a +1).

### 2026-11-22 — lot écrit

- Scripts `docs/wip/questions/idees-tle-limites-neufs.py` (→ `scripts/questions/idees-tle-limites-neufs/`)
  et `idees-tle-limites-publies.py` (→ `scripts/questions/idees-tle-limites-publies/`, 7 modèles exportés de
  prod, variations ajoutées à la fin ; le script repart du contenu de prod, relançable).
- Neufs : « Conjecturer la limite en +∞ / −∞ d'une fonction sur sa courbe » (3 variations chacun :
  palier ou cloche, limite infinie, oscillation pure ou amortie en choix), « Limite d'une fonction
  par composition » (5), « Lever une forme indéterminée avec la quantité conjuguée » (2, sans point).
- Publiés : a4d8dc52 +3 (F4 ×2 tableau de variations, F5 choix), 04ec9518 +2, 5bf5b452 +1, b97dabe1
  +2, ae70373c +3, 806c10f4 +3, 7844be9a +1.
- Vérifié : `question:specs` vert sur les 11 fichiers, `create-questions` en simulation vert,
  `sonde-courbes` 0 problème (600 blocs), tableaux de F4 passés au parseur sur 300 tirages (91 blocs,
  0 problème), modèles neufs créés en base locale et joués dans l'aperçu (ids locaux retirés).
- Erreurs prévues : pas d'erreur inventée pour atteindre trois. F9 b et c (gendarmes avec sin / cos)
  n'en ont aucune : l'erreur réelle (« sin x n'a pas de limite, donc f non plus ») ne se tape pas.
- **F3 bloqué, question à David** : le tableau de variations d'une homographique à compléter
  demandait de cacher les quatre limites. Notre bloc ```variation refuse de cacher une limite
  infinie (`variation-table-parser.ts`) ; trois des quatre le sont. Ajouté à `outils-manquants.md`
  (n° 50). Choix possibles : (a) tableau affiché sans limites et quatre cases sous le tableau ;
  (b) attendre l'outil (n° 50) ; (c) laisser F3. Sans réponse, rien n'est écrit.

### 2026-11-22 — brouillons en prod, migrations (#3010)

- David a lancé `create-questions --publier` : 1b97da49, 5ab2aee2, a1e540c9, ec040806 en `draft`
  (MCP lecture seule). Ids commités sur la branche, dépôt principal remis propre.
- Relevé : TSPE-397, 572, 581 sont posés sur la notion « Fonctions > Limites de fonctions » (7
  sous-notions : asymptotes, comparaison et encadrement, croissances comparées, formes
  indéterminées, limite en un point, limites usuelles, opérations). Niveaux : ex aequo courants en
  prod (461 nœuds), niveaux des fichiers gardés.
- Rangement proposé : F1 (+∞, −∞) → la notion elle-même (aucune sous-notion de lecture graphique ;
  210 modèles en prod sont rangés sur une notion qui a des sous-notions) ; F2 → opérations ; Q2 →
  formes indéterminées, sans point. Question posée à David.
- Migration de contenu : 7 migrés, +15 variations, 0 corrigée. `security-auditor` lancé.
