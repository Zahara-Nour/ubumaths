# Securité

CSRF protection
SS prevention
Role checks on API road
?RLS on every endpoint?
Zod input validation (API endpoint, formulaires, variables d'environnement)
Rate limiting

# Code Quality

format with Prettier
Lint

# Logging

Toujours utiliser le système de Log de l'appli. Pour certaines fonctionnalités, on peut utiliser une variable d'environnement qui active ou non le système de log pour cette partie, mais toujours enutilisant le système de log interne.

# performance

Eliminate N+1 queries
vérifier les index de la db

# Documentation

CLAUDE.md doit rester minimal. Donne les guiding lines.
Toutes les autres documentations doivent être rangées dans le répoertoire /docs, dans des sous-répertoire appropriés. Il faut distinguer la documentation liée à l'architecture générale (Roles, Cache, loggin, auth,..) et les features proposés aux utilisateurs de l'appli Web.

#Agents
Toujours utiliser les agents appropriés pour effectuer les tâches, le plus possible en parallèle.

# Tests

# Commit
