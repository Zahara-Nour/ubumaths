# Présentation pour les parents — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-15, phase 0 (aucune PR)._

- **État** : phase 0, revue de `/parents` point par point (9 points, ci-dessous). Points 1 à 3 tranchés ; FAQ décidée.
- **Prochaine action** : point 4 (l'IA) : page ou FAQ, puis le texte.
- **En attente de David** : point 4.
- **Pièges en cours** : ne promettre que ce que prouve `docs/systeme/carte-des-fonctionnalites.md` ; argent : jamais « gratuit » seul ni « pour toujours ».
- **Worktree / branche** : aucun encore (doc sur `main`) ; le code ira dans `views.ts` (`PARENT_VIEW`).

## Cadre

- Contenu de la page : `src/lib/kingdom-tour/views.ts` (`PARENT_VIEW`), faits de `PARENT_FACTS` dans `src/lib/kingdom-tour/tour.ts`.
- Décisions antérieures : `docs/wip/roue-des-publics-progress.md` (2026-10-11), invariants dans `docs/systeme/carte-des-fonctionnalites.md` § La roue des publics.
- On réfléchit d'abord au parent ; élèves et professeurs plus tard.

## Décisions de David

### 2026-11-15

- **Deux publics de parents, visés tous les deux** : (A) le parent d'un élève de ses classes ; (B) le parent qui découvre (cours particuliers, future offre payante).
- **Méthode** : les 9 questions du parent, une par une ; pour chacune, ce qu'il faut enlever, préciser, modifier, ajouter.
- **Point 1, titre** : « Des maths sérieuses, dans un monde fantaisiste » (« absurde » est trop fort).
- **Point 1, chapô** : « Votre enfant s'entraîne, se trompe, comprend pourquoi, et recommence. Du CM1 à la Terminale, selon les programmes de l'Éducation nationale. » Ton d'une phrase sur l'enfant, pas une liste (« les deux autres sont des listes illisibles »). Plus de mot « cours » : la question tombe.
- **Point 2, texte** : « Chiphre est conçu par un professeur de mathématiques qui s'en sert chaque jour avec ses élèves. Agrégé de mathématiques, il est aussi ingénieur en informatique. » (sans les passions littérature / illusionnisme).
- **Point 2, anonymat** : gardé sur la page ; il sera levé plus tard pour ceux qui prennent contact.
- **Point 2, lien** : « Chiphre, c'est quoi ? » vers `/a-propos`, gardé.
- **Point 3** : retiré de la page, ira dans la FAQ (texte de travail ci-dessous, § FAQ).
- **FAQ** : en bas de `/parents`, questions repliées (option 1 ; données structurées `FAQPage` possibles). Il n'en existait aucune.
- **Chaque point restant se tranche « page ou FAQ »** avant son texte.

## Les 9 questions du parent

1. Qu'est-ce que c'est, en une phrase ? — ✅ tranché.
2. Qui est derrière ? — ✅ tranché.
3. À qui mon enfant peut-il parler ? — ✅ FAQ.
4. Et l'IA ? (ni nom, ni courriel, ni identifiant envoyés : `docs/systeme/tuteur-ia.md`)
5. Ses données ?
6. Est-ce que ça l'aide vraiment ?
7. Les jeux et les gidouilles ne vont-ils pas le distraire ? (bloc absent)
8. Comment le suivre ? (lien du cours public absent)
9. Comment l'inscrire, combien ça coûte ? (`/auth/register/parent` absent de la page)

## FAQ (textes de travail, non validés)

### À qui mon enfant peut-il parler ?

> Votre enfant n'échange qu'avec des élèves de son école, et seulement par le chat : celui de sa classe, ou à deux avec un camarade qui a accepté son amitié. Seul son professeur peut lui écrire en privé. Un message déplacé se signale d'un clic ; le professeur peut le supprimer et retirer à un élève le droit d'écrire. Jusqu'à la 2de, tant que vous n'avez pas donné votre accord, il ne peut écrire à personne.

- Preuves : `docs/systeme/messagerie-et-moderation.md` (frontière d'école, modération), `docs/systeme/realtime.md` (chat à deux = amis), `docs/systeme/conformite/consentement-parental.md` (lecture seule sans consentement, tout niveau sauf 1re/Tle).
- ⚠️ Ne pas promettre de filtre (4 mots, marque sans bloquer).
- ⚠️ Akadada « borné au groupe » (décision du 2026-10-21) **non codé** : pour un élève de cours particuliers, « son école » = Akadada entière. Question ouverte : coder avant de publier, ou la phrase suffit ?

## Propositions en attente

(aucune)
