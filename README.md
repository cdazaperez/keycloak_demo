# Keycloak Demo

Demo de autenticacion con Keycloak usando Docker Compose.

## Arquitectura

- **Keycloak 24** - Servidor de identidad (OpenID Connect / OAuth 2.0)
- **PostgreSQL 16** - Base de datos para Keycloak
- **Demo App** (Node.js/Express) - Aplicacion web que autentica via Keycloak

## Inicio rapido

```bash
docker compose up --build
```

Espera a que todos los servicios esten listos y luego abre:

| Servicio | URL |
|---|---|
| Demo App | http://localhost:3100 |
| Keycloak Admin | http://localhost:8080 |

## Credenciales

### Keycloak Admin Console
- **Usuario:** `admin`
- **Password:** `admin`

### Usuarios de prueba (realm "demo")

| Usuario | Password | Rol |
|---|---|---|
| `demo` | `demo` | user |
| `admin-user` | `admin` | admin, user |

## Como funciona

1. Abre http://localhost:3100 y haz clic en "Iniciar Sesion con Keycloak"
2. Seras redirigido al login de Keycloak
3. Ingresa las credenciales de un usuario de prueba
4. Tras autenticarte, veras tu perfil con los datos del token JWT

## Detener

```bash
docker compose down
```

Para eliminar tambien los datos persistidos:

```bash
docker compose down -v
```
