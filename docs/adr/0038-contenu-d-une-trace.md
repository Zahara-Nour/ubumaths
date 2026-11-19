# 0038 — Le contenu d'une trace : la graine, la réponse par case, les temps

- **Statut** : acceptée — mise en œuvre par le chantier `formes-de-serie` (journal :
  [`docs/archive/wip/formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md))
- **Date** : 2026-11-11 · **Décidée par** : David

## Contexte

Les traces (`skill_attempts` : élève, modèle, réussi, origine, date) fondent tous les bilans (grille
point × élève, top des points à remédier, « Ma progression »). Elles n'ont ni temps ni réponse ;
`with_help` (toujours faux) et `phase_blocage` (presque toujours vide) ne sont jamais lus. Flash-cards
et Entraînement n'écrivent qu'en fin de série : une série abandonnée ne laisse rien. Les séances libres
ne s'écrivent plus ([ADR 0037](0037-cinq-formes-de-serie-deux-boutons.md)).

Règle de départ : la trace garde ce qu'exige un besoin de suivi validé (journal, § « Besoins de suivi
validés » : P1-P9, E1-E4, A1-A2), rien d'autre.

Les réponses d'élève sortent en une liste de chaînes, une par case (50 cases, 2 000 caractères au
plus). Un QCM garde les numéros d'origine des choix, des étiquettes à ranger leur position affichée
(mélangée) : sans le tirage, elles sont illisibles. Une seule source de hasard, initialisée par la
graine, produit tout le tirage (`generateInstance`) ; les contrôles régénèrent déjà la question depuis
leur graine.

## Décision

Une trace **par question, écrite dès la réponse** :

- **gardé** : élève, modèle, réussi, date ; **origine** à trois valeurs : **corrigé** (par l'appli) ·
  **déclaré** (auto-évaluation) · **prof** ; en base, les valeurs `auto` / `student_self` / `teacher`
  restent, `srs` n'est plus écrit et les anciennes traces `srs` se lisent « déclaré », sans réécriture
  (2026-11-11) ;
- **lieu** de la réponse : Flash-cards, Saisie, Contrôle blanc, Course aux nombres, révision ou
  **contrôle** (En classe ne laisse pas de trace d'élève) ;
- pour les formes chronométrées (Contrôle blanc, Course aux nombres) et le contrôle : **durée de
  réponse**, **durée allouée** et **fin** (validée / temps écoulé) ; pas de durée en Flash-cards, Saisie
  ni révision, où l'élève peut retourner la carte pour voir la réponse (précisé le 2026-11-11) ;
- **graine** — sauf pour le contrôle, dont la graine ne quitte jamais le serveur (D18) : elle reste
  dans la copie (précisé le 2026-11-11, PR 4 bis) ;
- **réponse** case par case (pas en Flash-cards) ; pour une figure à compléter, **pas le tracé** ;
- **verdict par case** (juste / faux).

**Accès** : l'élève lit ses traces ; **le prof lit individuellement** réponses, temps et lieu de ses
élèves, comme les copies de contrôle. **Conservation** : les réponses jusqu'à la fin de l'année
scolaire, dans l'export RGPD ; réussi/raté et durées comme aujourd'hui.

**Pour l'avenir** (second essai, aide sur une question de série) : **une trace par essai** ;
`with_help` est gardé pour « réussi avec aide » ; le numéro d'essai s'ajoute le jour où le second essai
existe.

## Écarté

- **Les valeurs tirées et les ordres de mélange** au lieu de la graine : la graine reproduit tout,
  avec la même limite.
- **Figer dans la trace le texte des choix et des étiquettes** : plus lourd. Accepté à la place : une
  modification du modèle ou du moteur fausse la relecture d'une ancienne réponse ; les erreurs
  fréquentes ne regroupent que les traces postérieures à la dernière modification du modèle ; le verdict
  par case reste juste.
- **Garder le tracé d'une figure** : long, et deux tracés justes ne se ressemblent jamais.
- **Le prof ne voit que des regroupements** (« 7 élèves ont répondu 12 ») : non, lecture individuelle.
- **Masquer les dates exactes au prof dans les données** (fonction qui ne rend que des paliers par
  semaine) : « sans dates précises » (P5) vaut pour l'affichage ; le prof lit déjà `created_at`.
- **Corriger la Saisie et le Contrôle blanc côté serveur** pour que « corrigé » soit prouvé : non,
  comme aujourd'hui ([ADR 0001](0001-correction-cote-client.md), [ADR 0014](0014-acquisition-sur-verdict-client-a-reetudier.md)).
- **Une trace de la seule dernière réponse** (futur second essai) : les erreurs du premier essai sont
  celles que P4 et E4 cherchent.
- **Supprimer `with_help`** : gardé pour l'aide à venir. `phase_blocage` reste à supprimer, dans un
  temps à part (destructif).
- **Rattacher la trace au contrôle** (P6) : le bilan d'un contrôle se lit dans ses réponses
  (`test_answers`). **Identifiant de séance** : aucun besoin ne l'exige.
- **Arrêter les traces des contrôles** : corrigé le 2026-11-11. Une première version de cet ADR disait
  « les contrôles n'écrivent pas de trace » : faux, un contrôle envoyé à l'heure écrit des traces
  « corrigé » (`evaluation-attempts.ts`, `recordSeriesReviews`). Elles restent, lieu « contrôle », avec
  les durées ; réponse, verdict par case et graine sont déjà dans la copie (`test_answers`).

## Conséquences

- Migration additive sur `skill_attempts` (colonnes ; aucune nouvelle valeur d'origine) ; question d'accès tranchée
  ci-dessus.
- Le prof lit du texte libre écrit par des mineurs : borné en longueur, purgé en fin d'année scolaire.
- Une trace « corrigé » reste falsifiable par un élève qui écrit lui-même ses traces, comme aujourd'hui.
- Une trace « contrôle » (`evaluation`) n'est écrite que par le serveur : l'élève ne peut pas en
  insérer une (policy d'insertion, migration `20261111111212`, question d'accès tranchée le 2026-11-11).
- Hors chantier, relevé : un contrôle tronque en silence au-delà de 50 cases / 2 000 caractères
  (`submission.ts`), une séance libre refuse.
