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
https://github.com/igorosabel/ApiGastos/blob/v1.0.0/docs/api/endpoints.md

No inventar endpoints, parámetros ni respuestas.

## Arquitectura Angular

- Utilizar componentes standalone.
- No declarar standalone: true explícitamente.
- Preferir signals para el estado.
- Utilizar computed para estado derivado.
- Utilizar input() y output().
- Utilizar ChangeDetectionStrategy.OnPush.
- Utilizar formularios reactivos.
- Preferir inject() a inyección por constructor.
- Utilizar @if, @for y @switch.
- Aplicar lazy loading a las rutas funcionales.
- Evitar dependencias adicionales innecesarias.
- Mantener responsabilidades separadas entre
  componentes, servicios y estado.

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
