# Chantier `idees-tle-limites` — journal

Idées reprises d'ailleurs, rubrique « Limites de fonctions » de Terminale spécialité (code TSA2,
18 exercices), selon le skill `idees-rubrique`. Relevé : [idees-tle-limites-releve.md](idees-tle-limites-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, lot écrit (F3 en attente)._

- **État** : lot écrit et vert (specs, sonde des courbes, tableaux sondés, aperçu local) : 4 modèles
  neufs (F1 ×2, F2, Q2 sans point ; 13 variations) et 15 variations ajoutées aux 7 publiés ; PR des
  fichiers ouverte · **Prochaine action** : CI verte → merge ; puis David lance
  `create-questions --dir scripts/questions/idees-tle-limites-neufs --publier` (prod), je commite
  les ids, PR des migrations (rangement + tag des neufs, contenu des publiés par
  `migration-contenu.ts`) · **En attente de David** : F3 (voir Historique, « lot écrit ») ·
  **Pièges en cours** : règles du tag à vérifier en base avant la migration de rangement ; niveaux
  numérotés à relever juste avant ; `{{e}}` interdit (constante d'Euler), `e^x` dans un message
  d'erreur réécrit en `\exponentialE` · **Worktree / branche** :
  `../ubumaths-wt-idees-tle-limites`, `feat/idees-tle-limites`.

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
