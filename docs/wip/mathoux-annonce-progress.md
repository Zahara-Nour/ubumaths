# Mathoux v1.2 — annonce des nouveautés en fin de séance — journal

> Branche `feat/mathoux-annonce-chaton`, worktree `../ubumaths-wt-mathoux-annonce`. Démarré le
> 2026-10-21. Suite de [mathoux-v1-progress.md](mathoux-v1-progress.md) (§ « Hors v1 » de
> [mathoux.md](../systeme/mathoux.md)).

## Reprendre ici

_Mis à jour le 2026-10-21, après #1575._

- **État** : annonce des nouveautés (#1575) mergée sur `main`, **pas en prod**. Chantier terminé.
- **Prochaine action** : aucune ; au prochain `deploy:prod`, la vérification manuelle (#1575) devient faisable sur chiph.re. Versement : le durable est déjà dans `docs/systeme/mathoux.md` → archiver ce journal quand David l'aura vérifié.
- **En attente de David** : `deploy:prod` (à sa demande), puis la vérification manuelle de `verifications-manuelles.md`.
- **Pièges en cours** : la nouveauté est « ce que CE calcul a écrit » : le widget, la page Chatterie ou un autre onglet la consomment s'ils calculent avant ; une réponse perdue après le calcul la brûle (assumé, documenté).
- **Worktree / branche** : aucun ; supprimés après le merge.

---

## Spécification (phase 0 validée par David le 2026-10-21)

Recommandations validées telles quelles.

- **Annoncé** : naissance (« Un chaton est né à la Chatterie : Pile-Poil ! », « Un matou est arrivé… »
  si né plus grand), croissance (« Pile-Poil est devenu un matou ! »), étoile (« Pile-Poil gagne
  l'étoile ★ 2nde ! »). Une nouveauté par Mathou : naissance > croissance > étoile.
- **Où** : fin d'Entraînement, de Course, de révision, sous la carte du Palotin ; lien « Voir la
  Chatterie ». Les résultats s'affichent tout de suite, l'annonce arrive après (calcul demandé à
  `GET /api/student/mathoux` une fois la séance enregistrée).
- **Plusieurs** : 3 au plus, puis « Et N autres nouveautés à la Chatterie. ».
- **Premier calcul** (mémoire vide) avec plusieurs Mathoux : une seule phrase « N Mathoux
  t'attendent à la Chatterie ! ».
- **Après une évaluation** : rien sur l'écran de résultats (aucun calcul) ; le Palotin l'annonce dans
  sa bulle à la prochaine page, avant la sieste.
- **Sans Palotin** : la carte s'affiche quand même. Prof, admin, visiteur : rien.
- **Erreur** : calcul ou écriture en panne → rien d'annoncé, résultats intacts. Jamais annoncé deux
  fois : seule une ligne écrite par CE calcul est une nouveauté.
- Aucune migration, aucune donnée nouvelle exposée (l'élève, ses propres Mathoux).

## Avancement

- [x] Logique pure `news.ts` + schéma `mathouNewsSchema` (tests d'abord).
- [x] Serveur : `rememberMathoux` → notions écrites ; `loadMathouCollectionWithNews` ; endpoint.
- [x] Carte de fin de séance (`TestResults`, `ReviewSession`).
- [x] Bulle du Palotin (nouveautés avant la sieste).
- [x] Intégration : nouveauté annoncée une fois, puis plus ; deux calculs parallèles ; deux stades différents.
- [x] Doc `docs/systeme/mathoux.md` (+ renvois `evaluations.md`, `srs.md`, `buddy-palotins.md`).
- [x] Revue : `code-reviewer` (classement contre la ligne remplacée, écriture partielle, relance rapide : corrigés ; réponse perdue : documentée) ; `security-auditor` : aucun finding bloquant.
- [x] PR #1575, CI verte, mergée le 2026-10-21.
