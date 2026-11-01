---
status: en cours
---

# Chantier `fuite-enonce` — l'énoncé public d'une évaluation notée ne dit plus la réponse

## Reprendre ici

_Mis à jour le 2026-11-01, phase 0 validée._

- **État** : phase 0 validée par David (Q1-Q4 : les quatre recos, § 3) ; rien de codé.
- **Prochaine action** : Q3, auditer les autres chemins (devoirs `api/student/worksheets/…`, séances, défis) ;
  puis lot 1 (masques simples), tests rouges d'abord : démarrer une évaluation, aucune cible dans le JSON.
- **En attente de David** : rien.
- **Pièges en cours** : ne pas casser le dessin du geste (l'écran doit garder noms et nombre de points / barres) ;
  la correction reste au serveur sur l'instance complète. Revue `code-reviewer` + `security-auditor` (Opus).
- **Worktree / branche** : `ubumaths-wt-fuite-enonce` · `fix/fuite-enonce`.

---

## 1. Origine

Trouvé pendant `points-repere` (lot 1, #2096, 2026-11-01). En évaluation notée, `toPublicQuestion`
(`src/lib/questions/public-question.ts`) copie `instance.statement` tel quel : le texte source des blocs à
geste part au navigateur, réponse comprise. Les cases (`publicBlank`) sont propres : liste blanche, jamais
`expectedAnswer`, jamais l'indice juste d'un choix.

Seul chemin d'envoi en évaluation notée : `toPublicQuestion` ← `toPublicQuestions`
(`src/lib/server/evaluation-attempts.ts`, reprise, reprise après régénération, nouvelle tentative) ←
`startEvaluationAttempt` ← `src/routes/api/evaluations/assignments/[id]/start/+server.ts`.

La fuite compte quand la tâche demande un calcul (« place l'image de 2 par f », « colorie les 3/4 » d'une
figure à 8 parts, « construis le double de 17 ») : la consigne ne donne pas la valeur, le source oui.

## 2. Inventaire (2026-11-01, à revérifier dans le code avant de coder)

| Bloc               | Ce qui fuit                                                     | L'écran doit garder                          |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------- |
| line               | `placer: A=3 ; B=7` (valeurs)                                   | noms, nombre de points                       |
| courbe             | `placer: A=(2 ; 3)` (coordonnées)                               | noms, nombre de points                       |
| horloge            | `placer: 9 h 25`                                                | un `placer:` sans heure (marqueur)           |
| collection/monnaie | `construire: N`                                                 | marqueur « à construire »                    |
| partage            | `colorier: 3/8`                                                 | marqueur « à colorier », la forme            |
| barres             | valeurs des barres à construire ; l'échelle si `axe: à choisir` | noms des barres à construire, axe            |
| patron             | cible de `designer:` ; cases retirées de `completer:`           | patron amputé, nombre de cases               |
| cubes              | `hauteurs:` (avec `retrouver:` = la réponse)                    | lot 2 : la perspective a besoin des hauteurs |
| figure-a-completer | `verifier:`, positions de points                                | lot 2 : la figure de départ                  |

Sans fuite : `ranger` (bloc réécrit dans l'ordre mélangé, `instance-generator.ts`), figure de travail
(jamais notée), opération posée (les termes sont la question). `PublicQuestion.expressions` : à vérifier.

## 3. Phase 0 — validée par David le 2026-11-01 (« je valide »)

1. **Masquer toujours**, bloc par bloc, sans chercher si la consigne donne déjà la valeur.
2. **Lot 1** : masques simples (line, courbe, horloge, collection, monnaie, partage, patron, valeurs des barres
   à construire). **Lot 2** : cubes `dessiner:`, barres à échelle à choisir, figure à compléter — une question
   par cas à David.
3. **Auditer d'abord** les devoirs, séances, défis : servent-ils des questions notées avec l'instance complète ?
4. **Ordre** : `fuite-enonce` avant le lot 2 de `points-repere`.

Comportement : avant l'envoi, le serveur remplace dans chaque bloc à geste ce qui dit la réponse par une forme
neutre ; l'élève voit le même écran ; la correction ne change pas (serveur, instance complète). Tests : de bout
en bout, démarrer une évaluation et vérifier qu'aucune cible n'apparaît dans le JSON ; et que chaque bloc
masqué se dessine encore avec son geste.
