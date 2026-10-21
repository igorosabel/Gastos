# Gastos — Documento de continuidad del desarrollo frontend

**Actualizado:** 21 de octubre de 2026.  
**Estado:** **bloques 1 a 42 completados, probados y publicados**. Cerrado el ciclo de invitaciones mediante correo SMTP, con entrega real comprobada. **Próximo bloque: 43, pendiente de definir**.  
**Frontend (`igorosabel/Gastos`, rama `main`, commit verificado):** [`b58b4eb251801d67366eafd11752b6c569614aee`](https://github.com/igorosabel/Gastos/commit/b58b4eb251801d67366eafd11752b6c569614aee) — `feat(tests): Pruebas de regresión y cierre de invitaciones`.  
**Backend (`igorosabel/ApiGastos`, rama `main`, commit verificado):** [`2a7d0afbd9f3f87ce1f9eaff4c9702b18bc6b207`](https://github.com/igorosabel/ApiGastos/commit/2a7d0afbd9f3f87ce1f9eaff4c9702b18bc6b207) — `fix(invites): Correcciones en envio de invitaciones`.  
**Versión de referencia:** ApiGastos `v1.0.0` es la base publicada; **el contrato efectivo usado por Gastos incluye cambios posteriores en `main`**, principalmente envío y reenvío SMTP de invitaciones.

> **Propósito:** documento de traspaso para retomar el desarrollo de Gastos en otra conversación. Recoge decisiones, historial, límites y punto de continuación. Es una fotografía del **21/10/2026**, no sustituye al código vigente, `AGENTS.md` ni a los contratos reales. Al continuar hay que volver a comprobar los últimos commits y leer los archivos actuales de ambos repositorios cuando proceda.

## 1. Contexto y enlaces

**Gastos** permite gestionar ingresos y gastos personales y compartidos mediante **espacios contables**. Cada usuario dispone de un espacio personal y puede crear espacios compartidos o unirse a ellos por invitación. Categorías, movimientos, recurrentes e informes pertenecen a un espacio y se aíslan según membresías y permisos verificados por ApiGastos.

- **Frontend Angular:** <https://github.com/igorosabel/Gastos> (`main`).
- **Instrucciones del frontend:** <https://github.com/igorosabel/Gastos/blob/main/AGENTS.md>.
- **Diseño y navegación:** <https://github.com/igorosabel/Gastos/blob/main/docs/design-responsive.md>.
- **Backend PHP/OFW:** <https://github.com/igorosabel/ApiGastos> (`main`); versión base <https://github.com/igorosabel/ApiGastos/tree/v1.0.0>.
- **Instrucciones del backend:** <https://github.com/igorosabel/ApiGastos/blob/main/AGENTS.md>.
- **Contrato REST actual:** <https://github.com/igorosabel/ApiGastos/blob/main/docs/api/endpoints.md>. Consultar también `docs/api/recurring.md` y `docs/api/reports.md`.
- **Continuidad independiente del backend:** <https://github.com/igorosabel/ApiGastos/blob/main/docs/development/CONTINUIDAD_APIGASTOS.md> (comprobar vigencia).
- **Patrón de formularios de referencia:** <https://github.com/osumionline/Osumi-TPV-Client/tree/main/src/app/model/clientes>.

La API utilizada por el frontend se configura en `src/environments/environment.ts` y apunta a `https://apigastos.osumi.es`; **no existe un prefijo global `/api`**. El frontend y el backend se desarrollan, prueban, publican y versionan de manera **independiente**.

La documentación principal `docs/api/endpoints.md` nació después de publicar ApiGastos `v1.0.0`. **No asumir que la etiqueta `v1.0.0` contiene las ampliaciones de invitaciones realizadas después**. Ante diferencias, consultar `main` y su código real o una futura release que las incorpore.

## 2. Tecnologías, entorno y ejecución

### Frontend

- Angular **22**, TypeScript **6** en modo estricto, componentes standalone y rutas lazy.
- PrimeNG **22**, preset personalizado `src/app/gastos-preset.ts`, modo claro/oscuro, traducción española y botones con directiva `pButton`.
- **Angular Signal Forms** (`@angular/forms/signals`) como solución principal; signals, `computed`, `input`, `output`, `inject`, `@if`, `@for`, `@switch`.
- RxJS, SCSS, **Vitest** y Angular ESLint; diseño mobile-first con navegación específica para móvil y escritorio.
- Node.js **24** y npm **12.2.0** declarados en la configuración del proyecto.
- Despliegue mediante `.github/workflows/deploy-angular.yml` a **Plesk** al publicar en `main` o manualmente: `npm ci`, licencia PrimeNG privada inyectada, build de producción y SCP del contenido generado. Comprobar en cada cambio la ruta real de despliegue y la carga directa de las rutas Angular.

### Backend — repositorio independiente

- PHP **8.5+**, Osumi Framework **9.12.1**, MariaDB **12.3.x** (InnoDB), PHPUnit **13** y Debian 13/Plesk.
- `osumionline/plugin-email-smtp` / PHPMailer para el SMTP de invitaciones.
- Base de pruebas de integración: **exclusivamente `gastos_test`**, nunca la base de producción. 
- La configuración privada de producción no se sube al repositorio; se revisa con `php bin/check-deployment.php`.

### Comandos habituales

Frontend:

```bash
npm ci
npm start
npm run lint
npm run test
npm run build
```

Backend, cuando un bloque le corresponda:

```bash
composer test
composer test:integration
php bin/check-deployment.php
```

Cada bloque se propone con **cambios de código y pruebas conjuntamente**, se ejecuta y revisa localmente, el usuario confirma los resultados y hace **un commit lógico por unidad funcional**. No iniciar el siguiente bloque hasta esa confirmación. Las pruebas funcionales en móvil/ordenador o con dos cuentas se hacen cuando el alcance lo requiera.

### Seguridad de despliegue

- `src/environments/license.ts` y las credenciales de despliegue son privadas; el workflow inyecta `PRIMENG_LICENSE` desde un secreto.
- No publicar JWT, tokens completos de invitación, contraseñas SMTP, licencias ni secretos en repositorios, capturas, documentos ni logs.
- Evitar reutilizar bases y cuentas reales para pruebas destructivas. La limpieza total de datos realizada el 21/10/2026 fue una **prueba deliberada del usuario**, no un paso normal de verificación.

## 3. Convenciones arquitectónicas obligatorias

Leer los `AGENTS.md` vigentes. Resumen de reglas que ya se han utilizado:

1. **Frontend y backend separados**: no mezclarlos en un mismo bloque. No modificar Osumi Framework para corregir problemas de Gastos sin analizar y discutir antes si el cambio corresponde al framework.
2. Cada componente Angular mantiene **tres archivos**: `.ts`, `.html` y `.scss`; `templateUrl` y `styleUrl`, sin plantillas ni estilos inline. `ChangeDetectionStrategy.OnPush` es el comportamiento por defecto en Angular 22 usado en este proyecto.
3. Los servicios propios usan `@Service()` e `inject()` y se registran automáticamente en raíz; no duplicar proveedores en `app.config.ts`/`provideCore()`. Separar componentes, servicios, stores, interfaces y modelos.
4. Imports TypeScript con **aliases absolutos existentes**, nunca rutas relativas `./` o `../`. Elegir el alias más específico. Una única exportación por archivo implica `export default`. Tipar explícitamente propiedades, variables, parámetros y retornos; no usar `any`.
5. Utilizar Signal Forms con `form()`, `FormRoot`, `FormField` y `[formField]`. **No usar Reactive Forms**. Se permite `ngModel` para algún control aislado. Separar modelos, esquemas, valores iniciales y mappers de cada dominio en `src/app/model/`; no duplicar validaciones del framework en bindings independientes.
6. Con PrimeNG 22, preferir `<button pButton>` frente a componentes marcados como obsoletos. Conservar la traducción, el preset, el modo oscuro, las áreas seguras del móvil y la navegación descrita en `docs/design-responsive.md`.
7. Mantener la identificación y autorización **exclusivamente en ApiGastos**: el frontend solo representa permisos. No enviar el identificador del usuario autenticado desde formularios REST si el backend lo obtiene del middleware JWT.
8. Verificar aislamiento por usuario y por espacio, especialmente ante cambios de sesión, respuestas asíncronas tardías, altas/bajas de membresía y refrescos. No conceder acceso por datos conservados en el navegador.
9. Los importes contables viajan como **cadenas decimales**, nunca hacer cálculos de negocio con `float`. Fechas `DATE` son de calendario, sin transformación automática de huso horario.
10. **Desarrollo por unidades funcionales completas**, no por archivo/mensaje. Revisar el código real, proponer implementación y tests de cada unidad, validar y esperar push antes del siguiente bloque. Documentar el bloque cerrado con **Bloque / Estado / Alcance / Commit de referencia**.

## 4. Estructura actual relevante del frontend

Selección de rutas y archivos comprobados en el repositorio, no inventario exhaustivo:

```text
Gastos/
├── AGENTS.md
├── README.md
├── docs/
│   ├── design-responsive.md
│   └── development/CONTINUIDAD_GASTOS.md
├── .github/workflows/deploy-angular.yml
├── package.json / angular.json / tsconfig.json
└── src/
    ├── environments/                 # API y licencia local/privada
    ├── styles.scss
    ├── styles/_native-date-control.scss
    └── app/
        ├── app.config.ts / app.routes.ts / core.ts
        ├── gastos-preset.ts
        ├── auth/auth.store.ts
        ├── guard/auth.guards.ts
        ├── interceptors/auth.interceptor.ts
        ├── spaces/
        │   ├── space.store.ts
        │   └── pending-invitation.store.ts
        ├── services/
        │   ├── auth.service.ts / spaces.service.ts
        │   ├── categories.service.ts / transactions.service.ts
        │   ├── recurring.service.ts / reports.service.ts
        │   └── transaction-refresh.service.ts
        ├── interfaces/                 # Contratos REST por dominio
        │   └── auth.interfaces.ts / spaces/ categories/ transactions/ recurring/ reports/
        ├── model/                      # Formularios, esquemas y mappers
        │   └── auth/ spaces/ categories/ transactions/ recurring/ reports/
        ├── layout/private-layout/     # Cabecera + navegación responsive
        └── modules/
            ├── auth/login/ y auth/register/
            ├── pages/
            │   ├── dashboard/
            │   ├── categories/
            │   ├── transactions/
            │   ├── reports/
            │   ├── recurring/
            │   └── settings/
            ├── transactions/create-transaction/ y edit-transaction/
            ├── recurring/create-recurring/ y edit-recurring/
            ├── recurring/recurring-occurrences/
            ├── reports/monthly-categories/
            └── spaces/
                ├── create-space/ y create-invitation/
                ├── space-invitations/ y accept-invitation/
                ├── invitation-link/    # Ruta pública /invitacion
                └── ...                # Miembros, revocación, abandono, expulsión
```

**Rutas:** `/login` y `/register` públicas para invitados, `/invitacion` pública para invitados y usuarios autenticados, y `/dashboard`, `/categories`, `/transactions`, `/reports`, `/recurring`, `/settings` bajo `PrivateLayout` y `authGuard` con carga diferida. Raíz → `/dashboard`. Navegación inferior fija en móvil, lateral persistente en escritorio, selector del espacio en la cabecera y acción destacada para añadir un movimiento.

### Estado de los módulos

- **Autenticación:** registro/login, JWT Bearer, guards e interceptor; `AuthStore` guarda la sesión por pestaña en `sessionStorage` (`gastos.auth.v1`). Sin refresh JWT ni logout remoto; cerrar sesión limpia el estado local.
- **Espacios:** personales y compartidos, creación, consulta, selección, invitaciones, revocación, aceptación, reenvío, miembros, abandono y expulsión. Permisos comprobados por ApiGastos.
- **`SpaceStore`:** signals, selección, carga, errores y control de respuestas antiguas. **Desde el bloque 38** recuerda en `localStorage` el espacio por identificador de usuario, pero solo lo restaura si sigue autorizado en el nuevo `GET /spaces`; prioridad al estado válido actual y selección alternativa segura si el espacio dejó de ser accesible. Nunca confundir preferencia local con permiso.
- **Invitaciones:** enlace `https://<frontend>/invitacion#token=<hex64>`; el token se retira de la URL visible y se guarda temporalmente en `sessionStorage` mediante `PendingInvitationStore`, sin aceptación automática. El login/registro conserva `returnUrl=/invitacion`. La aceptación exige usuario autenticado con email destinatario, confirmación y actualización del `SpaceStore`. El formulario de token manual en Ajustes sigue existiendo.
- **Categorías:** árbol jerárquico, creación, edición y eliminación por espacio; Signal Forms, permisos y dependencias verificadas en backend.
- **Movimientos:** ingresos/gastos, filtros/paginación, CRUD, importes como cadenas, conflictos con recurrentes y alta rápida global con confirmación temporal de cuatro segundos.
- **Recurrentes:** plantillas activas/inactivas, creación/edición, consulta de ocurrencias, generación mensual explícita por espacio, confirmación u omisión definitiva y sincronización de las cifras reales y previstas.
- **Dashboard:** resumen mensual con ingresos, gastos, resultado, previsión, categorías y últimos movimientos reales; **no** pantalla provisional de administración.
- **Informes:** evolución real de doce meses y categorías por mes; diferenciación entre movimientos contabilizados y previsión de pendientes.
- **Actualización económica:** `TransactionRefreshService` notifica cambios para recargar vistas relacionadas; no recalcula importes inventados en Angular.
- **Diseño:** responsive descrito en `docs/design-responsive.md`; mixin de fechas `src/styles/_native-date-control.scss` (bloque 36); mitigación del zoom móvil global (bloque 37); README actualizado (bloque 39).

Los tests `*.spec.ts` acompañan a servicios, stores, componentes y mappers según responsabilidad. La prueba de correo y registro con un segundo usuario se completó en el entorno real el **21/10/2026**.

## 5. Bloques de desarrollo realizados y validados

Los bloques **1–42** constan como completados y publicados, según las confirmaciones del usuario y los commits. Los primeros 36 ya estaban documentados; el 37 figuraba en el historial como completo, y los bloques 38–42 reflejan los commits actuales. No se han vuelto a ejecutar aquí todos los tests: la validación pertenece al entorno del usuario.

| Bloque | Estado | Alcance | Commit de referencia |
| --- | --- | --- | --- |
| 1. Base e integración inicial | Completo | Base Angular/PrimeNG, configuración de API y convenciones alineadas con ApiGastos. | `ea000e0` |
| 2. Autenticación y rutas | Completo | `AuthStore`, JWT, guards, interceptor y ruta privada. | `73919b1` |
| 3. Login y registro | Completo | Signal Forms, esquemas, mappers, estilos compartidos, foco y pruebas. | `be0859b`, `a0799d4` |
| 4. Selección de espacios | Completo | `GET /spaces`, `SpacesService`, `SpaceStore`, selector y cabecera. | `290a0c7` |
| 5. Creación de espacios compartidos | Completo | `POST /spaces`, formulario y selección tras crear. | `9882d1b` |
| 6. Crear y consultar invitaciones | Completo | Crear/listar invitaciones, token temporal y pruebas. | `1548553` |
| 7. Revocar invitaciones | Completo | Revocación, confirmación, recarga y respuestas tardías. | `3f87250` |
| 8. Aceptar invitaciones | Completo | Aceptación manual por token y selección de espacio incorporado. | `876b7ea` |
| 9. Listar miembros | Completo | Miembros, rol, fecha, permisos y cambio de espacio. | `f9b902a` |
| 10. Abandono de espacios | Completo | Abandono de espacio compartido, confirmación, selección alternativa. | `7f85d27` |
| 11. Expulsión de miembros | Completo | Expulsión por propietario, bloqueos y recarga. | `ef06f07` |
| 12. Layout privado y navegación | Completo | `PrivateLayout`, rutas lazy, navegación y carga de espacios. | `1ca74fa` |
| 13. Consulta de categorías | Completo | `GET /categories`, árbol, orden y contexto por espacio. | `f1c93a7` |
| 14. Creación de categorías | Completo | Signal Forms, categoría padre, tipo y pruebas. | `71afd2a` |
| 15. Edición de categorías | Completo | Jerarquía, prevención de ciclos, tipo y orden. | `343aed6` |
| 16. Eliminación de categorías | Completo | Confirmación, dependencias, conflictos y recarga. | `233bdc8` |
| 17. Consulta de movimientos | Completo | `GET /transactions`, fechas, categorías e importes `string`. | `1c6efbe` |
| 18. Paginación de movimientos | Completo | Paginación por API, totales y peticiones obsoletas. | `5e33116` |
| 19. Filtros de movimientos | Completo | Fecha, tipo y categoría; aplicar/limpiar, validación. | `a0109a8` |
| 20. Creación de movimientos | Completo | `POST /transactions`, formulario, importes, fecha, categoría. | `c59a1c9` |
| 21. Edición de movimientos | Completo | `POST /transactions/update`, validación y conflictos con recurrentes. | `cc6b0e9` |
| 22. Eliminación de movimientos | Completo | `POST /transactions/delete`, confirmación, errores y paginación. | `58bb624` |
| 23. Diseño responsive y navegación | Completo | Menú lateral, barra móvil, cabecera, Ajustes e iconografía. | `e45cde1`, `ba972c9` |
| 24. Dashboard económico mensual | Completo | Resumen real, indicadores, categorías, últimos movimientos y previsión. | `9463478` |
| 25. Registro rápido de movimientos | Completo | Modal reutilizable, notificación y confirmación de cuatro segundos. | `488c51e`, `d164e0b`, `4cdb559` |
| 26. Informes de evolución | Completo | `GET /reports/evolution`, doce meses y sincronización. | `afac3fc` |
| 27. Informes por categorías | Completo | Desglose, importes, recuentos, proporciones y mes. | `5c7b3f3` |
| 28. Consulta de recurrentes | Completo | `GET /recurring`, estado, vigencia y periodicidad. | `08ba053` |
| 29. Creación de recurrentes | Completo | Signal Forms, fechas, importes, jerarquía y retoques responsive. | `6ffb21d`, `c7d2c8b` |
| 30. Activación/desactivación de recurrentes | Completo | `POST /recurring/status`, concurrencia y recarga. | `122987a` |
| 31. Edición de recurrentes | Completo | `POST /recurring/update`, esquema y mappers reutilizados. | `880c21b`, `145d8a1` |
| 32. Consulta de ocurrencias | Completo | `GET /recurring/occurrences`, mes, estados y paginación. | `ba71b90` |
| 33. Generación de mensualidades | Completo | `POST /recurring/generate-space`, contadores, parciales e idempotencia. | `44b9661` |
| 34. Confirmar/omitir ocurrencias | Completo | `POST /recurring/occurrences/resolve`, conflictos y movimiento real. | `d5c447b` |
| 35. Sincronización económica | Completo | `TransactionRefreshService`, generación y resoluciones, recargas seguras. | `b38a15b` |
| 36. Estilos compartidos de fecha | Completo | Mixin SCSS de controles nativos, Safari/iOS y Chrome/Windows. | `e4a9dc5` |
| 37. Bloqueo del zoom móvil | Completo | Viewport y gestos de zoom táctil, preservando desplazamiento normal. | `eada1ff` |
| 38. Preferencia de espacio por usuario | Completo | Persistencia del último espacio en `localStorage`, segregada por usuario y validada con `GET /spaces`. | `926588e` |
| 39. Documentación y preparación | Completo | README actualizado, versiones, arquitectura, comandos y despliegue. | `e87295b` |
| 40. Aceptación mediante enlace | Completo | Ruta pública `/invitacion`, fragmento de token, `PendingInvitationStore`, login/registro con retorno, aceptación y selección. | `41ec243` |
| 41. Integración de invitaciones SMTP | Completo | Crear/reenviar, `email_sent`, enlaces alternativos, confirmaciones y UX responsive. | `dd11cac` |
| 42. Regresión y cierre de invitaciones | Completo | Tests HTTP de reenvío, retirada de token de URL y aceptación explícita. Prueba real de creación, registro, invitación, aceptación y recepción SMTP. | `b58b4eb` |

### Hitos independientes de ApiGastos relacionados con invitaciones

**La numeración anterior corresponde exclusivamente al frontend.** El backend tiene su propio ciclo de commits y pruebas; no contar estos hitos como bloques Angular.

| Estado | Alcance | Commit de ApiGastos |
| --- | --- | --- |
| Completo | Servicio SMTP basado en `OEmailSMTP` y preparación de contenido HTML seguro con enlace público. | `b92b0db`, `1e9a44c` |
| Completo | Servicio de composición de contenido y transporte de invitaciones. | `ae99fca` |
| Completo | Envío SMTP al crear, `email_sent`, reenvío con rotación de token, cooldown, permisos, pruebas y documentación de despliegue. | `a5e9c9c` |
| Completo | Diagnóstico de fallos SMTP y excepciones mediante logs seguros; pruebas unitarias aisladas de `OLog`. | `2a7d0af` |
| **Validado funcionalmente** | Tras añadir `mailing_from` a la configuración privada, Gastos mostró «Invitación enviada» y el correo llegó a un destinatario real. | Prueba confirmada el **21/10/2026**; no requiere commit de secretos |

## 6. Contrato REST relevante y decisiones de negocio

**API base:** `https://apigastos.osumi.es` (sin `/api`); autorización mediante **JWT Bearer**. Fuente actual: [`ApiGastos/docs/api/endpoints.md`](https://github.com/igorosabel/ApiGastos/blob/main/docs/api/endpoints.md). **No reutilizar exclusivamente el contrato de la etiqueta `v1.0.0` para invitaciones**: el reenvío y el campo `email_sent` se incorporaron después.

| Dominio | Endpoints | Integración actual |
| --- | --- | --- |
| Autenticación | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Registro, login y sesión. |
| Espacios | `GET /spaces`, `POST /spaces` | Listado, selección, preferencia y creación. |
| Invitaciones | `POST /spaces/invitations`, `GET /spaces/invitations`, `POST /spaces/invitations/resend`, `POST /spaces/invitations/revoke`, `POST /spaces/invitations/accept` | Crear/enviar, listar, reenviar, revocar y aceptar por enlace o token manual. |
| Miembros | `GET /spaces/members`, `POST /spaces/members/leave`, `POST /spaces/members/remove` | Listar, abandonar, expulsar. |
| Categorías | `GET /categories`, `POST /categories`, `POST /categories/update`, `POST /categories/delete` | CRUD y jerarquía. |
| Movimientos | `GET /transactions`, `POST /transactions`, `POST /transactions/update`, `POST /transactions/delete` | CRUD, filtros, paginación. |
| Recurrentes | `GET /recurring`, `POST /recurring`, `POST /recurring/update`, `POST /recurring/status` | Plantillas y estado. |
| Ocurrencias | `GET /recurring/occurrences`, `POST /recurring/generate-space`, `POST /recurring/occurrences/resolve` | Generación explícita, consulta, confirmación/omisión. |
| Ocurrencia individual | `POST /recurring/generate` | Existe en backend, **no** integrada en el flujo principal actual. |
| Informes | `GET /reports/monthly`, `GET /reports/monthly/categories`, `GET /reports/evolution`, `GET /reports/monthly/forecast`, `GET /reports/evolution/forecast` | Dashboard e informes reales; previsión mensual consumida donde procede. |

### Invitaciones y correo (cerrado y validado)

- `POST /spaces/invitations` crea una invitación persistente **antes** de intentar SMTP; devuelve `201`, objeto `invitation` con token original y `email_sent: boolean`. `email_sent: true` significa **mensaje aceptado por SMTP**, no entrega final garantizada. Ante error de transporte, la invitación se conserva y `email_sent: false` permite copiar un enlace alternativo desde Angular.
- `POST /spaces/invitations/resend` recibe `{ "invitationId": número }`, devuelve `200` y el mismo contrato. El propietario puede reenviar una invitación pendiente **al menos un minuto después de la última emisión**. Se genera un token nuevo, el anterior queda inválido y se conserva la fecha de caducidad inicial. Conflictos dan `409`; falta de autorización, `403`.
- El token tiene **64 caracteres hexadecimales**, se persiste en MariaDB solo su **hash SHA-256**, y se expone en respuestas de creación/reenvío, **nunca en el listado**. Las invitaciones caducan a **siete días** de la creación original.
- `POST /spaces/invitations/accept` solo permite aceptar a un usuario autenticado cuyo **email coincide con el destinatario**. Un token aceptado, revocado, caducado o sustituido no sirve de nuevo. La aceptación es explícita, no automática al abrir el enlace.
- En el frontend la página `/invitacion` lee `#token=...`, elimina el fragmento visible y mantiene temporalmente el token en `sessionStorage`, incluso durante login/registro con `returnUrl=/invitacion`. Una aceptación correcta incorpora y selecciona el espacio compartido.
- `extra.frontend_url` en la configuración privada de ApiGastos define el **origen HTTPS del frontend**, sin parámetros, fragmentos ni `/invitacion`. `mailing_from` es el remitente real requerido, con configuración SMTP dentro de `plugins.email_smtp`. La omisión de `mailing_from` causó una `InvalidArgumentException` en la prueba real y quedó resuelta al configurarlo.
- Los servicios backend registran fallos con `OLog` en nivel `ERROR` usando códigos sanitizados como `smtp_invitation_failed reason=authentication_failed` o `invitation_email_failed invitation_id=... reason=...`. No registrar mensajes SMTP brutos, credenciales ni tokens. En tests unitarios, sustituir `logFailure()` para no arrancar OFW ni escribir logs reales.
- La **entrega real de un correo de invitación** quedó confirmada el **21/10/2026**; puede existir demora entre la aceptación SMTP y la recepción en el buzón. La incidencia de correo se considera **resuelta**, no pendiente.

### Otras reglas de negocio importantes

- Un espacio tiene `id`, `name`, `type` (`personal`/`shared`), `owner_id`, `is_owner`. Todo dato económico se filtra y autoriza en backend por espacio y membresía activa.
- `GET /spaces/members` devuelve id de usuario, nombre, fecha de incorporación y propiedad, **no el email** del miembro. Un propietario no puede abandonar su propio espacio ni ser expulsado.
- Los importes contables se transportan como `string`, no convertir a `float` para cálculos. Las fechas `DATE` no son instantes temporales. En ApiGastos, los timestamps de modelos OFW se generan usando la hora de PHP; no mezclar indiscriminadamente `NOW()` de MariaDB y `time()`/`strtotime()` al implementar reglas temporales.
- Las ocurrencias recurrentes se **generan bajo solicitud**, no con tarea programada. `POST /recurring/generate-space` es idempotente por plantilla/período, pero puede dejar el lote parcialmente persistido; nunca reintentar automáticamente una escritura de resultado incierto.
- Los contadores `created`, `existing`, `skipped`, `total` de generación se refieren a plantillas procesadas; el `skipped` de generación no equivale a una ocurrencia omitida.
- `POST /recurring/occurrences/resolve` con `confirm` crea un **movimiento real** enlazado mediante `transaction_id`; con `skip` no lo crea. Solo se resuelven pendientes; repetir la resolución da `409`, sin función de deshacer.
- Las plantillas inactivas mantienen las ocurrencias existentes. Reactivar no genera de forma automática periodos previos: la política A de ApiGastos permite generación explícita de periodos válidos aún sin ocurrencia.
- Previsión mensual: `actual` es contabilidad real; `pending`, ocurrencias pendientes generadas; `projected = actual + pending`. Una ocurrencia confirmada pasa a movimiento real y no se contabiliza dos veces; omitirla la elimina de `pending`.
- `TransactionRefreshService` avisa a otras vistas de cambios relevantes, pero no construye valores contables ficticios ni da permiso sobre espacios.

## 7. Punto exacto de continuación: después del bloque 42

**Estado final confirmado el 21/10/2026:** ambos repositorios actualizados, suites automáticas reportadas como correctas y funcionalidad de invitaciones por email cerrada. El usuario creó una cuenta y un espacio desde una base de pruebas vacía, invitó a otro correo, registró al destinatario, aceptó la invitación y comprobó la selección automática del espacio. Una vez corregida la configuración privada `mailing_from`, **el mensaje SMTP se aceptó y llegó al buzón del invitado**.

El bloque 42 está en [`b58b4eb`](https://github.com/igorosabel/Gastos/commit/b58b4eb251801d67366eafd11752b6c569614aee), y el diagnóstico del backend en [`2a7d0af`](https://github.com/igorosabel/ApiGastos/commit/2a7d0afbd9f3f87ce1f9eaff4c9702b18bc6b207). **El único trabajo solicitado ahora es actualizar este documento y subirlo a Gastos**, sin empezar el bloque 43 en paralelo.

**Siguiente paso:** una vez que el usuario haya publicado esta versión de `CONTINUIDAD_GASTOS.md`, verificar el nuevo commit y **definir el bloque 43** entre las mejoras y el pulido general todavía pendientes. No volver a implementar ni a depurar el SMTP por defecto: la funcionalidad está cerrada salvo que aparezca una incidencia nueva y reproducible.

## 8. Hoja de ruta posterior (provisional)

Los siguientes apartados son **candidatos**, no bloques comprometidos. Decidir el alcance tras verificar el estado real del repositorio:

1. **Pulido transversal previo a la siguiente versión:** revisar estados vacíos, errores, accesibilidad, modo oscuro y responsive de Inicio, Movimientos, Categorías, Recurrentes, Informes y Ajustes; atender solo defectos verificables.
2. **Regresión extremo a extremo de contabilidad:** comprobar con datos de prueba el ciclo categorías → movimientos → recurrentes → confirmación/omisión → dashboard/informes, separando importes reales de previstos y teniendo cuidado con operaciones irreversibles.
3. **Revisión de despliegue y documentación:** comprobar coherencia de README, documentación de continuidad y versión efectiva de ApiGastos (`main` frente a `v1.0.0`); valorar una próxima release del backend para consolidar los endpoints de correo, si se decide hacerlo.
4. **Extensiones solo tras acuerdo expreso:** integración de `GET /reports/evolution/forecast`, generación de ocurrencia individual, preferencias de cuenta en backend, avisos entre sesiones o automatización de recurrentes. No asumir que todas son necesarias.

**No volver a presentar como tareas pendientes** el zoom móvil (bloque 37), el último espacio seleccionado (38), el README (39) ni el circuito de invitaciones y SMTP (40–42 + backend). Tampoco los bloques anteriores de dashboard, informes y recurrentes, ya implementados.

## 9. Límites, riesgos y precauciones

- **Fuente de verdad:** commits actuales, `AGENTS.md`, código y contrato backend. El documento puede desactualizarse en cuanto aparezcan nuevos commits.
- **Privacidad:** `sessionStorage` guarda JWT e invitaciones pendientes por pestaña; `localStorage` guarda una preferencia de espacio por usuario, **no una autorización**. No mostrar tokens en logs ni en capturas. El backend solo conserva hashes de tokens.
- **Envío SMTP:** `email_sent: true` expresa aceptación por SMTP, no garantía de entrega final. La configuración privada (`mailing_from`, `extra.frontend_url`, `plugins.email_smtp`) debe mantenerse correcta y fuera de Git. Logs de fallo sanitizados a nivel `ERROR`.
- **Fecha/hora:** el cooldown de reenvío del backend compara `updated_at` según el mismo reloj y zona horaria de PHP usados por el ORM. Las pruebas ajustan `updated_at` con fecha de PHP, no con `NOW()` de MariaDB para evitar desajustes.
- **Estado económico:** no duplicar un movimiento recurrente confirmado dentro de la previsión; no crear ocurrencias al consultar informes y no reintentar operaciones que pueden haber sido ejecutadas parcialmente.
- **Cambios concurrentes:** al cambiar de usuario o espacio, descartar respuestas tardías y refrescar el estado autorizado. Cancelar una solicitud Angular no interrumpe necesariamente el trabajo del backend.
- **Sincronización entre sesiones:** no existe notificación push de revocaciones u otros cambios en otra sesión; la API mantiene el control de permisos y las vistas deben volver a cargar datos cuando corresponda.
- **Tecnología:** Angular 22/PrimeNG 22/Signal Forms, PHP 8.5+/OFW 9.12.1 y Plesk según las versiones verificadas. No introducir patrones obsoletos. La aplicación tiene una política deliberada de bloqueo de zoom táctil: si se modifica, revisar accesibilidad y comportamiento real de iOS.
- **Pruebas:** no aceptar warnings/notices de PHPUnit; tests unitarios sin acceso a base real ni logs externos y tests de integración solo en `gastos_test`. Las pruebas reales con correos se hacen con direcciones bajo control del usuario.
- **No ampliar el alcance sin acuerdo:** no añadir refresh JWT, logout remoto, transferencia de propiedad, eliminación completa de cuenta, tareas cron de recurrentes, reestructuración del frontend o modificaciones de OFW en un bloque de cierre.

## 10. Procedimiento recomendado para otra conversación

1. Leer primero `Gastos/AGENTS.md`, este documento y, si se modifica navegación o diseño, `docs/design-responsive.md`.
2. Comprobar el **último commit real** de Gastos y el estado de sus módulos. La referencia a 21/10/2026 es `b58b4eb`, pero tras subir este documento habrá **un commit de documentación posterior**.
3. Si el bloque necesita cambiar ApiGastos, leer su propio `AGENTS.md` y los archivos reales, y contrastar `docs/api/endpoints.md` con rutas/DTO/componentes/servicios. Última referencia verificada del backend: `2a7d0af`.
4. Partir de que **los bloques 1–42 están completos**. Invitaciones por correo **funcionan y están cerradas**, incluida recepción real tras configurar el remitente SMTP.
5. Proponer una **unidad funcional completa** para el futuro bloque 43, indicando archivos, decisiones, código, pruebas y verificación manual. No dividir artificialmente por archivo; mantener frontend y backend en commits y bloques distintos.
6. Esperar `npm run lint`, `npm run test`, `npm run build` (o `composer test` y `composer test:integration` en backend), validación manual del usuario y confirmación de push antes del siguiente bloque.
7. Al iniciar el siguiente bloque, actualizar la tabla con el bloque recién cerrado, las **cuatro columnas: Bloque / Estado / Alcance / Commit de referencia**, la cabecera, el punto de continuación, riesgos y mejoras pendientes.

### Texto breve para abrir otra conversación

> Desarrollamos **Gastos** (`igorosabel/Gastos`), frontend Angular 22/PrimeNG 22 con Signal Forms, y **ApiGastos** (`igorosabel/ApiGastos`), backend PHP 8.5+/Osumi Framework 9.12.1. **Los bloques frontend 1–42 están completados y publicados**. Último commit funcional frontend verificado: `b58b4eb` (pruebas de regresión y cierre de invitaciones); último backend: `2a7d0af` (diagnóstico seguro de SMTP). El flujo de invitaciones por email se probó desde registro y espacio nuevos hasta recepción real de correo, aceptación y selección del espacio; se solucionó la incidencia configurando `mailing_from` en ApiGastos. El nuevo documento de continuidad, una vez subido, será un commit de documentación adicional. **Próximo bloque 43 pendiente de definir.** Antes de proponer cambios lee `AGENTS.md`, `docs/development/CONTINUIDAD_GASTOS.md`, el código actual y el contrato REST de ApiGastos. Trabajamos por unidades funcionales completas, con tests, validación y push antes de continuar, manteniendo separados Angular y OFW.

## 11. Mejoras y estado actualizado

| Mejora | Estado | Alcance / próxima decisión |
| --- | --- | --- |
| Zoom automático en iPhone/Safari | **Completa (37)** | Se aplicó una política de bloqueo del zoom móvil según la decisión adoptada y se conserva el desplazamiento normal. No volver a plantearla como pendiente; revisar accesibilidad si se reabre. |
| Persistencia del último espacio seleccionado | **Completa (38)** | `localStorage` por usuario con validación contra `GET /spaces`, sin conceder acceso por preferencias locales. |
| README y documentación general | **Completa (39)** | Actualizado para Angular 22, Vitest, configuración, arquitectura y despliegue. |
| Invitaciones por enlace y correo SMTP | **Completa (40–42 + backend)** | Enlace, login/registro, aceptación, envío, reenvío, fallback manual y logs seguros. **Email real recibido 21/10/2026**. |
| Pulido transversal y regresión contable | **Candidato posterior** | Definir bloque 43 o siguientes tras revisar incidencias y prioridades. |
| Evolución de informes y recurrentes | **Opcional/no comprometida** | Solo si se solicita integrar forecast evolutivo, generación individual u otras extensiones previstas en backend. |

---

**Regla final de continuidad:** la fuente de verdad es el **código publicado**, después `AGENTS.md` y los **contratos reales y vigentes** de ApiGastos. Este documento conserva el historial y el contexto, pero no sustituye la verificación de archivos y commits antes de cada nuevo bloque.
