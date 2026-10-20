# Gastos

Aplicación web para la gestión de ingresos y gastos personales y compartidos.

Gastos permite organizar la contabilidad mediante **espacios**. Cada usuario dispone de un espacio personal y puede crear o participar en espacios compartidos con otras personas.

El frontend está desarrollado con Angular y se comunica con [ApiGastos](https://github.com/igorosabel/ApiGastos), un backend independiente basado en Osumi Framework.

## Funcionalidades

- Autenticación de usuarios mediante JWT.
- Espacios personales y compartidos.
- Invitaciones y gestión de miembros.
- Categorías jerárquicas de ingresos y gastos.
- Registro, consulta, edición y eliminación de movimientos.
- Filtros y paginación de movimientos.
- Registro rápido desde la navegación principal.
- Plantillas de movimientos recurrentes.
- Generación mensual y confirmación u omisión de ocurrencias.
- Dashboard económico mensual con datos reales y previsiones.
- Informes de evolución y análisis por categorías.
- Interfaz responsive para móvil y escritorio.
- Preferencia de espacio seleccionado por usuario.

Las ocurrencias recurrentes se generan explícitamente. No existe una tarea programada de generación automática.

## Tecnologías

| Tecnología           | Uso                                  |
| -------------------- | ------------------------------------ |
| Angular 22           | Framework del frontend               |
| TypeScript 6         | Lenguaje, con configuración estricta |
| PrimeNG 22           | Componentes visuales                 |
| PrimeIcons           | Iconografía                          |
| SCSS                 | Estilos                              |
| Angular Signal Forms | Formularios                          |
| RxJS                 | Comunicación asíncrona               |
| Vitest               | Pruebas automatizadas                |
| Angular ESLint       | Análisis estático                    |

La aplicación utiliza componentes standalone, signals y carga diferida de las páginas funcionales.

## Requisitos

Para desarrollar Gastos se recomienda utilizar:

- Node.js 24.
- npm 12.2.0.
- Una licencia válida de PrimeNG.

El proyecto declara la versión de npm en `package.json`.

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/igorosabel/Gastos.git
cd Gastos
```

Instalar las dependencias:

```bash
npm ci
```

### Licencia de PrimeNG

La aplicación utiliza un archivo local de licencia que no se incluye en el repositorio.

Crear `src/environments/license.ts` a partir de:

```text
src/environments/license.example.ts
```

En PowerShell:

```powershell
Copy-Item src/environments/license.example.ts src/environments/license.ts
```

En Linux o macOS:

```bash
cp src/environments/license.example.ts src/environments/license.ts
```

Sustituir el valor de ejemplo por la licencia válida correspondiente.

**No subir `src/environments/license.ts` al repositorio.** El archivo está excluido mediante `.gitignore`.

### Configuración de ApiGastos

La URL del backend se configura en:

```text
src/environments/environment.ts
```

Actualmente apunta a:

```text
https://apigastos.osumi.es
```

No existe una configuración alternativa de desarrollo en el repositorio.

Por tanto, antes de realizar pruebas manuales que creen o modifiquen datos, comprobar que se está utilizando el backend y el espacio contable deseados.

## Ejecución en desarrollo

Iniciar el servidor:

```bash
npm start
```

Abrir:

```text
http://localhost:4200/
```

Angular recargará la aplicación cuando se modifiquen los archivos del proyecto.

## Comandos disponibles

| Comando         | Descripción                                          |
| --------------- | ---------------------------------------------------- |
| `npm start`     | Inicia el servidor de desarrollo                     |
| `npm run build` | Compila la aplicación                                |
| `npm run watch` | Compilación de desarrollo con observación de cambios |
| `npm run lint`  | Ejecuta Angular ESLint                               |
| `npm run test`  | Ejecuta los tests con Vitest                         |

### Verificación antes de un commit

Ejecutar:

```bash
npm run lint
npm run test
npm run build
```

Además de estas comprobaciones, los cambios funcionales deben probarse manualmente en la aplicación.

Las modificaciones visuales deben revisarse en móvil y escritorio.

### Aislamiento de tests

Las pruebas utilizan el builder de tests de Angular con Vitest.

El archivo:

```text
src/test-setup.ts
```

contiene una preparación global que elimina las preferencias persistentes de espacio antes de cada test.

Esto evita que una selección guardada en `localStorage` afecte a pruebas posteriores.

Las pruebas de persistencia de `SpaceStore` pueden guardar y recuperar preferencias dentro de un mismo test.

## Arquitectura

La aplicación distingue entre autenticación, estado de espacios, servicios HTTP, modelos, contratos y componentes de interfaz.

Las rutas funcionales están definidas en:

```text
src/app/app.routes.ts
```

La navegación privada compartida está implementada en:

```text
src/app/layout/private-layout/
```

Las páginas principales se encuentran en:

```text
src/app/modules/pages/
```

Incluyen Inicio, Movimientos, Informes, Categorías, Recurrentes y Ajustes.

Los servicios de acceso a la API están en:

```text
src/app/services/
```

Los modelos y formularios se encuentran en:

```text
src/app/model/
```

Los contratos de las peticiones y respuestas REST están en:

```text
src/app/interfaces/
```

El estado de autenticación y el de selección de espacios se gestionan mediante `AuthStore` y `SpaceStore`.

### Formularios

Los formularios principales utilizan Angular Signal Forms.

Por convención, los modelos editables, valores iniciales, esquemas de validación y mappers se mantienen separados en archivos del dominio correspondiente.

Cada componente Angular utiliza archivos TypeScript, HTML y SCSS independientes.

Las reglas detalladas de arquitectura y desarrollo se encuentran en [AGENTS.md](AGENTS.md).

## Autenticación y espacios

ApiGastos utiliza autenticación JWT mediante cabecera Bearer.

La sesión se conserva localmente mediante `sessionStorage`, mientras que la preferencia del último espacio seleccionado se guarda en `localStorage`, separada por identificador de usuario.

Una preferencia almacenada nunca concede acceso por sí misma: el espacio debe seguir figurando entre los autorizados por `GET /spaces`.

La autorización real de las operaciones corresponde siempre a ApiGastos.

## Backend

El frontend utiliza **ApiGastos v1.0.0** como contrato de referencia.

Repositorio:

https://github.com/igorosabel/ApiGastos

Documentación principal del contrato REST:

https://github.com/igorosabel/ApiGastos/blob/main/docs/api/endpoints.md

Documentación de recurrentes:

https://github.com/igorosabel/ApiGastos/blob/main/docs/api/recurring.md

Documentación de informes:

https://github.com/igorosabel/ApiGastos/blob/main/docs/api/reports.md

Los importes monetarios se transportan como cadenas decimales. No deben realizarse cálculos económicos indiscriminadamente mediante tipos de coma flotante de JavaScript.

Las fechas contables no incorporan zona horaria.

El backend y el frontend se desarrollan y versionan de forma independiente.

## Despliegue

El repositorio incluye un workflow de GitHub Actions:

```text
.github/workflows/deploy-angular.yml
```

Se ejecuta automáticamente con los cambios enviados a la rama `main` y también permite su ejecución manual.

El proceso:

1. Prepara Node.js 24.
2. Instala dependencias con `npm ci`.
3. Genera el archivo de licencia de PrimeNG usando un secreto de GitHub Actions.
4. Compila la aplicación en producción.
5. Verifica la existencia del `index.html` generado.
6. Publica los archivos mediante SCP en el servidor Plesk.

Los archivos publicados proceden de:

```text
dist/browser/
```

### Secretos de GitHub Actions

El workflow requiere los siguientes secretos configurados en el repositorio:

| Secreto             | Finalidad                        |
| ------------------- | -------------------------------- |
| `PRIMENG_LICENSE`   | Licencia de PrimeNG              |
| `SSH_HOST`          | Servidor de destino              |
| `SSH_USER`          | Usuario SSH                      |
| `SSH_KEY`           | Clave privada SSH                |
| `REMOTE_PUBLIC_DIR` | Directorio remoto de publicación |

No incluir sus valores en código, documentación ni commits.

## Documentación de desarrollo

| Documento                                                                        | Contenido                                                 |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                                           | Reglas y convenciones obligatorias                        |
| [docs/design-responsive.md](docs/design-responsive.md)                           | Diseño responsive y decisiones de navegación              |
| [docs/development/CONTINUIDAD_GASTOS.md](docs/development/CONTINUIDAD_GASTOS.md) | Historial de bloques, arquitectura y estado de desarrollo |

Antes de introducir cambios, consultar `AGENTS.md`, revisar los archivos actuales del repositorio y comprobar los contratos de ApiGastos.

El desarrollo sigue bloques incrementales con pruebas, comprobaciones funcionales y validación antes de cada nuevo bloque.
