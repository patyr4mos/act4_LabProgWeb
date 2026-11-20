# Explorador de Pokémon

Miniaplicación web que consume una API REST pública para mostrar Pokémon: ilustración, número, nombre y un detalle con tipos, altura, peso, habilidades y estadísticas base. Proyecto de **Laboratorio de Programación Web (UANL FIME)**, Actividad 4.

- **URL pública:** https://patyr4mos.github.io/act4_LabProgWeb/
- **Repositorio:** https://github.com/patyr4mos/act4_LabProgWeb

## API utilizada

**[PokéAPI v2](https://pokeapi.co)**: API pública, gratuita y de solo lectura (solo método GET). No requiere llave ni cuenta y no maneja datos sensibles.

| Uso en la app | Método y endpoint |
|---|---|
| Lista de Pokémon | `GET https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0` |
| Filtro por tipo | `GET https://pokeapi.co/api/v2/type/{tipo}` |
| Detalle de un Pokémon | `GET https://pokeapi.co/api/v2/pokemon/{id}` |

- **Parámetros:** la lista admite `limit` (cuántos recursos devolver) y `offset` (cuántos saltar); son los únicos parámetros de consulta permitidos por la API.
- **Formato de respuesta:** JSON. La lista devuelve `{ count, next, previous, results: [{ name, url }] }`; el detalle devuelve un objeto con `id`, `types`, `height`, `weight`, `abilities` y `stats`; el tipo devuelve su arreglo `pokemon`.
- **Códigos de respuesta considerados:** `200` correcto, `404` recurso inexistente, `429` demasiadas solicitudes y `5xx` servicio no disponible.
- **Uso responsable:** la política de uso justo de PokéAPI pide no repetir peticiones; la lista se guarda en `sessionStorage` y los resultados por tipo se guardan en memoria.

## Funcionalidades

- Consumo con `fetch()` y `async/await`, con tiempo máximo de espera de 10 s (`AbortController`).
- Tarjetas creadas dinámicamente en el DOM con los datos del JSON.
- **Interacción:** búsqueda por nombre o número, filtro por tipo (consulta al endpoint `/type`), ordenamiento por número o nombre, paginación de 12 y ventana de detalle al seleccionar una tarjeta.
- **Estados:**
  - *Cargando*: indicador animado mientras responde la API.
  - *Resultado vacío*: mensaje y botón «Limpiar filtros».
  - *Error*: mensaje comprensible según el caso (sin conexión, tiempo agotado, límite de solicitudes, servicio caído o respuesta inválida) y botón «Reintentar».
- Los datos de la API se insertan con `textContent`, nunca como HTML.
- Diseño adaptable a móvil, navegación con teclado y modo oscuro automático.

## Estructura

```
act4_LabProgWeb/
├── index.html   estructura de la página
├── style.css    estilos
├── app.js       consumo de la API, lógica y construcción del DOM
├── README.md
└── docs/        capturas de pantalla
```

## Cómo usarla

1. Abre la URL pública, o descarga el repositorio y abre `index.html` en el navegador (requiere internet).
2. Escribe en el buscador, elige un tipo o cambia el orden.
3. Pulsa una tarjeta para ver el detalle y cierra con la × o con `Esc`.

## Despliegue en GitHub Pages

1. Sube el proyecto a un repositorio público de GitHub.
2. En **Settings → Pages**, elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`.
3. Espera un minuto y abre la URL pública.

## Capturas

| Lista | Búsqueda |
|---|---|
| ![Lista](docs/captura-lista.png) | ![Búsqueda](docs/captura-busqueda.png) |
| **Filtro por tipo** | **Detalle** |
| ![Filtro](docs/captura-filtro.png) | ![Detalle](docs/captura-detalle.png) |

*(Agrega tus capturas en la carpeta `docs/` con esos nombres.)*

## Reflexión técnica

La primera versión del proyecto usaba REST Countries v3.1, y al publicarla dejó de funcionar: la API había sido retirada y respondía pidiendo migrar a una versión nueva que exige llave de acceso. Una llave dentro del código de una página pública queda expuesta a cualquiera, así que cambié a PokéAPI, que no requiere autenticación. Aprendí que una API externa puede cambiar o desaparecer, y que conviene revisar su documentación y su política de uso antes de construir sobre ella.

También aprendí que `fetch()` solo rechaza la promesa ante errores de red, así que un `404` o un `500` no lanzan excepción por sí solos. Por eso `fetchJSON` revisa `res.ok` y convierte cada caso en un error con mensaje claro. Descargar la lista una sola vez y filtrar, ordenar y paginar en el navegador hace la búsqueda inmediata y respeta la política de uso justo; el filtro por tipo sí consulta la API y guarda el resultado para no repetirlo.

## Créditos

Datos: [PokéAPI](https://pokeapi.co). Las ilustraciones se sirven desde el repositorio de sprites de PokéAPI en GitHub. Pokémon y sus nombres son marcas de sus respectivos dueños; el proyecto es solo educativo.
