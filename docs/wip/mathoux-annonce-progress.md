# Mathoux v1.2 — annonce des nouveautés en fin de séance — journal

> Branche `feat/mathoux-annonce-chaton`, worktree `../ubumaths-wt-mathoux-annonce`. Démarré le
> 2026-10-21. Suite de [mathoux-v1-progress.md](mathoux-v1-progress.md) (§ « Hors v1 » de
> [mathoux.md](../systeme/mathoux.md)).

## Reprendre ici

_Mis à jour le 2026-10-21, premier commit._

- **État** : logique pure (`src/lib/mathoux/news.ts`) et serveur (`rememberMathoux` rend les notions écrites, `loadMathouCollectionWithNews`, `news` dans `GET /api/student/mathoux`) faits, tests verts. Reste : carte de fin de séance, bulle du Palotin, doc, revue, PR.
- **Prochaine action** : `MathouNewsCard` dans `TestResults` (Entraînement, Course) et `ReviewSession`, demandée après la sauvegarde ; bulle du widget.
- **En attente de David** : rien.
- **Pièges en cours** : la nouveauté est « ce que CE calcul a écrit » : le widget, la page Chatterie ou un autre onglet la consomment s'ils calculent avant.
- **Worktree / branche** : `../ubumaths-wt-mathoux-annonce` · `feat/mathoux-annonce-chaton`.

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
- [ ] Carte de fin de séance (`TestResults`, `ReviewSession`).
- [ ] Bulle du Palotin (nouveautés avant la sieste).
- [ ] Intégration : nouveauté annoncée une fois, puis plus.
- [ ] Doc `docs/systeme/mathoux.md`, revue (`code-reviewer` + `security-auditor`), PR.
