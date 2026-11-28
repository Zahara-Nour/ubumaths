# Chantier `idees-6e-decimaux` : idées reprises d'ailleurs, rubrique « Nombres décimaux » de 6e

Skill [`idees-rubrique`](../../../../.claude/skills/idees-rubrique/SKILL.md). Tableau :
[idees-ailleurs-repartition.md](../../../wip/idees-ailleurs-repartition.md) (section Sixième, ligne 6N2 prise le
2026-11-22). Relevé : [idees-6e-decimaux-releve.md](idees-6e-decimaux-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-23, chantier clos._

- **État** : rubrique **publiée** : les 6 modèles neufs (a2ae7206, 67954fbb, 44d352a2, a29bf7c7,
  33ff7000, c04b78f8) et les 16 variations des 10 publiés (série de relecture f5275c46) validés par
  David et publiés (vérifié par MCP) ; journal archivé · **Prochaine action** : aucune · **En attente
  de David** : rien (idée reportée : le matériel décimal, 6N2autoB-2, dans « Idées en attente » du
  tableau).
- **Pièges retenus** : ni essai en base locale ni jeu dans l'aperçu pendant ce chantier.
- **Worktree / branche** : aucun.

## Décisions de David (2026-11-22)

« je valide tes recos » : toutes les recommandations de la page de phase 0 sont validées.
F1 à F7, F9 à F11, F12a, F12b : oui. F8 : un seul modèle, sur le produit (6-118). Q1 : variation de
b586bdf8 à 3 ou 4 termes. Q2 (matériel décimal) : plus tard, noté dans « Idées en attente » du
tableau. Q3 : migration de rangement sans accès nouveau. 10 modèles publiés réservés dans le tableau.

## Verdicts esquissés (2026-11-22, reportés dans le relevé)

- ✅ rien : 6N2A-1, 6N2A-4, 6N2A (CM1 39e7d0a5, 1ed5202f, 613817ea ; 6e b586bdf8, 4b0b03b7) ;
  6N2autoB-1, -3, -4 (CM2 58f7a8dd, f316dfa7, a62ccb82) ; 6N2B-1, -3, -5 (6-115, ddbce820) ; 6N2C-1,
  6N2C (e3d87166) ; 6N2E-2, -5, -6 ; 6N2H (26aceb03) ; 6N2J (3c9284c5) ; 6N2DASupprimer (ancien).
- F1 🟡 variation de 2c5bae8f (6-102) : « 1/10 = ? × 1/100 », « 1 = ? × 1/10 » (6N2autoA, autoA-1).
- F2 ❌ décimal → fraction décimale en 6e (12,8 = ?/10 ; 0,07 = 7/?), et a + b/100 + c/100 → décimal
  (6N2autoB, autoB-5) : nos 6-106 n'ont que /2, /4, /5, /10 d'un nombre < 1. Point 6-106.
- F3 ❌ « par combien multiplier ou diviser pour que le chiffre des unités devienne celui des … »
  (6N2autoC-2, 6N2B-4, 6N2C-2) : leur QCM → saisie (100, 0,01). Point 6-101.
- F4 🟡 nombre manquant ×/÷ 10, 100, 1 000 : puissance, dividende, diviseur à trouver (6N2autoC,
  autoD, autoD-1, autoD-2 ; CM1/CM2 n'ont que produit, quotient, facteur). CM2 + 6, point du CM2
  (précédent 6e-entiers Q1) : point exact à relever.
- F5 🟡 nombre manquant × 0,1 ; 0,01 ; 0,001 : facteur ou coefficient (6N2B, B-2, autoD-4). 6-115.
- F6 🟡 variation de 571ca739 (6-118) : les deux facteurs décalés, a·10^p × b·10^q (6N2D).
- F7 ❌ poser la multiplication de deux décimaux, bloc `operation` (6N2E-1, 6N2E) : CM1/CM2 ne posent
  que décimal × entier ; à vérifier que le bloc accepte décimal × décimal. 6-118.
- F8 ❌ dernier chiffre (non nul) d'une somme, d'une différence, d'un produit de décimaux (6N2A-3,
  6N2E-4) : b9677e1f (entiers, sans point) n'y suffit pas. Un point par modèle → 6-114 / 6-198 / 6-118 :
  question à David (un modèle ou trois).
- F9 🟡 « somme ou produit » des deux mêmes décimaux, 2 cases (6N2E-3) : contre la confusion. 6-118.
- F10 🟡 variation de 7deff4e0 (6-119) : arrondir chaque facteur puis le produit, 3 cases (6N2F-1).
- F11 🟡 problèmes : 32b7a9bc (6-120) prix de 10/100 kg, plusieurs étapes (6N2G, G-1) ; 87cfa41b
  (6-122) part arrondie au centime par excès, 1,5 L ÷ 8 en cL (6N2I, I-1, I-2).
- F12 🟡 division euclidienne en 6e (6-123 / 6-124) : égalité N = (d × ?) + ? aux plages de 6e et
  égalité non conforme à transformer (6N2J-1, J-2, K-3, K-4 ; seuls les CE2 sans point existent) ;
  vocabulaire dividende/diviseur/quotient/reste en choix (6N2J-4) ; variations de 3f4bacc6 : « combien
  pour un de plus » (K-1), colliers (K-2), jour de la semaine dans N jours (K).
- Rien, couvert ailleurs : 6N2J-3 (multiples et diviseurs CM1, CM2, 5e).
- Outil manquant possible : matériel décimal (cube = 1, plaque = 1/10…) pour 6N2autoB-2 ; le bloc
  `collection` ne fait que les entiers. À proposer à David avant de l'écrire dans `outils-manquants.md`.
- Pas de nouvelle variation 6N2A-2 (somme de 3 à 5 décimaux) décidée : à trancher (variation de b586bdf8).

## Historique

- 2026-11-22 : ligne 6N2 réservée (commit b4010dd46 sur `main`). Worktree créé. Points de 6e et de CM2
  relevés en prod avec leurs modèles (MCP). Chaque point de 6e sur les décimaux et la division
  (6-102 à 6-124, 6-198) a au moins un modèle ; 6-118 en a 12. Les modèles de division euclidienne du
  CE2 (14a51794, 15ed5af4, 3d4c45e5, 59a07a94) n'ont **aucun point**. 6-123 : 3c9284c5 (bloc
  `operation`, 3 variations), 6-124 : 3f4bacc6 (boîtes, cars, durées). Aucun modèle de 6e sur
  « divisible / diviseur / multiple » à partir d'une division (faf57d3b est de 5e, Oui / Non et QCM).
- 2026-11-22 : les 4 agents ont lu le code source des exercices ; tables versées dans le relevé.
- 2026-11-22 : recompte, sondage B et C, relevé de nos modèles (6e, CM1, CM2) ; verdicts esquissés.
- 2026-11-22 : 6N2autoB et 6N2K-4 ajoutés au relevé, verdicts versés (6N2C-3 rangé en F4) ; page de
  phase 0 publiée (F12 coupée en F12a 6-123 et F12b 6-124).
- 2026-11-22 : lot écrit par deux agents, relu par specs. Scripts `docs/wip/questions/idees-6e-decimaux-neufs.py`
  et `-publies.py`. Neufs : F2 (3 var.), F3 (2), F5 (2), F7 (1, bloc `operation` décimal × décimal
  vérifié dans le code, `factorsInPlace`), F8 (2), F12a (3). Publiés : 2c5bae8f +1, 819df2a9 +2,
  590169c4 +2, 571ca739 +1, ddbce820 +2, 7deff4e0 +1, 32b7a9bc +1, 87cfa41b +2, 3f4bacc6 +3, b586bdf8 +1.
  Écarts à la fiche : F2c toujours avec retenue ; F12a c impose quotient < reste < diviseur (sinon
  l'égalité se lit aussi comme division par le quotient) ; Q1 sommes sous 710 environ. Erreurs prévues
  non inventées : 1 ou 2 seulement pour F4, F6, Q1, F10 case 2. Lettres `e`, `i` réservées.
- 2026-11-22 : brouillons publiés par David (a2ae7206 F2, 67954fbb F3, 44d352a2 F5, a29bf7c7 F7,
  33ff7000 F8, c04b78f8 F12a). Relevé en prod : sans nœud ni tag ; 6-106 posé sur la notion
  « Décimaux : numération » (voisins sur « forme fractionnaire »), les autres sur leur sous-notion ;
  590169c4 à {CM2}. Migrations de rangement et de contenu écrites, tests verts et rouges sans elles.
- 2026-11-22 : #3018 mergée, `db:migrate` joué (seules nos 2 migrations en attente), état vérifié en prod.
- 2026-11-23 : série de relecture des 10 publiés simulée puis publiée par David (f5275c46).
- 2026-11-23 : David valide tous les modèles ; publication des 6 brouillons par `publier-lot.ts` (David), statuts vérifiés en prod ; chantier clos, journal archivé.
- 2026-11-23 : suite, le matériel décimal (6N2autoB-2) : modèle 111ba9c5 publié (#3024), journal
  [idees-6e-decimaux-materiel-progress.md](idees-6e-decimaux-materiel-progress.md).
