# Inscription par le parent — journal

## Reprendre ici

_Mis à jour le 2026-10-21, avant toute PR (chantier pas commencé)._

- **État** : décisions prises (ci-dessous), aucun code. Ordre validé par David : **B** (ce chantier) → **A** cloisonnement d'Akadada → **C** année d'une classe à la création.
- **Prochaine action** : obtenir les réponses aux 4 questions ouvertes, puis rédiger la phase 0 (comportements nominal / limite / erreur) et la faire valider.
- **En attente de David** : questions ouvertes 1 à 4.
- **Pièges en cours** : la prod exige la confirmation du courriel à l'inscription (`auth/register/+page.server.ts`) ; auth de mineurs + consentement → tests d'intégration, `code-reviewer` et `security-auditor` ; question d'accès avant tout SQL.
- **Worktree / branche** : à créer — `../ubumaths-wt-inscription-parent`, `feat/inscription-parent`.

## Contexte

David commence les cours particuliers (surtout des collégiens) dans l'école dédiée **Akadada**
(créée en prod le 2026-10-21, classe NOELIE en 6e). Un élève mineur n'a pas toujours d'adresse ;
aujourd'hui la seule connexion est courriel + mot de passe (Google désactivé).

## Décisions de David (2026-10-21)

1. **Deux écrans** : « Je m'inscris » (élève seul, écran actuel inchangé) et « J'inscris mon
   enfant » (parent : code de classe, son adresse, prénom de l'enfant, mot de passe de l'enfant).
2. **Compte de l'enfant = identifiant** (fausse adresse sur un domaine Chiphre qui ne reçoit rien) ;
   l'adresse du parent est un **contact**, pas un identifiant. Écarté : alias `parent+prenom@…`
   créé automatiquement (`+` pas géré partout ; la confirmation obligatoire n'arriverait jamais).
3. **Un seul lien au parent** = confirmation de son adresse **et** consentement parental (case
   explicite sur la page).
4. **Mot de passe oublié** : le parent (lien par courriel) **et** le prof peuvent réinitialiser ;
   l'enfant peut changer lui-même son mot de passe.
5. Aucun courriel ne part vers une fausse adresse (bienvenue, notifications, réinitialisation).

## Questions ouvertes

1. **Format de l'identifiant** — proposé : prénom sans accent + 2 caractères au hasard (`noelie.k4`).
2. **Nom de famille de l'enfant** demandé au parent, ou prénom seul (minimisation) ?
3. **Question d'accès** : le parent voit-il quelque chose du compte de l'enfant ? Proposé : rien
   pour l'instant (le bilan reste le PDF envoyé par le prof).
4. **Noélie** : inscription immédiate par alias à la main, ou attendre l'écran parent ?
