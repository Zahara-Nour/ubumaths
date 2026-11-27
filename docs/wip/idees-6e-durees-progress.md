# Chantier `idees-6e-durees` — idées de la rubrique « Durées » de 6e

## Reprendre ici

_Mis à jour le 2026-11-27, PR de rangement ouverte (branche `feat/idees-6e-durees-rangement`)._

- **État** : #3233 mergée, migrée (311bf024), 6 brouillons publiés par David. Ids de prod commités en tête de N1 à N6. Migration de rangement `20261127123146` générée (niveaux et titres concordent avec la prod) : test d'intégration vert, rouge sans la migration (4 échecs). `security-auditor` passé.
- **Prochaine action** : merge de la PR, puis `db:migrate` depuis le dépôt principal (`migration list --linked` avant : seule `20261127123146` doit attendre) ; puis la relecture dans `/dev/modeles`.
- **En attente de David** : rien avant la relecture.
- **Pièges en cours** : N6 a `form: off` (sinon 0,75 refusé face à ¾) ; les messages à décimaux s'écrivent `0.3` dans les specs.
- **Worktree / branche** : `../ubumaths-wt-idees-6e-durees-rangement`, `feat/idees-6e-durees-rangement`.

## Phase 0 (2026-11-27)

Page à cocher : https://claude.ai/artifact/TsiYTczFam8NQCUt7PPcKa (Oui / Non / Autrement + note, collection `verdicts`).

Question d'accès : personne ne gagne d'accès. Les migrations rangent des modèles neufs (sous-notion et point) et
ajoutent une variation au modèle publié 311bf024.

Si tout est oui : 6 modèles neufs (25 variations), 1 variation ajoutée à 1 modèle publié. Chaque variation a ses
specs (réponses justes sous plusieurs écritures, erreurs typiques refusées), trois erreurs prévues par case et un
coup de pouce.

### Décisions de David (2026-11-27)

- « Je valide les modèles » (dans la session, page à cocher laissée vide) : F1, N1 à N6 validés tels que décrits.
  N3 et N4 en deux modèles, une case par unité pour N3 : Q4 et la première moitié de Q2 sont donc tranchées par
  les fiches.
- « Je suis tes recos » (2026-11-27) : **Q1** N6 tagué 6-159 ; **Q3** attendu « 0 h 35 » seul, « 24 h 35 »
  refusé avec le message « après minuit, on repart de 0 h » ; **Q2** outil n° 69 noté « plus tard » dans
  `outils-manquants.md`. Phase 0 entièrement tranchée.

### Fiches

- **F1 — 0,75 h en heures et minutes** (1 variation de 311bf024, 6-159). Chez eux (6M4C-2) : a,b h → h min, avec
  0,1 … 0,9, 0,25 et 0,75. Chez nous : 311bf024 tire 0,1, 0,25 et 0,5 ; 38ba3458 tire les dixièmes. Il manque 0,75 h.
  Variation : « a,75 h = ? h ? min », a de 1 à 9. Deux cases. Erreurs prévues : 75 min, 7 h 5 min, a h 7 min.
- **N1 — Ajouter des durées avec les secondes** (modèle neuf, 6-206, 3 variations). Chez eux (6M4A) : min s + min s,
  h min s + h min s, avec ou sans retenues. Chez nous : six modèles d'addition, en heures et minutes seulement.
  Variations : (a) min s + min s, retenue des secondes (10 à 40 min) → ? min ? s ; (b) min s + min s, deux retenues
  (20 à 59 min) → ? h ? min ? s ; (c) h min s + h min s, deux retenues (1 à 5 h) → ? h ? min ? s. Une case par unité.
  Erreurs prévues : la retenue oubliée (37 min 82 s), une retenue de 100 au lieu de 60, les minutes non converties
  (1 h 72 min).
- **N2 — Calculer un horaire de début ou de fin** (modèle neuf, 6-157, 4 variations). Chez eux (6M4A-1) : durée,
  horaire de fin, horaire de début ; film, série, émission, train ; une série qui passe minuit. Chez nous : 6-157 ne
  calcule qu'une durée (663fafd3, 0bb7a4ca), sans passer minuit ; l'horaire d'arrivée n'existe que dans un problème
  à étapes (ee82f057). Variations : (a) horaire de fin = début + durée, retenue des minutes ; (b) horaire de début =
  fin − durée, emprunt d'une heure ; (c) durée entre 21 h 50 et 0 h 35 (minuit passé) ; (d) horaire de fin après
  minuit (22 h 40 + 1 h 55). Durées de 25 min à 3 h 55 ; contextes film, train, match, émission. Deux cases
  (? h ? min). Erreurs prévues : l'emprunt de 100 au lieu de 60 (11 h 15 − 1 h 35 = 9 h 80), une retenue de 100
  au lieu de 60, 24 h 35 au lieu de 0 h 35 (Q3).
- **N3 — Convertir des durées : jours, semaines, mois** (modèle neuf, 6-159, 6 variations). Chez eux (6M4C, 6M4C-5) :
  h → j h, h → semaines j h, mois → ans mois, et les sens inverses. Chez nous : 6-159 ne connaît que h, min, s.
  Variations : (a) 53 h = ? j ? h (1 à 6 j) ; (b) 2 j 5 h = ? h ; (c) 45 j = ? semaines ? j (2 à 9 semaines) ;
  (d) 6 semaines 3 j = ? j ; (e) 41 mois = ? ans ? mois (2 à 9 ans) ; (f) 3 ans 5 mois = ? mois. Une case par unité
  (Q2). Erreurs prévues : diviser par 60 ou par 10 (5 j 3 h pour 53 h), le quotient et le reste inversés.
- **N4 — Convertir des durées avec les secondes** (modèle neuf, 6-159, 4 variations). Chez eux (6M4C, 6M4C-1,
  6M4C-5) : s → min s, h min → s, s → h min s, h min s → s. Chez nous : min ↔ s pour des minutes entières (1 à 10).
  Variations : (a) 187 s = ? min ? s (2 à 9 min) ; (b) 1 h 25 min = ? s (1 à 2 h) ; (c) 4 523 s = ? h ? min ? s
  (1 à 2 h) ; (d) 1 h 12 min 40 s = ? s. Une case par unité. Erreurs prévues : 1 h = 60 s, le reste pris pour des
  minutes, 3,07 min pour 187 s.
- **N5 — Écrire une durée en heures décimales** (modèle neuf, 6-159, 4 variations). Chez eux (6M4C-3, 6M4C-4) :
  h min → heures décimales, min → heures décimales, minutes décimales → min s. Chez nous : seulement le sens décimal →
  h min (311bf024 … 65c32979). Variations : (a) 2 h 45 min = ? h (15, 30 ou 45 min) ; (b) 90 min = ? h (multiples de
  15, 45 à 225 min) ; (c) 1 h 12 min = ? h (multiples de 6 min, dixièmes d'heure) ; (d) 3,5 min = ? min ? s (0,1 ;
  0,25 ; 0,5 ; 0,75 min). Une case nombre, l'unité donnée. Erreurs prévues : **2,45 h pour 2 h 45 min** (l'erreur
  du chapitre), 1,30 h pour 90 min, 3 min 5 s pour 3,5 min.
- **N6 — Unités de durée et fractions d'heure** (modèle neuf, point : Q1, 4 variations). Chez eux (6M4autoC,
  6M4autoE) : retrouver l'unité dans « 1 … = 24 heures », et ¼ h, ½ h, ¾ h ↔ 15, 30, 45 min, en liste déroulante.
  Chez nous : rien en 6e (CE1 10ec8633 en mots seulement). On demande le nombre, mieux que l'unité, sauf en (b).
  Variations : (a) 1 j = ? h, 1 h = ? min, 1 min = ? s, 1 semaine = ? j ; (b) « 1 … = 60 min » : case choix jour,
  heure, minute, seconde (leur forme gardée : l'unité ne se tape pas) ; (c) $\frac34$ h = ? min (¼, ½, ¾) ;
  (d) 45 min = ? h, fraction ou décimal accepté (¾ ou 0,75). Erreurs prévues : 100 min, 34 min pour ¾ h, 0,45 h.
- **Rien** : 6M4autoD (millénaire, siècle, année) est couvert par ffca5b4a, qui demande le nombre ; leur liste
  d'unités n'apporte rien.

### Questions

- **Q1 — Point de N6.** Le BO de 6e met « les unités de durées et les relations qui les lient » et « un quart
  d'heure c'est 15 minutes » dans les automatismes, sans point à lui en prod (seul 6-156 l'est, pour les années).
  Recommandation : 6-159 (convertir des durées).
- **Q2 — Jours, semaines, mois en une case ?** Notre case « durée composée » ne lit que h, min et s. Recommandation :
  une case par unité pour N3 (comme le CM2 2fda6db8), et l'outil noté « plus tard » dans `outils-manquants.md`
  (n° 69 : case durée composée en j, semaines, mois, ans).
- **Q3 — Après minuit.** Recommandation : attendu « 0 h 35 » ; « 24 h 35 » refusé avec un message (« après minuit,
  on repart de 0 h »).
- **Q4 — Conversions : deux modèles (N3, N4) ou un seul ?** Recommandation : deux, chacun une famille d'unités, plus
  simple à choisir pour un prof.
