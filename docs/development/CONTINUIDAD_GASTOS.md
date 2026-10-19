# Gastos — Documento de continuidad del desarrollo frontend

**Actualizado:** 18 de octubre de 2026
**Estado:** bloques 1 a 11 completados y validados; pendiente comenzar el bloque 12.
**Frontend (rama `main`, commit verificado):** [`ef06f07675a8487af15ef4d2ccb70b83c04e7af0`](https://github.com/igorosabel/Gastos/commit/ef06f07675a8487af15ef4d2ccb70b83c04e7af0) — `feat(spaces): expulsar miembros de espacios compartidos`.
**Backend de referencia:** **ApiGastos v1.0.0**, publicado el 16 de octubre de 2026.

> **Propósito:** documento de traspaso para retomar el desarrollo en otra conversación de ChatGPT. Es una fotografía del estado del proyecto en la fecha indicada, **no** sustituye al código, `AGENTS.md` ni a los contratos del backend. Al reanudar, volver a consultar el último commit y los archivos reales: el repositorio puede haber cambiado.

## 1. Contexto y enlaces

**Gastos** es una aplicación web para registrar y consultar ingresos y gastos personales y compartidos. El diseño se basa en **espacios contables**: cada usuario dispone de un espacio personal y puede crear o unirse a espacios compartidos. Cada espacio aísla sus categorías, movimientos, recurrentes e informes.

- **Frontend Angular:** <https://github.com/igorosabel/Gastos> (rama `main`).
- **Instrucciones del frontend:** <https://github.com/igorosabel/Gastos/blob/main/AGENTS.md>.
- **Backend PHP / OFW:** <https://github.com/igorosabel/ApiGastos>.
- **Backend estable de referencia:** <https://github.com/igorosabel/ApiGastos/tree/v1.0.0>.
- **API usada por el frontend:** `https://apigastos.osumi.es`, definida en `src/environments/environment.ts`.
- **Guía de integración REST (referencia principal):** [`ApiGastos/docs/api/endpoints.md`](https://github.com/igorosabel/ApiGastos/blob/main/docs/api/endpoints.md), disponible en `main` y relativa a los **33 endpoints de v1.0.0**.
- **Rutas reales del backend:** `ApiGastos/src/Routes/` en la etiqueta `v1.0.0`.
- **Documentación temática del backend:** `docs/api/recurring.md` y `docs/api/reports.md`; consultar también `README.md`, `CHANGELOG.md`, `AGENTS.md` y `docs/development/CONTINUIDAD_APIGASTOS.md`.
- **Referencia del patrón de formularios:** <https://github.com/osumionline/Osumi-TPV-Client/tree/main/src/app/model/clientes> y el componente `src/app/modules/clientes/components/client-form/` de ese proyecto.

**Referencia principal de la API:** el documento [`ApiGastos/docs/api/endpoints.md`](https://github.com/igorosabel/ApiGastos/blob/main/docs/api/endpoints.md), disponible en la rama `main`, contiene la guía completa de los **33 endpoints REST de ApiGastos v1.0.0**. Incluye rutas, métodos HTTP, parámetros, autenticación, respuestas JSON, códigos de error y consideraciones de integración para Angular.

Este documento se creó **después de publicar la release v1.0.0**, por lo que no forma parte del contenido de dicha etiqueta, aunque documenta sus contratos. Para desarrollar Gastos debe utilizarse como **referencia principal de integración**. Antes de implementar una funcionalidad, consultar la guía y contrastar cualquier duda o discrepancia con los DTO, componentes, plantillas JSON, servicios y rutas reales del backend. Si se publica una nueva versión de ApiGastos, verificar que la documentación sigue correspondiendo con la versión utilizada por el frontend.

## 2. Tecnologías y entorno

### Frontend

- Angular **22.2.x**, componentes standalone, signals, `computed`, `input`, `output`, `inject` y plantillas `@if`, `@for`, `@switch`.
- PrimeNG **22.1.x**, tema **Aura** personalizado en `src/app/gastos-preset.ts`, `@primeuix/themes` 3.x, traducción española mediante `primelocale`, iconografía PrimeIcons.
- TypeScript **6.0.x**, configuración estricta y aliases TS.
- **Signal Forms** (`@angular/forms/signals`) como sistema principal de formularios. `ngModel` únicamente para controles aislados (actualmente, selector del espacio activo); **no** Reactive Forms.
- RxJS 7.8.x, tests **Vitest**, Angular ESLint, formato con Prettier.
- `package.json` fija `npm@12.2.0` y el workflow de despliegue utiliza **Node 24**.
- Estilos SCSS, interfaz adaptable a móvil y escritorio. El modo oscuro usa `.gastos-app-dark` como selector de PrimeNG.

### Backend — proyecto **independiente**

- PHP **8.5+**, **Osumi Framework 9.12.1**, MariaDB **12.3.x**, PHPUnit **13**, Debian 13 / Plesk.
- ApiGastos **v1.0.0** implementa el backend inicial (autenticación, espacios, categorías, movimientos, recurrentes, informes).
- Los modelos monetarios se almacenan con `DECIMAL` y los importes se transportan como **`string`**, nunca convertirlos indiscriminadamente a `number` para cálculos de negocio.
- El frontend y el backend tienen ciclos de desarrollo y commits separados. No modificar OFW para resolver problemas de Gastos sin discutir antes si el cambio corresponde realmente al framework.

### Ejecución local y verificación

```bash
npm ci
npm start
npm run lint
npm run test
npm run build
```

- `npm start` ejecuta `ng serve`; `npm run test` ejecuta `ng test --watch=false` con Vitest.
- Para cada bloque: pruebas automáticas **y** funcionales manuales, revisión de responsive, validación del usuario y _después_ commit/push.
- La sesión y las invitaciones se pueden probar con dos usuarios reales, usando una ventana normal y una ventana de incógnito para separar almacenamiento y autenticación.

### Despliegue del frontend

Existe `.github/workflows/deploy-angular.yml`: se ejecuta en `push` a `main` o manualmente; instala dependencias, inyecta la licencia de PrimeNG desde `secrets.PRIMENG_LICENSE`, compila en producción y publica vía SCP al servidor Plesk. El código local importa `src/environments/license.ts` (privado, generado a partir del ejemplo en despliegue). **No incluir licencias, JWT, tokens, claves SSH ni contraseñas en documentación, commits o capturas.**

## 3. Convenciones arquitectónicas **obligatorias**

Consultar y obedecer **el `AGENTS.md` vigente** antes de proponer código. Resumen operativo:

1. **Un bloque pequeño y verificable cada vez**. Antes de cambiar algo: leer código actual, arquitectura documentada y contrato de la API; explicar cambios y pruebas; esperar resultados del usuario y su commit para avanzar.
2. Cada componente Angular dispone de `nombre.ts`, `nombre.html` y `nombre.scss` **separados**; no templates ni estilos inline. Usar `ChangeDetectionStrategy.OnPush` según las convenciones actuales, pero no es necesario indicarlo explicitamente ya que es el por defecto de Angular 22.
3. Componentes y servicios con responsabilidades separadas; `@Service()` de Angular 22, registrado automáticamente en raíz para servicios de aplicación; `inject()`, sin proveedores globales redundantes.
4. **Imports TypeScript mediante el alias más específico** (`@app`, `@auth`, `@guard`, `@interfaces`, `@interceptors`, `@model`, `@modules`, `@pages`, `@services`, `@env`, etc.), nunca `./` ni `../`. Las rutas de plantilla/estilo en `@Component` sí son referencias relativas a recursos.
5. Archivo con **una sola exportación**: `export default`; con varias exportaciones: todas nombradas. Tipar explícitamente constantes, variables, propiedades, parámetros y retornos; evitar `any`.
6. No usar APIs Angular/PrimeNG obsoletas: botones `<button pButton>`, no `<p-button>`; verificar compatibilidad de PrimeNG con Signal Forms.
7. Los formularios se organizan por dominio dentro de `src/app/model/<dominio>/`:
   - `*-form.model.ts`: interfaz del estado editable.
   - `*-form.initial-value.ts`: función para generar estado inicial.
   - `*-form.schema.ts`: funciones de restricciones y validación (`required`, `email`, `validate`, etc.).
   - `*-form.mapper.ts`: transformación entre el modelo de formulario y el contrato REST cuando proceda; otros mappers si existen transformaciones diferentes. No crear mappers ficticios.
8. Con `[formField]`, **no** añadir bindings como `[invalid]`, `[readonly]` o `[disabled]` sobre el control: Signal Forms administra esas propiedades. Utilizar `touched()`, `invalid()` y `errors()` para presentar mensajes. Los envíos existentes usan `form()` con `FormRoot` y `submission.action`.
9. Los permisos **siempre** los verifica ApiGastos. El frontend puede condicionar opciones según `is_owner` para la UX, pero nunca considerarlo autorización suficiente.
10. Mantener el selector de espacio como fuente del contexto para los futuros módulos de categorías, movimientos, recurrentes e informes. Evitar mezclas entre respuestas retrasadas, cambios de espacio y cambios de usuario.

**Lecciones ya aplicadas:** los estilos de login y registro se unificaron en `src/app/modules/auth/_auth.scss`. Se corrigió el fondo claro que aparecía en modo oscuro y se añadió foco inicial con `viewChild()` + `afterNextRender()`. La validación del correo de Signal Forms rechaza espacios exteriores antes del mapper: los tests del **formulario** usan valores válidos y los tests del **mapper** cubren recorte y normalización por separado.

## 4. Estructura actual importante del frontend

```text
Gastos/
├── AGENTS.md
├── .github/workflows/deploy-angular.yml
├── package.json / angular.json / tsconfig.json
└── src/
    ├── environments/
    │   ├── environment.ts
    │   └── license.example.ts
    ├── styles.scss
    └── app/
        ├── app.config.ts / app.routes.ts / core.ts
        ├── gastos-preset.ts
        ├── auth/auth.store.ts
        ├── guard/auth.guards.ts
        ├── interceptors/auth.interceptor.ts
        ├── services/auth.service.ts
        ├── services/spaces.service.ts
        ├── spaces/space.store.ts
        ├── interfaces/
        │   ├── auth.interfaces.ts
        │   ├── session.interfaces.ts
        │   └── spaces/                 # Contratos HTTP de espacios
        ├── model/
        │   ├── auth/                   # Formularios login y registro
        │   └── spaces/                 # Space, SpaceMember, SpaceInvitation y formularios
        └── modules/
            ├── auth/
            │   ├── _auth.scss
            │   ├── login/
            │   └── register/
            ├── pages/dashboard/
            └── spaces/
                ├── create-space/
                ├── create-invitation/
                ├── space-invitations/
                ├── accept-invitation/
                └── space-members/
```

Los archivos principales tienen pruebas `*.spec.ts` junto a los servicios, stores, componentes y mappers cuando procede.

**Atención a la estructura:** en el commit `0e968d8` se trasladaron los contratos de espacios a **`src/app/interfaces/spaces/`**. No volver a proponerlos directamente bajo `src/app/interfaces/` como en los primeros bloques.

### Autenticación y navegación actual

- Rutas: `/login`, `/register` (protegidas con `guestGuard`) y `/dashboard` (con `authGuard`, _lazy loading_); la raíz redirige al dashboard.
- `AuthStore` valida sesiones JWT con `expires_at` (segundos Unix), expone el usuario e implementa cierre local. Persistencia de la sesión: **`sessionStorage` por pestaña**, clave `gastos.auth.v1`.
- `auth.interceptor.ts` añade `Authorization: Bearer` **solo** a llamadas al dominio/configuración de ApiGastos y no añade JWT a `/auth/login` ni `/auth/register`. Un 401 de una petición autenticada limpia la sesión correspondiente y navega al login.
- No hay endpoints backend de renovación (`refresh`) ni de `logout`: el cierre de sesión es local.
- Login y registro disponen de validaciones Signal Forms, gestión de errores, navegación y foco en el primer campo. El registro crea también el espacio personal en el backend.
- La interfaz actual es un **dashboard provisional** con cabecera, selector de espacio y tarjetas de creación/unión/invitaciones/miembros; **no** existe todavía un panel económico real ni una navegación definitiva con páginas de categorías, movimientos, etc.

### `SpaceStore` y selección

- `SpaceStore` mantiene la lista disponible y el espacio seleccionado mediante signals, con estado de carga y errores.
- Carga `GET /spaces`, prioriza el espacio personal al entrar y conserva una selección válida en recargas de listado dentro de la misma instancia.
- La **selección del espacio no se persiste** entre recargas completas del navegador: al recargar se vuelve inicialmente al personal. La **membresía sí es persistente en el backend**.
- Métodos relevantes: `load()`, `select(spaceId)`, `addCreated(space)`, `addAccepted(space)`, `clear()`, `removeAfterLeave(spaceId)`.
- Protege contra respuestas antiguas mediante versiones de carga y comprobación de sesión; un `spaceId` no autorizado no puede seleccionarse localmente.

## 5. Bloques de desarrollo realizados y validados

Todos los bloques siguientes fueron **probados por el usuario** (`npm run lint`, `npm run test`, `npm run build` y comprobaciones funcionales según el bloque). No implica que esas suites se hayan reejecutado durante la redacción de este documento.

| Bloque                                    | Estado   | Alcance                                                                                                                                                                                                                                                                                           | Commit de referencia        |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1. Base e integración inicial             | Completo | Base Angular/PrimeNG, configuración de API, convención de servicios y arquitectura alineada con ApiGastos 1.0.0                                                                                                                                                                                   | `ea000e0` (ajustes de core) |
| 2. Autenticación y rutas                  | Completo | `AuthStore` JWT, guards, interceptor y dashboard protegido                                                                                                                                                                                                                                        | `73919b1`                   |
| 3. Login y registro                       | Completo | Signal Forms, separación modelo/esquema/valor inicial/mapper, estilos compartidos, foco inicial, pruebas y registro/login reales                                                                                                                                                                  | `be0859b`, `a0799d4`        |
| 4. Selección de espacios                  | Completo | `GET /spaces`, `SpacesService`, `SpaceStore`, selector y cabecera responsive                                                                                                                                                                                                                      | `290a0c7`                   |
| 5. Creación de espacios compartidos       | Completo | `POST /spaces`, formulario Signal Forms, selección inmediata                                                                                                                                                                                                                                      | `9882d1b`                   |
| 6. Crear y consultar invitaciones         | Completo | `POST /spaces/invitations`, `GET /spaces/invitations`, token de un solo acceso visual; pruebas del mapper                                                                                                                                                                                         | `1548553`                   |
| 7. Revocar invitaciones                   | Completo | `POST /spaces/invitations/revoke`, confirmación, actualización del listado y prevención de respuestas tardías                                                                                                                                                                                     | `3f87250`                   |
| 8. Aceptar invitaciones                   | Completo | `POST /spaces/invitations/accept`, formulario de token, incorporación del nuevo espacio al store                                                                                                                                                                                                  | `876b7ea`                   |
| 9. Listar miembros                        | Completo | `GET /spaces/members`, nombres, fecha de incorporación, rol, actualización, permisos y pruebas de cambio de espacio                                                                                                                                                                               | **`f9b902a`**               |
| 10. Abandono voluntario de espacios       | Completo | `POST /spaces/members/leave`, confirmación, baja lógica de membresía, actualización de `SpaceStore`, selección alternativa y protección contra respuestas tardías                                                                                                                                 | `7f85d27`                   |
| 11. Expulsión de miembros                 | Completo | `POST /spaces/members/remove`, confirmación por miembro, protección del propietario, actualización del listado y controles de sesión, concurrencia y permisos                                                                                                                                     | `ef06f07`                   |
| 12. Layout privado y navegación           | Completo | Layout privado compartido con cabecera, selector de espacios y cierre de sesión; ruta padre protegida, dashboard lazy, carga centralizada de SpaceStore y pruebas de navegación                                                                                                                   | `1ca74fa`                   |
| 13. Consulta de categorías por espacio    | Completo | Modelos y contratos de categorías; servicio GET /categories; página con listado jerárquico, ordenación, estados de carga, vacío y error; cambio seguro de espacio; navegación y pruebas.                                                                                                          | `f1c93a7`                   |
| 14. Creación de categorías                | Completo | Servicio POST /categories; formulario Signal Forms para categorías principales y subordinadas; validación de nombre y tipo; selector de categoría padre con indentación jerárquica; actualización del listado y pruebas.                                                                          | `71afd2a`                   |
| 15. Edición de categorías                 | Completo | `POST /categories/update`, formulario Signal Forms con nombre y categoría padre, conservación del tipo y orden, prevención de ciclos, comprobación de contexto, actualización del listado y pruebas                                                                                               | `343aed6`                   |
| 16. Eliminación de categorías             | Completo | Servicio POST /categories/delete; confirmación explícita, cancelación, protección contra operaciones duplicadas, gestión de dependencias y errores HTTP, aislamiento entre espacios y sesiones, actualización del listado y pruebas.                                                              | `233bdc8`                   |
| 17. Consulta de movimientos económicos    | Completo | Modelos y contratos de movimientos; servicio `GET /transactions`; página privada con listado de ingresos y gastos, categoría, concepto, fecha e importe decimal como `string`; consulta conjunta de categorías, aislamiento por espacio y sesión, estados de carga y error, navegación y pruebas. | `1c6efbe`                   |
| 18. Paginación de movimientos             | Completo | Paginación real mediante `GET /transactions` con parámetro `page`; controles anterior y siguiente, numeración y total de páginas; actualización de página actual; prevención de navegación inválida; cancelación de solicitudes obsoletas, reinicio al cambiar de espacio o sesión y pruebas.     | `5e33116`                   |
| 19. Filtros de movimientos                | Completo | Filtros de fechas, tipo y categoría mediante Signal Forms; integración con GET /transactions, parámetros opcionales, aplicación y limpieza explícitas, combinación con paginación, reinicio por cambio de espacio o sesión, validaciones y pruebas.                                               | `a0109a8`                   |
| 20. Creación de movimientos económicos    | Completo | Contratos y servicio POST /transactions; formulario Signal Forms para ingresos y gastos, selección de categoría compatible, validaciones de importe decimal, concepto y fecha, protección de sesión y espacio, integración con filtros y paginación, actualización del listado y pruebas.         | `c59a1c9`                   |
| 21. Edición de movimientos económicos     | Completo | Contratos y servicio `POST /transactions/update`; formulario Signal Forms reutilizando validaciones de creación; edición de tipo, categoría, importe, concepto y fecha; tratamiento de conflictos con recurrentes, conservación de filtros y página, aislamiento por espacio y sesión y pruebas.  | `cc6b0e9`                   |
| 22. Eliminación de movimientos económicos | Completo | Servicio `POST /transactions/delete`; confirmación explícita, cancelación, protección frente a peticiones duplicadas, errores HTTP y conflictos con recurrentes; actualización de listado, conservación de filtros, ajuste de paginación, aislamiento por espacio y sesión y pruebas.             | `58bb624`                   |

**Pruebas funcionales relevantes ya realizadas:** el usuario confirmó que dos cuentas independientes A (propietario) y B (invitado) pudieron crear una invitación, comprobar el rechazo de un destinatario incorrecto, aceptarla desde B, verificar la membresía persistida y el rol, y validar el listado de miembros desde A. La lista administrativa solo aparece a propietarios de espacios compartidos. El usuario confirmó asimismo la creación y revocación de invitaciones.

## 6. Contrato REST relevante (ApiGastos v1.0.0)

**Base:** `https://apigastos.osumi.es`, sin prefijo global `/api`; endpoints privados con `Authorization: Bearer <jwt>`.

### Autenticación

| Método | Ruta             | Uso                             |
| ------ | ---------------- | ------------------------------- |
| POST   | `/auth/register` | Crear cuenta y espacio personal |
| POST   | `/auth/login`    | Autenticación JWT               |
| GET    | `/auth/me`       | Usuario actual                  |

### Espacios, invitaciones y membresías

| Método | Ruta                         | Datos / uso                                                    |
| ------ | ---------------------------- | -------------------------------------------------------------- |
| GET    | `/spaces`                    | Espacios activos a los que pertenece el usuario                |
| POST   | `/spaces`                    | `{ "name": "Familia" }`; crea uno compartido                   |
| POST   | `/spaces/invitations`        | `{ "spaceId": 8, "email": "..." }`; propietario                |
| GET    | `/spaces/invitations`        | Query `spaceId`; propietario                                   |
| POST   | `/spaces/invitations/revoke` | `{ "invitationId": 15 }`; propietario                          |
| POST   | `/spaces/invitations/accept` | `{ "token": "<64 hex>" }`; destinatario autenticado            |
| GET    | `/spaces/members`            | Query `spaceId`; **solo propietario**; miembros activos        |
| POST   | `/spaces/members/leave`      | `{ "spaceId": 8 }`; **próximo bloque**, miembro no propietario |
| POST   | `/spaces/members/remove`     | `{ "spaceId": 8, "userId": 2 }`; bloque posterior, propietario |

Reglas y observaciones:

- Un espacio tiene `id`, `name`, `type` (`personal` o `shared`), `owner_id`, `is_owner`.
- Una invitación nueva contiene token de **64 hexadecimales** y caduca a los **7 días**. La API **no envía emails automáticamente**. El token solo se devuelve al crear; el listado no lo devuelve. No registrar ni compartir tokens en repositorios o capturas.
- Una aceptación válida comprueba la **igualdad del correo de la cuenta autenticada con el destinatario**; token utilizado, expirado o revocado no puede aceptarse de nuevo. Puede reactivar una membresía histórica dada de baja.
- `GET /spaces/members` devuelve `id` **del usuario**, `name`, `joined_at`, `is_owner`; **no devuelve email**. Solo incluye miembros activos.
- El propietario **no puede abandonar** su espacio compartido ni ser expulsado, y un miembro no propietario **no puede expulsar a otros**.
- El backend desactiva membresías (`left_at`), preservando sus registros; no elimina físicamente la información histórica.
- No confiar únicamente en que el frontend oculte controles: la API debe validar todas las autorizaciones.

### Ámbitos REST todavía sin integración frontend

Verificar los DTO y las respuestas reales antes de implementar:

- **Categorías:** `/categories` (GET, POST), `/categories/update` (POST), `/categories/delete` (POST); árboles jerárquicos aislados por espacio.
- **Movimientos reales:** `/transactions` (GET, POST), `/transactions/update` (POST), `/transactions/delete` (POST). Ingresos/gastos, fechas contables y filtros/paginación.
- **Recurrentes:** `/recurring` (GET, POST), `/recurring/update`, `/recurring/status`, `/recurring/generate`, `/recurring/occurrences` (GET), `/recurring/occurrences/resolve`, `/recurring/generate-space` (POST). Consultar `docs/api/recurring.md` antes de diseñar la UI.
- **Informes:** `/reports/monthly`, `/reports/monthly/categories`, `/reports/evolution`, `/reports/monthly/forecast`, `/reports/evolution/forecast` (GET). Contratos detallados en `docs/api/reports.md`.

**Fechas e importes:** las fechas contables (`DATE`) no tienen zona horaria; no aplicar conversiones UTC automáticas. Los informes devuelven importes como cadenas decimales. La generación de ocurrencias recurrentes es **explícita**, no programada automáticamente; las previsiones incluyen solo ocurrencias pendientes **ya generadas**. Distinguir datos reales y previsiones y prevenir doble contabilización.

## 7. Punto exacto para reanudar: **bloque 12**

### Layout privado y navegación

**Estado:** siguiente bloque de desarrollo, pendiente de validación.

Los bloques 1 a 11 están completados. La gestión básica de espacios personales y compartidos incluye creación, selección, invitaciones, aceptación, revocación, consulta de miembros, abandono voluntario y expulsión.

**Objetivo del bloque 12:** extraer del dashboard la cabecera, el selector de espacios, el cierre de sesión y la carga inicial del listado para crear un layout privado compartido por las futuras páginas funcionales.

**Plan previsto:**

1. Crear `PrivateLayout` con TypeScript, HTML y SCSS independientes.
2. Introducir una ruta privada padre protegida por `authGuard`, con el dashboard como ruta hija lazy.
3. Mover la carga inicial de `SpaceStore` desde `Dashboard` al layout.
4. Mantener en el dashboard las funcionalidades actuales de gestión de espacios.
5. Añadir pruebas del layout, rutas, selección y logout.
6. Verificar que todas las operaciones anteriores siguen funcionando, especialmente con cambios de espacio y en móvil.

**Siguiente objetivo:** comenzar el módulo de categorías usando `GET /categories` y la navegación compartida, consultando previamente `ApiGastos/docs/api/endpoints.md`.

No modificar ApiGastos ni Osumi Framework para este refactor.

**Importante:** el bloque 12 todavía no está validado. Antes de avanzar, ejecutar lint, tests, build y pruebas funcionales. Esperar confirmación y commit del usuario.

## 8. Hoja de ruta posterior (provisional, no bloques comprometidos)

Una vez completada la gestión básica de miembros, continuar por unidades verificables. El orden se podrá ajustar con el usuario:

1. **Estructura de navegación definitiva:** extraer la cabecera y el selector del dashboard cuando haya varias rutas reales, diseñar navegación responsive y estados globales por espacio. No extraer prematuramente una abstracción sin uso real.
2. **Categorías por espacio:** consulta/árbol jerárquico; después crear/editar/eliminar con reglas de API, esquemas Signal Forms y estados de error. Probar cambios de espacio y jerarquías.
3. **Movimientos de ingresos y gastos:** listado, filtros, paginación; alta/edición/eliminación controlada; categorías, fechas y precisión monetaria. Probar aislamiento entre espacios.
4. **Recurrentes y ocurrencias:** configuración de plantillas, activación/pausa, generación explícita de mensualidades, confirmación/omisión y casos de idempotencia. Priorizar lectura de `ApiGastos/docs/api/recurring.md` y su política A de reactivación.
5. **Informes y dashboard económico real:** resumen mensual, desglose por categorías, evolución, previsión; controlar cadena decimal y separación entre movimientos reales y pendientes. Contratos en `ApiGastos/docs/api/reports.md`.
6. **Pulido general:** UX móvil/escritorio, accesibilidad, estados de carga/error, navegación, consistencia entre tema claro/oscuro, pruebas de regresión y publicación del frontend.

**Fuera del alcance actual salvo decisión expresa:** refresco JWT, generación automática programada de recurrentes, gestión avanzada de perfiles, transferencia de propiedad de espacios, eliminación completa de cuentas, migraciones de base de datos o cambios del framework.

## 9. Limitaciones, precauciones y puntos a revisar

- El `README.md` del **frontend** es aún el _scaffold_ de Angular CLI 19 y menciona Karma; para las versiones y comandos reales usar **`package.json`**, `angular.json` y `AGENTS.md`. Más adelante conviene actualizar el README.
- El archivo [`ApiGastos/docs/api/endpoints.md`](https://github.com/igorosabel/ApiGastos/blob/main/docs/api/endpoints.md) existe en la rama `main` y documenta los 33 endpoints REST de **ApiGastos v1.0.0**. Se añadió después de publicar esa release y, por tanto, no figura en la etiqueta `v1.0.0`. El enlace de `Gastos/AGENTS.md` ya está corregido. Esta guía es la referencia principal para integrar el frontend y cualquier discrepancia debe contrastarse con el código real del backend.
- `dashboard/dashboard.scss` utiliza `--p-surface-900` para las tarjetas, decisión pensada para el tema oscuro actual. Antes de soportar plenamente el cambio a tema claro/oscuro, revisar tokens semánticos y probar ambos modos.
- El dashboard es funcional para gestionar espacios, pero **no es aún** el panel financiero final.
- La selección de espacio **no** se guarda al recargar; no confundir esa decisión con la persistencia de membresías en la base de datos.
- No existen notificaciones en tiempo real para expulsiones o salidas efectuadas desde otra sesión; prever recarga/revalidación cuando se introduzcan cambios de membresías.
- Ningún token de invitación se devuelve al listar invitaciones; no prometer recuperarlo después de ocultarlo.
- Los tests exitosos se han confirmado **en el equipo del desarrollador**. No asumir que nuevas modificaciones estén verificadas hasta que vuelva a ejecutar los tres comandos y las pruebas funcionales.
- La versión exacta del backend puede evolucionar tras v1.0.0; no introducir extensiones sin un contrato publicado y una discusión separada con el usuario.

## 10. Procedimiento recomendado para iniciar otra conversación

1. Facilitar este archivo o indicar su ruta en el repositorio (`docs/development/CONTINUIDAD_GASTOS.md`).
2. Pedir al asistente **leer primero `AGENTS.md`**, comprobar el `HEAD` y la estructura actual de `igorosabel/Gastos`, y contrastar el contrato con **ApiGastos v1.0.0** y su código real.
3. Confirmar que el último bloque validado es el 11 **(expulsión de miembros)**, commit `ef06f07`, y que el siguiente propuesto es el 12 **(layout privado y navegación)**, salvo que existan commits posteriores.
4. Implementar **solo el bloque siguiente**, proponiendo los archivos, código, pruebas y plan funcional entre dos usuarios (A propietario, B miembro).
5. Esperar los resultados de `npm run lint`, `npm run test`, `npm run build`, pruebas funcionales y commit/push del usuario antes de avanzar.
6. Actualizar este documento tras cada hito importante: fecha, `HEAD`, decisiones nuevas, último bloque validado, siguiente bloque y riesgos o problemas abiertos.

### Texto breve que se puede pegar en una nueva conversación

> Estamos desarrollando **Gastos** (`https://github.com/igorosabel/Gastos`), frontend Angular 22/PrimeNG 22 con Signal Forms, contra **ApiGastos v1.0.0** (`https://github.com/igorosabel/ApiGastos`). Lee el documento `docs/development/CONTINUIDAD_GASTOS.md`, el `AGENTS.md` vigente y el código actual del repositorio antes de proponer cambios. El último bloque confirmado fue el **9, listado de miembros** (commit `f9b902a`); continuaremos con el **bloque 10, abandono voluntario de espacios compartidos**. Trabajamos de forma incremental, con tests, pruebas funcionales de dos usuarios y commit validado antes de avanzar. Revisa siempre el `HEAD`: el documento puede haber quedado desactualizado. El último bloque confirmado fue el 11, **expulsión de miembros** (commit `ef06f07`); continuaremos con el **bloque 12**, **layout privado y navegación**.

---

**Regla final de continuidad:** la fuente de verdad es el código publicado, seguida por `AGENTS.md` y los contratos reales de la versión de ApiGastos utilizada. Este documento explica el contexto y las decisiones, pero no autoriza a ignorar cambios posteriores.
