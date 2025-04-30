# Sistema de Gestión de Tareas de Equipo

Esta aplicación web permite gestionar tareas de equipo de manera eficiente, con dos opciones de almacenamiento persistente en el navegador: localStorage (versión original) o SQLite (nueva versión).

## Características

- **Gestión de tareas principales y subtareas**: Organiza tu trabajo en tareas principales y subtareas relacionadas.
- **Asignación de empleados**: Asigna tareas a miembros específicos del equipo.
- **Seguimiento de progreso**: Visualiza el porcentaje de avance de cada tarea.
- **Fechas límite**: Establece y monitorea fechas de entrega.
- **Prioridades**: Clasifica tareas por nivel de importancia (alta, media, baja).
- **Filtros y ordenación**: Filtra tareas por empleado o estado, y ordénalas según diferentes criterios.
- **Estadísticas**: Visualiza el progreso general del equipo.
- **Almacenamiento persistente**: Todos los datos se guardan automáticamente en el navegador.

## Cómo usar la aplicación

### Gestión de empleados

1. Haz clic en "Añadir Empleado" para registrar a los miembros del equipo.
2. Completa el formulario con nombre, cargo y email del empleado.

### Gestión de tareas

1. Haz clic en "Nueva Tarea" para crear una tarea principal.
2. Completa el formulario con título, descripción, fecha límite, prioridad, asignación y progreso.
3. Para añadir subtareas, selecciona una tarea principal y haz clic en "Subtareas" y luego en "Añadir Subtarea".

### Seguimiento y actualización

1. Edita tareas existentes haciendo clic en el botón "Editar".
2. Actualiza el progreso moviendo el control deslizante de porcentaje.
3. Elimina tareas con el botón "Eliminar" (esto también eliminará todas sus subtareas).

### Filtros y visualización

1. Utiliza los filtros en la parte superior para mostrar tareas específicas:
   - Filtrar por empleado asignado
   - Filtrar por estado (pendiente, en progreso, completada)
   - Ordenar por fecha, prioridad o progreso

## Notas técnicas

- La aplicación utiliza HTML, CSS y JavaScript puro, sin dependencias npm.
- Versión original: Los datos se almacenan en el localStorage del navegador.
- Nueva versión SQLite: Los datos se almacenan en una base de datos SQLite en el navegador mediante SQL.js (compilado a WebAssembly).
- Permite exportar e importar la base de datos como archivo.
- No requiere conexión a internet una vez cargada la página.
- Compatible con todos los navegadores modernos.

## Inicio rápido

- Versión con localStorage: Abre el archivo `index.html` en tu navegador.
- Versión con SQLite: Abre el archivo `index-sqlite.html` en tu navegador.

## Ventajas de la versión SQLite

- Almacenamiento más robusto y estructurado con una base de datos real.
- Posibilidad de exportar e importar la base de datos completa como archivo.
- Mejor rendimiento con grandes volúmenes de datos.
- Consultas SQL optimizadas para filtrado y ordenación.
- Mantiene todas las funcionalidades de la versión original.