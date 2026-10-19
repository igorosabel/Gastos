# Diseño responsive de Gastos

## Principio general

Gastos es una aplicación mobile-first con una interfaz
específica para ordenador.

La versión de escritorio no consiste en ampliar
proporcionalmente la versión móvil: utiliza una
distribución y navegación adaptadas.

## Navegación móvil

- Barra inferior fija.
- Inicio.
- Movimientos.
- Acción central destacada para añadir un gasto.
- Informes.
- Ajustes.

El botón central debe permitir registrar un movimiento
rápidamente desde cualquier pantalla.

La barra respeta las áreas seguras del dispositivo y
no oculta el contenido.

## Navegación de escritorio

- Menú lateral persistente.
- Inicio.
- Movimientos.
- Informes.
- Categorías.
- Ajustes.
- Acción destacada para añadir un gasto.

Cuando exista el módulo de recurrentes, podrá disponer
de un acceso lateral específico.

## Cabecera

El selector de espacio contable está siempre en la
parte superior del área de trabajo.

La selección determina los datos visibles en todas
las secciones económicas.

## Inicio

La pantalla de inicio es un dashboard económico,
no una pantalla de administración.

Debe contener:

1. Selector/contexto del espacio activo.
2. Mes del resumen.
3. Tarjetas de ingresos, gastos, resultado y previsión.
4. Distribución del gasto por categorías.
5. Últimos movimientos.

En móvil:

- Dos tarjetas económicas por fila.
- Categorías y movimientos en disposición vertical.

En escritorio:

- Cuatro tarjetas económicas en una fila cuando
  haya espacio suficiente.
- Categorías y últimos movimientos en dos columnas.

No mostrar valores económicos inventados.

## Movimientos

Mantener la consulta, filtros, paginación, creación,
edición y eliminación ya implementados.

Adaptar filtros y controles a los dos tamaños de pantalla.

## Informes

Apartado dedicado a análisis económicos,
separado de la pantalla de inicio.

## Ajustes

Contiene:

- Gestión de espacios.
- Invitaciones y miembros.
- Gestión de categorías.
- Preferencias y modo oscuro.

## Reglas de desarrollo

- Validar las interfaces en móvil y escritorio.
- Mantener Angular 22 y PrimeNG 22.
- Respetar AGENTS.md.
- Reutilizar las funcionalidades existentes.
- No sustituir modelos, servicios ni APIs sin necesidad.
- Cada bloque incluye tests, lint, build y
  verificación visual.
- No continuar con nuevas funcionalidades económicas
  hasta recuperar el diseño principal.

## Fases de recuperación

23. Layout responsive, navegación y organización.
24. Dashboard mensual con datos reales.
25. Registro rápido mediante la acción central.
26. Informes y ajustes visuales posteriores.

La numeración posterior puede ajustarse a los
resultados de cada bloque.
