# Chantier `palotins` — où et quand le Palotin se montre

## Reprendre ici

_Mis à jour le 2026-11-11, PR 1 en cours._

- **État** : PR 1 (maison, écusson, passages) codée sur `feat/palotins`, tests verts, doc système à jour ; revue `code-reviewer` puis PR.
- **Prochaine action** : ouvrir la PR 1, CI, merge ; puis PR 2 (passages en séance, partie C).
- **En attente de David** : vérification visuelle sur le serveur de la branche (port 5178).
- **Pièges en cours** : `GET /api/student/buddy/presence` ÉCRIT (remise à zéro de la Constance) ; un passage acquitte le retour à l'AFFICHAGE, pas avant.
- **Worktree / branche** : `../ubumaths-wt-palotins`, `feat/palotins`.

---

## Point de départ (code au 2026-11-11)

- `BuddyWidget` est monté dans `src/routes/(protected)/dashboard/student/+layout.svelte` : présent **en permanence** sur toutes les pages `/dashboard/student/*` (devoirs, cours, fiches, démineur, Chatterie…).
- Il parle seul : au montage, retour d'absence ou Constance perdue, puis annonce de la Chatterie (nouveautés ou Mathoux en sieste), sinon salutation ; ensuite `idle` / `idle_lore` toutes les 45 à 90 s, sans fin.
- **Absent** de l'accueil élève (`/dashboard`, `StudentDashboard.svelte`), des révisions (`/dashboard/revisions`) et des séances (`/automaths/test`, route publique) : il n'y apparaît qu'en fin de séance, par `BuddyGainCard`.
- Les réactions pendant les exercices prévues par la spec (`docs/systeme/buddy-palotins.md`) n'ont jamais été branchées.

## Décisions de David (2026-11-11)

Toutes les recommandations validées :

1. **Maison** = accueil élève (`/dashboard`) + Chatterie. Le Palotin y est toujours là.
2. **Ailleurs, il passe** : il entre, dit sa réplique, repart.
3. **Écusson d'appel** discret ailleurs que dans la maison : un clic le fait venir avec son état.
4. **Plafond** : 1 passage spontané toutes les 10 min ; les évènements importants passent quand même ; mémoire dans le navigateur, pas en base. `idle` / `idle_lore` seulement dans la maison.
5. **Pendant les séances** : rien pendant une question ; série de 5 réussites d'affilée, ou 3 erreurs sur la même notion (encouragement, pas d'indice) ; au plus 1 passage par séance hors fin de séance.
6. **Pages publiques** (`/automaths/test`) : oui pour un élève connecté qui a un Palotin, jamais pour un visiteur.

---

## Phase 0 — comportements

### A. Maison (accueil élève + Chatterie)

**Nominal**

- A1. Un élève qui a un Palotin arrive sur `/dashboard` : le Palotin est affiché en permanence (même place qu'aujourd'hui, bas à droite).
- A2. Au chargement de la maison, comme aujourd'hui : réplique du retour (« tu m'as manqué » ou Constance perdue), puis l'annonce de la Chatterie (nouveautés ou Mathoux en sieste), sinon une salutation.
- A3. Dans la maison, répliques `idle` / `idle_lore` à intervalles aléatoires, comme aujourd'hui.
- A4. Clic sur le Palotin : son état (pansées, tour de panse, Constance, lien vers la Chatterie, changer de Palotin), comme aujourd'hui.
- A5. Sur la Chatterie, pas d'annonce de la Chatterie (déjà le cas).

**Limite**

- A6. Élève sans Palotin (quiz jamais fait) : le quiz de choix s'ouvre **sur l'accueil** (aujourd'hui : sur n'importe quelle page `/dashboard/student/*`). Validé le 2026-11-11.
- A7. Professeur, admin, tuteur sur `/dashboard` : aucun Palotin (inchangé).

**Erreur**

- A8. Lecture du Palotin en échec : pas de Palotin, l'accueil s'affiche normalement, rien d'autre ne bloque.

### B. Hors de la maison : écusson et passages

Concerne toutes les pages connectées de l'élève hors maison : `/dashboard/student/*`, `/dashboard/revisions/*`, `/automaths/test` (connecté).

**Nominal**

- B1. Le Palotin n'est plus affiché en permanence. À sa place, un **écusson** discret en bas à droite (pièce héraldique du Palotin : triangle pour Giron, pointe pour Pile, diagonale pour Cotice), immobile, sans bulle.
- B2. Clic sur l'écusson : le Palotin **entre** (animation courte) avec son état, comme A4. Fermer, ou cliquer à nouveau : il **repart** et l'écusson revient.
- B3. **Passage** : le Palotin entre, dit **une** réplique (durée actuelle de la bulle), puis repart seul. L'écusson est masqué pendant le passage.
- B4. Plus de répliques `idle` / `idle_lore` hors de la maison.
- B5. **Passages importants**, hors plafond, une fois chacun :
  - retour après une longue absence (« tu m'as manqué »), s'il n'a pas encore été dit : l'élève arrivé par un lien de cours le voit sur cette page ;
  - nouveautés de la Chatterie (Mathou réveillé, nouveau Mathou), tant qu'elles ne sont pas vues.
- B6. **Passages spontanés**, soumis au plafond : Mathoux en sieste (« 2 Mathoux font la sieste »), Constance perdue.
- B7. **Plafond** : au plus un passage spontané toutes les **10 minutes**, toutes pages et onglets confondus (mémoire du navigateur). Un passage important ne consomme pas le plafond.

**Limite**

- B8. Navigation rapide entre pages : un passage n'est pas rejoué à chaque page (le plafond et le « une fois » de B5 le garantissent).
- B9. Mémoire du navigateur illisible (navigation privée, stockage bloqué) : le plafond tient pour la page ouverte seulement ; jamais d'erreur.
- B10. `prefers-reduced-motion` : le Palotin apparaît et disparaît sans glisser.
- B11. Mobile : écusson à zone tactile ≥ 44 px, qui ne recouvre pas les boutons de validation des exercices (à vérifier sur les pages de séance).
- B12. Élève sans Palotin : ni écusson ni passage hors de la maison.
- B13. Visiteur non connecté, professeur, admin sur `/automaths/test` : ni écusson ni passage.

**Erreur**

- B14. Lecture du Palotin ou de l'annonce de la Chatterie en échec : pas de passage, l'écusson reste si le Palotin est connu, la page n'est jamais bloquée.

### C. Pendant une séance (Entraînement, révision)

**Nominal**

- C1. **Jamais pendant une question** : un passage attend que la réponse soit corrigée, et part avant la question suivante (ou part dès que l'élève passe à la suite).
- C2. **5 réussites d'affilée** dans la séance : passage avec une exclamation du Palotin.
- C3. **3 erreurs sur la même notion** dans la séance : passage avec un encouragement (pas d'indice). Notion = celle de la question ; question sans notion : on ne compte pas.
- C4. **Au plus un passage par séance**, hors fin de séance (le premier déclencheur gagne).
- C5. Fin de séance : `BuddyGainCard` comme aujourd'hui (gain de pansées, nouveau tour de panse).
- C6. Pendant une séance, aucun passage de la partie B (sieste, Constance…) : ils attendent la fin.

**Limite**

- C7. **Course aux nombres** (chronométrée) : aucun passage pendant la course, seulement la fin de séance. Validé le 2026-11-11.
- C8. Séance de moins de 5 questions : la série de C2 ne peut pas avoir lieu, c'est normal.
- C9. Les passages de séance ne consomment pas le plafond de B7 (ils sont déjà limités à un par séance).

**Erreur**

- C10. Le Palotin ne peut pas être lu au début de la séance : séance normale, sans passage ; la fin de séance reste comme aujourd'hui.

### Hors périmètre

- **Indices** du Palotin pendant une question et **rappels** (devoirs à rendre, révisions dues) : voulus par David, mais dans **un autre chantier**, après celui-ci (décision du 2026-11-11).
- Réactions entre Palotins, mode silencieux de classe.

---

## Découpage

- **PR 1 — maison, écusson, passages** (parties A et B) : Palotin chargé sur l'accueil élève et les révisions ; écusson ; passages importants et spontanés avec plafond ; fin des `idle` hors maison. Affichage seul, aucune migration. Revue : `code-reviewer` (Sonnet).
- **PR 2 — passages en séance** (partie C) : `/automaths/test` (élève connecté) et révision espacée. Aucune migration. Revue : `code-reviewer` (Sonnet).
- Fin de chantier : mise à jour de `docs/systeme/buddy-palotins.md` (§ « Présence permanente » devient « Maison et passages », le « toujours visible » du Concept est retiré), archivage du journal.

## Décisions d'implémentation

- **2026-11-11, architecture (David)** : un seul composant `PalotinPresence`, monté par le layout racine (import dynamique, élève connecté), qui lit le Palotin APRÈS l'affichage par `GET /api/student/buddy/presence` ; la remise à zéro de la Constance et la lecture du retour quittent le layout de l'espace élève pour cette API. Alternative écartée : chargement serveur dans les 4 zones.
- **Séances en PR 1** : les révisions en cours (`/dashboard/revisions/decks/<id>/study`, `/dashboard/revisions/chapitres/<id>`) et `/automaths/test` sont des zones « séance » dès la PR 1 : écusson seul, aucun passage de la partie B (C6). Les réactions (C2, C3) viennent en PR 2.
- **Sieste annoncée une fois par chargement** : l'annonce de la Chatterie est lue une fois ; dite (ou consommée par une nouveauté), elle ne revient pas toutes les 10 minutes.

## Historique

- 2026-11-11 : discussion, recommandations validées par David, phase 0 écrite puis validée (quiz sur l'accueil, aucun passage pendant la Course aux nombres) ; indices et rappels renvoyés à un autre chantier.
