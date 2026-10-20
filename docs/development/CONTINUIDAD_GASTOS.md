# Gastos — Documento de continuidad del desarrollo frontend

**Actualizado:** 20 de octubre de 2026
**Estado:** bloques 1 a 36 completados, probados y publicados; siguiente bloque (37) pendiente de concretar. Preparado para actualizar la continuidad sin introducir cambios de código.
**Frontend (rama `main`, commit verificado):** [`e4a9dc5046e173a7914d2b34cc8ee8d1224a1aff`](https://github.com/igorosabel/Gastos/commit/e4a9dc5046e173a7914d2b34cc8ee8d1224a1aff) — `feat(design): Centralización de estilos de fecha` (bloque 36).
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
- **Signal Forms** (`@angular/forms/signals`) como sistema principal de formularios. `ngModel` únicamente para controles aislados (por ejemplo, selector aislado del espacio activo); **no** Reactive Forms.
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
2. Cada componente Angular dispone de `nombre.ts`, `nombre.html` y `nombre.scss` **separados**; no templates ni estilos inline. Usar `ChangeDetectionStrategy.OnPush` según las convenciones actuales.
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

Estructura funcional comprobada en la rama `main` hasta el commit `e4a9dc5` (es una selección de rutas, no un listado exhaustivo):

```text
Gastos/
├── AGENTS.md
├── docs/
│   ├── design-responsive.md
│   └── development/CONTINUIDAD_GASTOS.md
├── .github/workflows/deploy-angular.yml
├── package.json / angular.json / tsconfig.json
└── src/
    ├── environments/              # URL de ApiGastos y licencia privada de despliegue
    ├── styles.scss
    ├── styles/
    │   └── _native-date-control.scss  # Mixin nativo para fecha, bloque 36
    └── app/
        ├── app.config.ts / app.routes.ts / core.ts
        ├── gastos-preset.ts       # Preset de PrimeNG y modo oscuro
        ├── auth/auth.store.ts
        ├── guard/auth.guards.ts
        ├── interceptors/auth.interceptor.ts
        ├── spaces/space.store.ts
        ├── services/
        │   ├── auth.service.ts / spaces.service.ts
        │   ├── categories.service.ts / transactions.service.ts
        │   ├── recurring.service.ts / reports.service.ts
        │   └── transaction-refresh.service.ts
        ├── interfaces/           # Contratos REST por dominio
        │   ├── auth.interfaces.ts
        │   └── spaces/ categories/ transactions/ recurring/ reports/
        ├── model/                # Modelos y mappers de formulario por dominio
        │   └── auth/ spaces/ categories/ transactions/ recurring/ reports/
        ├── layout/private-layout/
        │   └── private-layout.ts / .html / .scss
        └── modules/
            ├── auth/login/ y auth/register/
            ├── pages/
            │   ├── dashboard/    # Inicio económico, resumen real y previsión
            │   ├── categories/   # Jerarquía y CRUD
            │   ├── transactions/ # Consulta, filtros, paginación y CRUD
            │   ├── reports/      # Evolución mensual y desglose por categorías
            │   ├── recurring/    # Plantillas y acceso a ocurrencias
            │   └── settings/     # Administración de espacios y miembros
            ├── transactions/create-transaction/ y edit-transaction/
            ├── recurring/
            │   ├── create-recurring/
            │   ├── edit-recurring/
            │   └── recurring-occurrences/
            ├── reports/monthly-categories/
            └── spaces/          # Formularios, invitaciones, miembros y abandono
```

**Rutas:** `/login`, `/register` y área privada con `PrivateLayout` y carga diferida de `/dashboard`, `/categories`, `/transactions`, `/reports`, `/recurring` y `/settings`. La ruta raíz redirige a `/dashboard`. La navegación es inferior y fija en móvil y lateral en escritorio, con selector de espacio en la cabecera y acceso rápido a crear movimiento desde el layout.

### Estado de los módulos

- **Autenticación:** JWT Bearer, login, registro, guards e interceptor; el cierre de sesión es local. `AuthStore` persiste la sesión en `sessionStorage` (`gastos.auth.v1`) por pestaña; no hay refresh de JWT ni endpoint de logout.
- **Espacios y miembros:** espacio personal y espacios compartidos; creación, selección, invitaciones, revocación, aceptación, listado de miembros, abandono y expulsión, respetando permisos de ApiGastos.
- **`SpaceStore`:** signals para espacios, selección, carga y errores. Al cargar el listado mantiene una selección válida en la misma instancia; de lo contrario, prioriza el espacio personal. La selección **todavía no se persiste** tras una recarga completa o un nuevo inicio de sesión. Se invalida estado antiguo ante cambios de usuario, espacio o sesión.
- **Categorías:** consulta jerárquica, creación, edición y eliminación por espacio; formularios Signal Forms y permisos comprobados en el backend.
- **Movimientos:** ingresos/gastos, filtros y paginación, creación/edición/eliminación, control de importes como cadenas decimales, gestión de conflictos con recurrentes. Alta rápida global desde la navegación y confirmación temporal de cuatro segundos.
- **Recurrentes:** CRUD funcional de plantillas (sin eliminación), activación/desactivación, consulta de ocurrencias mensuales, filtros, paginación, generación explícita por espacio, confirmación u omisión definitiva. El circuito genera movimientos reales solamente al confirmar una ocurrencia pendiente.
- **Inicio:** dashboard financiero real del mes con ingresos, gastos, resultado, previsión, categorías y últimos movimientos. **Ya no es un dashboard provisional de administración**.
- **Informes:** evolución real de doce meses y análisis por categorías; datos procedentes de ApiGastos, diferenciando contabilidad real de previsión en el dashboard.
- **Invalidación económica:** `TransactionRefreshService` notifica a las vistas económicas tras cambios relevantes. El bloque 35 cubre generación con nuevos pendientes, confirmación y omisión; en respuestas inciertas se vuelve a consultar sin reintentar escrituras automáticamente.
- **Estilos responsive:** `docs/design-responsive.md` es la referencia. Los controles nativos de fecha usan el mixin `src/styles/_native-date-control.scss` (bloque 36), ya probado en Safari/iOS y Chrome/Windows; no volver a introducir estilos divergentes en los tres componentes.

Los tests `*.spec.ts` acompañan a stores, servicios, componentes y mappers cuando corresponde. Las pruebas manuales de responsive en iPhone/Safari y Windows/Chrome se han validado por el usuario en los hitos indicados.

## 5. Bloques de desarrollo realizados y validados

Los **36 bloques** fueron completados, probados y confirmados por el usuario (lint, tests, build y verificaciones funcionales según el caso), y tienen commits publicados. La redacción de este documento no constituye una nueva ejecución de esas pruebas.

| Bloque | Estado | Alcance | Commit de referencia |
| --- | --- | --- | --- |
| 1. Base e integración inicial | Completo | Base Angular/PrimeNG, configuración de API, convención de servicios y arquitectura alineada con ApiGastos 1.0.0. | `ea000e0` (ajustes de core) |
| 2. Autenticación y rutas | Completo | `AuthStore` JWT, guards, interceptor y dashboard protegido. | `73919b1` |
| 3. Login y registro | Completo | Signal Forms, separación modelo/esquema/valor inicial/mapper, estilos compartidos, foco inicial, pruebas y registro/login reales. | `be0859b`, `a0799d4` |
| 4. Selección de espacios | Completo | `GET /spaces`, `SpacesService`, `SpaceStore`, selector y cabecera responsive. | `290a0c7` |
| 5. Creación de espacios compartidos | Completo | `POST /spaces`, formulario Signal Forms, selección inmediata. | `9882d1b` |
| 6. Crear y consultar invitaciones | Completo | `POST /spaces/invitations`, `GET /spaces/invitations`, token de un solo acceso visual; pruebas del mapper. | `1548553` |
| 7. Revocar invitaciones | Completo | `POST /spaces/invitations/revoke`, confirmación, actualización del listado y prevención de respuestas tardías. | `3f87250` |
| 8. Aceptar invitaciones | Completo | `POST /spaces/invitations/accept`, formulario de token, incorporación del nuevo espacio al store. | `876b7ea` |
| 9. Listar miembros | Completo | `GET /spaces/members`, nombres, fecha de incorporación, rol, actualización, permisos y pruebas de cambio de espacio. | `f9b902a` |
| 10. Abandono voluntario de espacios | Completo | `POST /spaces/members/leave`, confirmación, baja lógica de membresía, actualización de `SpaceStore`, selección alternativa y protección contra respuestas tardías. | `7f85d27` |
| 11. Expulsión de miembros | Completo | `POST /spaces/members/remove`, confirmación por miembro, protección del propietario, actualización del listado y controles de sesión, concurrencia y permisos. | `ef06f07` |
| 12. Layout privado y navegación | Completo | Layout privado compartido, rutas funcionales lazy y guard, carga centralizada de espacios y navegación inicial; pruebas. | `1ca74fa` |
| 13. Consulta de categorías por espacio | Completo | GET /categories, árbol jerárquico, ordenación, estados de carga/error y aislamiento de espacio y sesión. | `f1c93a7` |
| 14. Creación de categorías | Completo | POST /categories; Signal Forms para categorías principales y subordinadas, tipo, nombre, selector jerárquico y pruebas. | `71afd2a` |
| 15. Edición de categorías | Completo | POST /categories/update; validación de jerarquía, prevención de ciclos, conservación de tipo y orden, aislamiento y pruebas. | `343aed6` |
| 16. Eliminación de categorías | Completo | POST /categories/delete; confirmación, gestión de dependencias, duplicados, errores y recarga. | `233bdc8` |
| 17. Consulta de movimientos económicos | Completo | GET /transactions, categorías, fechas e importes como cadenas; estados de carga/error y contexto seguro. | `1c6efbe` |
| 18. Paginación de movimientos | Completo | Paginación real por API, totales, navegación y cancelación de peticiones obsoletas. | `5e33116` |
| 19. Filtros de movimientos | Completo | Filtros Signal Forms de fecha, tipo y categoría, aplicar/limpiar, paginación, validaciones. | `a0109a8` |
| 20. Creación de movimientos económicos | Completo | POST /transactions; Signal Forms, importe, concepto, fecha y categoría compatible, recarga y pruebas. | `c59a1c9` |
| 21. Edición de movimientos económicos | Completo | POST /transactions/update; validaciones reutilizadas, conflictos con recurrentes, filtros y estado preservados. | `cc6b0e9` |
| 22. Eliminación de movimientos económicos | Completo | POST /transactions/delete; confirmación, conflictos, peticiones duplicadas y paginación actualizada. | `58bb624` |
| 23. Diseño responsive y navegación | Completo | Menú lateral de escritorio, barra inferior de móvil, cabecera por espacio, Ajustes, estructura del dashboard e iconos SVG. | `e45cde1; ba972c9` |
| 24. Dashboard económico mensual | Completo | Resumen real, cuatro indicadores, categorías y últimos cinco movimientos, precisión decimal, recarga y diseño responsive. | `9463478` |
| 25. Registro rápido de movimientos | Completo | Modal global, CreateTransaction reutilizado, categorías jerárquicas, importes, validación, notificación y confirmación de cuatro segundos. | `488c51e; d164e0b; 4cdb559` |
| 26. Informes de evolución mensual | Completo | GET /reports/evolution; vista de doce meses de ingresos, gastos y resultado, navegación y sincronización económica. | `afac3fc` |
| 27. Informes por categorías | Completo | Desglose mensual por tipo/categoría, importes, recuentos, proporciones exactas y filtros por mes. | `5c7b3f3` |
| 28. Consulta de recurrentes | Completo | GET /recurring; plantillas activas/inactivas, categorías, periodicidad, vigencia y navegación. | `08ba053` |
| 29. Creación de recurrentes | Completo | Signal Forms, fechas, día del mes, categorías jerárquicas, importes y validaciones; correcciones responsive en Movimientos y Miembros, Safari/iOS. | `6ffb21d a c7d2c8b` |
| 30. Activación y desactivación de recurrentes | Completo | POST /recurring/status; botones de estado, bloqueos de concurrencia, contexto, recarga y confirmaciones. | `122987a` |
| 31. Edición de recurrentes | Completo | POST /recurring/update; formulario precargado, esquema y mappers reutilizados; fechas móviles y aislamiento por contexto. | `880c21b; 145d8a1` |
| 32. Consulta de ocurrencias mensuales | Completo | GET /recurring/occurrences bajo demanda; mes, estado, paginación, instantáneas de importes y consulta cancelable. | `ba71b90` |
| 33. Generación de mensualidades | Completo | POST /recurring/generate-space; confirmación, contadores, resultados parciales, reintentos manuales y protección de concurrencia. | `44b9661` |
| 34. Confirmación y omisión de ocurrencias | Completo | POST /recurring/occurrences/resolve; confirmación explícita, 409, resultado irreversible, relación con transacción y pruebas. | `d5c447b` |
| 35. Sincronización económica de recurrentes | Completo | Invalidación mediante TransactionRefreshService al generar, confirmar u omitir; control de resultados inciertos y pruebas de previsión. | `b38a15b` |
| 36. Centralización de estilos de fecha | Completo | Mixin SCSS compartido para los controles nativos de Movimientos y formularios de recurrentes, conservando apariencia PrimeNG y correcciones Safari/iOS; tests y revisión visual. | `e4a9dc5` |

**Validaciones funcionales destacadas:** gestión real de espacios y membresías con dos cuentas A/B; permisos de propietarios y miembros; creación, edición y eliminación de movimientos; ciclo de vida de recurrentes y comprobaciones en dispositivos móviles reales. Las pruebas contables de confirmación de ocurrencias se realizan preferentemente en espacios de prueba.

## 6. Contrato REST relevante (ApiGastos v1.0.0)

**Base configurada:** `https://apigastos.osumi.es` (en `src/environments/environment.ts`), sin prefijo global `/api`. Las rutas privadas requieren JWT Bearer; el backend decide siempre los permisos.

La guía principal, contrastada con la implementación, es [`ApiGastos/docs/api/endpoints.md`](https://github.com/igorosabel/ApiGastos/blob/main/docs/api/endpoints.md) en `main`, con **33 endpoints**. La guía fue añadida después de la etiqueta v1.0.0, aunque documenta el contrato de esa versión.

| Dominio | Endpoints / métodos | Estado de integración en Gastos |
| --- | --- | --- |
| Autenticación | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Registro, login, sesión e identidad integrados. |
| Espacios | `GET /spaces`, `POST /spaces` | Listar/seleccionar y crear. |
| Invitaciones | `POST /spaces/invitations`, `GET /spaces/invitations`, `POST /spaces/invitations/revoke`, `POST /spaces/invitations/accept` | Crear/listar/revocar/aceptar. |
| Miembros | `GET /spaces/members`, `POST /spaces/members/leave`, `POST /spaces/members/remove` | Listar, abandonar, expulsar según permisos. |
| Categorías | `GET /categories`, `POST /categories`, `POST /categories/update`, `POST /categories/delete` | CRUD, jerarquía y dependencias. |
| Movimientos | `GET /transactions`, `POST /transactions`, `POST /transactions/update`, `POST /transactions/delete` | CRUD, filtros y paginación. |
| Plantillas recurrentes | `GET /recurring`, `POST /recurring`, `POST /recurring/update`, `POST /recurring/status` | Consulta, creación, edición y activación/desactivación. |
| Ocurrencias | `GET /recurring/occurrences`, `POST /recurring/generate-space`, `POST /recurring/occurrences/resolve` | Consulta, generación por espacio, confirmación y omisión. |
| Ocurrencia individual | `POST /recurring/generate` | Disponible en backend; **no forma parte del flujo principal actual del frontend**. |
| Informes | `GET /reports/monthly`, `GET /reports/monthly/categories`, `GET /reports/evolution`, `GET /reports/monthly/forecast`, `GET /reports/evolution/forecast` | Dashboard consume previsión mensual y categorías; Informes consume evolución real y categorías; otros endpoints disponibles en backend. |

### Reglas de negocio y decisiones importantes

- Un espacio contiene `id`, `name`, `type` (`personal`/`shared`), `owner_id` e `is_owner`. Los datos económicos y el acceso son siempre por espacio y membresía activa.
- Las invitaciones caducan a los siete días; el token de 64 caracteres hexadecimales solo se devuelve al crearlo. La API no manda correo automáticamente; el correo del destinatario debe coincidir con el del usuario que acepta. El listado no devuelve el token.
- `GET /spaces/members` no proporciona email; incluye identificador, nombre, fecha de unión y propietario. La API impide que un propietario abandone su espacio o sea expulsado.
- Los importes monetarios se reciben como **cadenas decimales** (`string`). No utilizar `float` para sumas de negocio. Las fechas `DATE` son fechas de calendario sin conversión automática de huso horario.
- La generación de mensualidades recurrentes es **explícita**, no programada. `POST /recurring/generate-space` considera plantillas inicialmente activas, es idempotente por plantilla/periodo pero **no atómico** para todo el lote. Un error puede dejar creaciones parciales; no reintentar automáticamente.
- `created`, `existing`, `skipped`, `total` en generación cuentan plantillas procesadas; el `skipped` de ese resultado **no** es lo mismo que el estado `skipped` de una ocurrencia omitida.
- `POST /recurring/occurrences/resolve` permite `confirm` o `skip` solo para pendientes. `confirm` crea **un movimiento contable real** y vincula `transaction_id`; `skip` no crea movimiento. Resolver una ya resuelta devuelve HTTP 409. No existen operaciones de deshacer por este contrato.
- Las plantillas inactivas conservan las ocurrencias existentes. Reactivarlas no regenera automáticamente periodos omitidos; la política A de ApiGastos permite solicitar generación explícita de periodos válidos de una pausa si aún no tienen ocurrencia.
- La previsión mensual **no crea ocurrencias**: `actual` agrega movimientos reales y `pending` solo ocurrencias pendientes ya generadas; `projected = actual + pending`. Confirmar u omitir elimina su contribución a `pending`, sin doble contabilización; generar puede aumentar la previsión.
- La aplicación notifica los cambios económicos para que otras pantallas vuelvan a consultar a ApiGastos. La notificación no inventa ni modifica cifras monetarias en el cliente.

**Fuentes de contrato adicional:** [`ApiGastos/docs/api/recurring.md`](https://github.com/igorosabel/ApiGastos/blob/main/docs/api/recurring.md) (idempotencia, vigencia y política A de reactivación) y [`ApiGastos/docs/api/reports.md`](https://github.com/igorosabel/ApiGastos/blob/main/docs/api/reports.md) (contabilidad real, pendientes y previsiones).

## 7. Punto exacto para reanudar: **después del bloque 36**

**Estado comprobado:** bloques 1 a 36 completados y publicados. Último commit en `main`: [`e4a9dc5`](https://github.com/igorosabel/Gastos/commit/e4a9dc5046e173a7914d2b34cc8ee8d1224a1aff). El usuario ha confirmado que las pruebas del bloque 36 pasan y que los controles de fecha se ven bien. **No hay actualmente un bloque 37 implementado ni validado.**

### Próxima decisión

El usuario ha planteado evitar el **zoom automático en móvil al enfocar campos**: en iPhone/Safari, al tocar un campo la página aumenta de tamaño y, después de enviar el formulario, el zoom a veces permanece. Como la interfaz se diseñó para el tamaño de móvil, el usuario prefiere no permitir zoom. Este requisito debe estudiarse antes de implementarse (véase apartado 11), con atención especial a accesibilidad y a las particularidades de iOS.

También está pendiente **persistir el último espacio seleccionado por usuario** entre aperturas y nuevos inicios de sesión. Requiere elegir conscientemente entre persistencia de backend y almacenamiento local, validar el aislamiento entre cuentas y comprobar espacios inaccesibles.

**Plan propuesto para reanudar:** decidir con el usuario cuál de las mejoras se convierte en el bloque 37. El zoom molesto al enfocar puede abordarse como intervención UX pequeña, pero no se debe dar por hecho que `user-scalable=no` es una solución segura o uniforme. No mezclar esa mejora con persistencia de preferencias. Preparar un único bloque con código concreto, pruebas y validación en Safari/iOS y Chrome/Windows; esperar la conformidad y commit antes del siguiente.

**No volver a plantear como pendientes**: navegación responsive (23), dashboard financiero (24), informes reales (26–27), circuito completo de recurrentes (28–35) ni estilos SCSS comunes de fecha (36).

## 8. Hoja de ruta posterior (provisional; no son bloques comprometidos)

1. **Experiencia de zoom en móvil:** investigar la causa del autozoom al enfocar controles y una solución fiable que mantenga el diseño. Comparar el tamaño de fuente efectivo de inputs (Safari suele hacer autozoom con tamaños pequeños), `viewport`, PrimeNG y accesibilidad. Comprobar si basta con evitar el autozoom de foco sin desactivar el zoom voluntario. Si se opta por limitar zoom globalmente, valorar consecuencias y soporte real en iOS.
2. **Persistencia del espacio seleccionado:** decidir almacenamiento local por usuario frente a preferencia de cuenta en ApiGastos; comportamiento de selección inicial, sesión, cambio de usuario, pérdida de membresía y recargas. Cualquier cambio de backend va en un bloque separado con su propio `AGENTS.md` y contrato.
3. **Pulido antes de primera versión funcional:** pruebas de extremo a extremo entre módulos (movimientos, previsiones, categorías, recurrentes, invitaciones), estados vacíos/error, responsive en iPhone y escritorio, revisión de accesibilidad y modo claro/oscuro.
4. **Documentación de usuario y mantenimiento:** actualizar `README.md` del frontend, actualmente todavía generado por Angular CLI 19 con referencias obsoletas a Karma; reflejar Angular 22, Vitest, variables/configuración y despliegue sin exponer secretos.
5. **Posibles extensiones futuras (solo tras decisión):** aprovechar `GET /reports/evolution/forecast`, generar una ocurrencia individual, notificaciones en tiempo real de cambios entre sesiones, automatización programada de recurrentes o gestión de preferencias de cuenta.

**Fuera del alcance sin acuerdo explícito:** refresh JWT inexistente en API, cambios no publicados en ApiGastos, transferencias de propiedad de espacios, eliminación completa de cuentas y modificaciones de Osumi Framework.

## 9. Limitaciones, precauciones y puntos a revisar

- **Fuente de verdad:** código publicado, `AGENTS.md`, contratos de ApiGastos y decisiones documentadas. La tabla de bloques es histórica; verificar siempre `HEAD` y archivos reales.
- **README desactualizado:** aún indica Angular CLI 19 y Karma; usar `package.json`, `angular.json` y `AGENTS.md` para versiones y comandos actuales.
- **Zoom en móvil:** pendiente; la petición es evitar un zoom automático persistente al enfocar controles, pero el bloqueo general puede perjudicar accesibilidad, ampliación voluntaria y comportamiento entre versiones de Safari. Evaluar primero el origen del problema y comprobar en iOS real.
- **Selección de espacio:** continúa sin persistirse entre sesiones/recargas completas; las membresías sí persisten en ApiGastos. No registrar IDs de espacio sin validarlos tras `GET /spaces` y contra el usuario actual.
- **Informes y ocurrencias:** nunca confundir importes reales y previstos, ni contar una ocurrencia confirmada además de su transacción real. No generar ocurrencias al consultar informes. No cambiar reglas temporales del backend desde Angular.
- **Concurrencia:** reintentos de `generate-space` son manuales y el lote puede ser parcialmente persistido. Cancelar una petición HTTP del navegador no implica detener la ejecución del backend. Mantener pruebas de doble envío, HTTP 409 y cambios de espacio o sesión.
- **Temas:** seguir revisando contraste y tokens semánticos de PrimeNG en claro/oscuro, especialmente componentes con colores de superficie fijos.
- **Sesiones múltiples:** no hay notificaciones push/tiempo real para la revocación de membresías u otros cambios hechos desde otra sesión; hay mecanismos de recarga y comprobación de permisos en backend.
- **Invitaciones y secretos:** no publicar JWT, tokens de invitación, licencia PrimeNG ni datos privados en código, logs o capturas. El token de invitación no puede recuperarse al listar invitaciones.
- **Pruebas:** los bloques 1–36 fueron validados por el usuario en su entorno. Al proponer un bloque nuevo no afirmar que su lint, tests, build o verificación real ya han pasado.
- **Versionado independiente:** ApiGastos se referencia en v1.0.0 y puede evolucionar; comprobar la versión real y las rutas/documentación antes de proponer un contrato nuevo.

## 10. Procedimiento recomendado para iniciar otra conversación

1. Compartir esta versión o indicar `docs/development/CONTINUIDAD_GASTOS.md` en el repositorio.
2. Leer **primero** `AGENTS.md` del frontend, comprobar último `HEAD`, los archivos actuales y `docs/design-responsive.md` si hay cambios visuales. No asumir que los árboles de directorios de este documento siguen idénticos.
3. Confirmar que **los bloques 1–36 están completos y validados**, último commit verificado `e4a9dc5` (centralización de estilos de fecha), y **el siguiente bloque está por decidir**. Verificar si existen commits posteriores.
4. Revisar el apartado 11; la incidencia de zoom de Safari/iOS y la persistencia del espacio son las mejoras funcionales pendientes. Elegir una sola por bloque y verificar su alcance antes de proponer código.
5. Si el bloque necesita un cambio del backend, consultar su propio `AGENTS.md`, repositorio, contratos y documentación; discutir primero la frontera entre frontend, ApiGastos y Osumi Framework. No mezclar desarrollo de Angular y OFW.
6. Proponer cambios incrementales con archivos exactos, tests unitarios/regresión y pruebas funcionales (especialmente Safari/iOS y Chrome/Windows). Esperar `npm run lint`, `npm run test`, `npm run build`, validación manual y commit/push del usuario.
7. Al empezar el siguiente bloque, proporcionar la fila con **Bloque, Estado, Alcance y Commit de referencia** del bloque recién cerrado. Mantener cabecera, punto de continuación, hoja de ruta, límites y mejoras pendientes al día.

### Texto breve para pegar en una nueva conversación

> Estamos desarrollando **Gastos**, frontend Angular 22/PrimeNG 22 con Signal Forms (`https://github.com/igorosabel/Gastos`) contra **ApiGastos v1.0.0** (`https://github.com/igorosabel/ApiGastos`). Primero lee `AGENTS.md`, `docs/development/CONTINUIDAD_GASTOS.md` y el código real, y comprueba el último commit. Los **bloques 1–36 están completados y validados**; el último commit verificado es `e4a9dc5`, centralización de estilos de fecha. El siguiente bloque aún está por decidir: está pendiente evitar el zoom automático molesto al enfocar campos en iPhone/Safari y recordar por usuario el espacio seleccionado. Debemos mantener accesibilidad, arquitectura, contratos y límites backend; desarrollar en bloques pequeños con tests, validación móvil/escritorio y commit antes de continuar.

## 11. Mejoras pendientes

| Mejora | Estado | Alcance / decisiones pendientes |
| --- | --- | --- |
| Evitar zoom automático persistente en móvil | **Pendiente (petición del usuario)** | En Safari/iOS, pulsar determinados campos provoca zoom de enfoque y, tras enviar, la pantalla puede permanecer ampliada. El usuario preferiría impedir el zoom en toda la aplicación porque el diseño móvil ya es legible. Revisar la configuración `viewport`, los tamaños de fuente reales de inputs y componentes PrimeNG y el soporte de iOS. Priorizar corregir el autozoom no deseado sin bloquear la ampliación voluntaria si es viable; antes de usar `user-scalable=no` o `maximum-scale=1`, valorar accesibilidad y límites de los navegadores. Validar en iPhone/Safari y Chrome/Windows, en formularios, selectores y tras enviarlos. No está implementado. |
| Persistencia del espacio seleccionado | **Pendiente (decisión de arquitectura)** | Recordar por usuario el último espacio contable utilizado y restaurarlo tras cerrar/reabrir Gastos, incluso después de un nuevo inicio de sesión. Comparar preferencia de backend con almacenamiento por usuario en navegador, posibles cambios REST y comportamiento al perder acceso al espacio. No persistir ni restaurar un `spaceId` sin contrastarlo con `GET /spaces`. |
| Centralización de estilos comunes para fechas | **Completa (bloque 36)** | Mixin `src/styles/_native-date-control.scss` reutilizado en filtros de Movimientos y formularios de creación/edición de recurrentes; mismo diseño PrimeNG y correcciones de WebKit validados en Safari/iOS y Chrome/Windows. Commit `e4a9dc5`. Se conserva aquí para documentar el cierre de la mejora anteriormente pendiente. |

---

**Regla final de continuidad:** la fuente de verdad es el código publicado, seguida por `AGENTS.md` y los contratos reales de la versión de ApiGastos utilizada. Este documento explica el contexto y las decisiones, pero no autoriza a ignorar cambios posteriores.
