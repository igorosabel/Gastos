# AGENTS.md — Gastos Angular

## Proyecto

Frontend de Gastos.

- Angular 22.
- PrimeNG 22.
- TypeScript estricto.
- Vitest.
- Diseño mobile-first y responsive.
- Backend: ApiGastos v1.0.0.

Repositorio backend:
https://github.com/igorosabel/ApiGastos

## Fuentes de referencia

Antes de proponer cambios:

1. Leer este archivo.
2. Consultar el código real del repositorio.
3. Consultar el contrato de ApiGastos.
4. Revisar las decisiones arquitectónicas existentes.
5. No asumir que el frontend conserva estructuras
   de versiones anteriores.

El contrato de la API está documentado en:
https://github.com/igorosabel/ApiGastos/blob/main/docs/api/endpoints.md

No inventar endpoints, parámetros ni respuestas.

## Arquitectura Angular

- Utilizar componentes standalone.
- No declarar standalone: true explícitamente.
- Preferir signals para el estado.
- Utilizar computed para estado derivado.
- Utilizar input() y output().
- Utilizar ChangeDetectionStrategy.OnPush (no es
  necesario indicarlo explicitamente ya que es el por defecto
  de Angular 22).
- Preferir inject() a inyección por constructor.
- Utilizar @if, @for y @switch.
- Aplicar lazy loading a las rutas funcionales.
- Evitar dependencias adicionales innecesarias.
- Mantener responsabilidades separadas entre
  componentes, servicios y estado.

### Servicios e inyección de dependencias

- Utilizar el decorador `@Service()` de Angular 22
  para los servicios propios de la aplicación.
- Utilizar `inject()` para obtener dependencias.
- No utilizar inyección mediante parámetros
  del constructor en servicios.
- Los servicios decorados con `@Service()`
  se registran automáticamente en el inyector raíz.
- No registrarlos de nuevo en `app.config.ts`
  ni en `provideCore()`.
- Reservar `provideCore()` para proveedores externos
  que necesiten registro manual.
- No registrar globalmente servicios cuyo ámbito
  deba limitarse a una ruta o componente.
- Utilizar `@Service({ autoProvided: false })`
  cuando un servicio propio requiera provisión manual.

## Convenciones obligatorias de código

### Organización de archivos

- Cada archivo debe tener una responsabilidad clara y
  pertenecer a un único dominio.
- No agrupar clases, interfaces o responsabilidades
  diferentes en un mismo archivo sin una razón justificada.
- Cada componente Angular debe tener tres archivos
  independientes:
  - `nombre.ts`: lógica y declaración del componente.
  - `nombre.html`: plantilla HTML.
  - `nombre.scss`: estilos del componente.
- No utilizar templates ni estilos inline en los
  decoradores `@Component`.
- Utilizar siempre `templateUrl` y `styleUrl`.
- Respetar los directorios existentes del proyecto.
- Los guards se ubican en `src/app/guard/`.
- Los interceptores se ubican en `src/app/interceptors/`.
- Las interfaces compartidas se ubican en
  `src/app/interfaces/`.
- No crear estructuras paralelas cuando ya exista
  un directorio dedicado a esa responsabilidad.

### Exportaciones

- Si un archivo exporta una sola clase, interfaz,
  función, constante u otro elemento, utilizar
  siempre `export default`.
- Si un archivo exporta varios elementos, utilizar
  exportaciones con nombre para todos ellos.
- No mezclar `export default` con exportaciones
  con nombre dentro del mismo archivo.
- Evitar declarar interfaces privadas dentro de
  archivos dedicados a clases, componentes o servicios.
- Extraer esas interfaces a archivos independientes.
- Una interfaz ubicada en su propio archivo debe
  utilizar `export default` cuando sea su única exportación.

### Imports y aliases

- Utilizar siempre rutas absolutas mediante los
  aliases configurados en `tsconfig.json`.
- No utilizar imports relativos como `./` o `../`.
- Elegir siempre el alias más específico disponible.
- Respetar los aliases existentes antes de crear otros.
- Aplicar estas reglas tanto al código de producción
  como a los tests.
- Las rutas de `templateUrl` y `styleUrl` son
  referencias a recursos, no imports TypeScript,
  y deben apuntar a sus archivos correspondientes.

### Orden de imports y formato

- No imponer un orden manual para los imports.
- El proyecto utiliza Prettier desde Visual Studio Code.
- Prettier organiza los imports y elimina los que
  no se utilizan.
- No indicar posiciones concretas para añadir imports.
- Al proponer un cambio, basta con indicar qué
  imports deben añadirse o eliminarse.
- Mantener el formato generado por las herramientas
  configuradas en el proyecto.

### Tipado TypeScript

- Utilizar tipado estricto en todo el proyecto.
- Declarar explícitamente el tipo de las variables
  incluso cuando TypeScript pueda inferirlo.
- Declarar explícitamente los tipos de las
  propiedades de clase.
- Declarar explícitamente los tipos de parámetros
  y retornos de funciones y métodos.
- Preferir interfaces y tipos específicos.
- No utilizar `any`.
- Utilizar `unknown` cuando el valor todavía no
  tenga un tipo conocido y validarlo antes de usarlo.
- Evitar tipos innecesariamente amplios cuando
  exista un contrato específico.

Ejemplo:

```typescript
const activo: boolean = true;
const nombre: string = 'Gastos';
const cantidad: number = 10;
const elementos: string[] = [];
```

### Componentes Angular

- Utilizar componentes standalone.
- No declarar `standalone: true` explícitamente.
- Utilizar ChangeDetectionStrategy.OnPush (no es
  necesario indicarlo explicitamente ya que es el por defecto
  de Angular 22).
- Separar siempre lógica, plantilla y estilos.
- Evitar lógica de negocio en las plantillas.
- Mantener los componentes pequeños y enfocados.
- Utilizar los mecanismos actuales de Angular 22.

### Compatibilidad y APIs obsoletas

- No utilizar componentes, métodos, directivas
  o propiedades marcados como deprecated.
- Consultar la documentación de la versión
  instalada antes de utilizar una API desconocida.
- En PrimeNG 22, preferir la directiva `pButton`
  sobre el componente obsoleto `p-button`.
- No introducir soluciones basadas en versiones
  anteriores de Angular o PrimeNG.

### Formularios Angular

- Utilizar Signal Forms de Angular 22 como sistema
  principal para implementar formularios.
- Utilizar las APIs de `@angular/forms/signals`,
  incluyendo `form()`, `FormField` y las funciones
  de validación correspondientes.
- Utilizar signals para almacenar y gestionar
  los modelos de los formularios.
- Preferir `[formField]` para enlazar los campos
  con sus controles visuales.
- Gestionar las validaciones, los errores y el
  estado del formulario mediante Signal Forms.
- Para controles sencillos y aislados, como un
  único campo, se permite utilizar Template Forms
  con `ngModel` directamente.
- No utilizar Reactive Forms en ningún caso.
- No utilizar `FormGroup`, `FormControl`,
  `FormBuilder` ni `ReactiveFormsModule`.
- No incorporar patrones propios de Reactive Forms
  en nuevos componentes.
- Al utilizar componentes de PrimeNG, comprobar
  su compatibilidad con Signal Forms y emplear
  las APIs actuales de Angular 22.
- Mantener siempre separados los archivos
  TypeScript, HTML y SCSS de los componentes.
- Mantener el tipado explícito también en los
  modelos y estados de los formularios.

#### Organización de formularios

- Seguir el patrón de formularios de Osumi TPV Client (https://github.com/osumionline/Osumi-TPV-Client).
- Ubicar los modelos de formulario en
  `src/app/model/<dominio>/`.
- Separar las responsabilidades en archivos
  independientes:
  - `<nombre>-form.model.ts`: interfaz del formulario.
  - `<nombre>-form.schema.ts`: restricciones y
    validaciones de Signal Forms.
  - `<nombre>-form.initial-value.ts`: función que
    devuelve el valor inicial del formulario.
  - `<nombre>-form.mapper.ts`: transformación
    entre el formulario y otros modelos o contratos.
- Crear mappers adicionales de entrada o salida
  cuando las transformaciones sean distintas.
- No crear mappers sin una transformación real.
- Las funciones exportadas individualmente deben
  utilizar `export default`.
- Los componentes deben importar los modelos,
  esquemas y funciones mediante aliases.
- Los componentes no deben declarar las reglas
  de validación dentro de `form()`.
- Los componentes deben concentrarse en la
  interacción, el estado de presentación y la
  coordinación de servicios.

#### Estado de los controles

- Cuando un elemento utilice `[formField]`,
  no establecer mediante bindings independientes
  las propiedades que controla Signal Forms,
  como `invalid`, `disabled` o `readonly`.
- Definir las restricciones de los campos en
  su archivo `*.schema.ts`.
- Utilizar las funciones de Signal Forms para
  gestionar los estados que correspondan.
- Consultar `touched()`, `invalid()` y `errors()`
  para mostrar mensajes de validación.
- No duplicar el estado de validación de un campo
  mediante variables independientes.
- El estado de envío del formulario puede
  gestionarse con las herramientas de Signal Forms.
- No utilizar Reactive Forms.

## PrimeNG

- Mantener PrimeNG 22.
- Mantener el preset gastos-preset.
- Conservar la traducción española.
- Conservar el selector de modo oscuro.
- No incluir claves de licencia en Git.
- Diseñar primero para móvil y adaptar a escritorio.

## Contrato con ApiGastos

- Todas las rutas REST tienen su prefijo real.
- No existe el prefijo global /api.
- Autenticación mediante JWT Bearer.
- El JWT caduca según expires_at, en segundos Unix.
- No existen endpoints de refresh ni logout.
- El logout del frontend limpia la sesión local.
- Nunca enviar JWT a dominios externos.
- Los importes monetarios se reciben como string.
- Evitar cálculos monetarios mediante number/float.
- Las fechas contables no incluyen zona horaria.
- CORS abierto no sustituye la autorización.

## Espacios

El espacio seleccionado determina los datos activos.

Categorías, movimientos, recurrentes e informes
pertenecen siempre a un espacio.

La API valida la autorización real.

No establecer permisos únicamente desde Angular.

## Desarrollo

Trabajar incrementalmente:

1. Analizar el código actual.
2. Proponer un bloque pequeño y verificable.
3. Incluir las pruebas relacionadas.
4. Ejecutar lint, tests y build.
5. Verificar manualmente la funcionalidad.
6. Esperar la validación y el commit antes de continuar.

No modificar ApiGastos ni Osumi Framework para
resolver problemas del frontend sin analizar
primero dónde corresponde realizar el cambio.
