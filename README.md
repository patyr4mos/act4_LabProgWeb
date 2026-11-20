# Explorador de países

Miniaplicación web que consume una API REST pública para mostrar información de países: bandera, capital, región, población y un detalle con idiomas, monedas y superficie. Proyecto de **Laboratorio de Programación Web (UANL FIME)**, Actividad 4.

- **URL pública:** https://TU-USUARIO.github.io/paises-api/ ← *reemplaza con tu URL de GitHub Pages*
- **Repositorio:** https://github.com/TU-USUARIO/paises-api ← *reemplaza con tu repositorio*

## API utilizada

**[REST Countries v3.1](https://restcountries.com)**: API pública, gratuita, de solo lectura y sin llave ni datos sensibles.

| Uso en la app | Método y endpoint |
|---|---|
| Lista de países | `GET https://restcountries.com/v3.1/all?fields=name,translations,cca3,capital,region,population,flags` |
| Detalle de un país | `GET https://restcountries.com/v3.1/alpha/{cca3}?fields=name,translations,flags,capital,region,subregion,population,area,languages,currencies` |

- **Parámetros:** `fields` es obligatorio en `/all` y admite como máximo 10 campos; por eso la lista y el detalle piden campos distintos.
- **Formato de respuesta:** JSON. La lista es un arreglo de objetos país; el detalle devuelve un arreglo con un objeto.
- **Códigos de respuesta considerados:** `200` correcto, `400` solicitud inválida, `404` sin resultados, `429` demasiadas solicitudes y `5xx` servicio no disponible.

## Funcionalidades

- Consumo con `fetch()` y `async/await`, con tiempo máximo de espera de 10 s (`AbortController`).
- Tarjetas creadas dinámicamente en el DOM con los datos de la respuesta JSON.
- **Interacción:** búsqueda por nombre (en español o inglés) o capital, filtro por región, ordenamiento (nombre/población), paginación de 12 países y ventana de detalle al seleccionar una tarjeta.
- **Estados:**
  - *Cargando*: indicador animado mientras responde la API.
  - *Resultado vacío*: mensaje y botón «Limpiar filtros».
  - *Error*: mensaje comprensible según el caso (sin conexión, tiempo agotado, límite de solicitudes, servicio caído o respuesta inválida) y botón «Reintentar».
- Los datos de la API se insertan con `textContent`, nunca como HTML.
- Diseño adaptable a móvil, navegación con teclado y modo oscuro automático.

## Estructura

```
paises-api/
├── index.html   estructura de la página
├── style.css    estilos
├── app.js       consumo de la API, lógica y construcción del DOM
├── README.md
└── docs/        capturas de pantalla
```

## Cómo usarla

1. Abre la URL pública, o descarga el repositorio y abre `index.html` en el navegador (requiere internet).
2. Escribe en el buscador, elige una región o cambia el orden.
3. Pulsa una tarjeta para ver el detalle y cierra con la × o con `Esc`.

## Despliegue en GitHub Pages

1. Sube el proyecto a un repositorio público de GitHub.
2. En **Settings → Pages**, elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`.
3. Espera un minuto y abre `https://TU-USUARIO.github.io/paises-api/`.

## Capturas

| Lista de países | Búsqueda y filtros |
|---|---|
| ![Lista](docs/captura-lista.png) | ![Búsqueda](docs/captura-busqueda.png) |
| **Detalle de un país** | **Estados de carga, vacío y error** |
| ![Detalle](docs/captura-detalle.png) | ![Estados](docs/captura-estados.png) |

*(Agrega tus capturas en la carpeta `docs/` con esos nombres.)*

## Reflexión técnica

La parte que más pesó fue manejar bien los fallos. `fetch()` solo rechaza la promesa ante errores de red, así que un `404` o un `500` no lanzan excepción por sí solos; por eso la función `fetchJSON` revisa `res.ok` y convierte cada caso en un error con mensaje claro para el usuario. También descubrí que `/all` exige el parámetro `fields` con un máximo de 10 campos, lo que me llevó a separar la consulta de la lista (pocos campos) de la del detalle (más campos).

Descargar la lista una sola vez y filtrar, ordenar y paginar en el navegador hace la búsqueda inmediata y evita saturar una API gratuita. Como contrapartida, la primera carga es un poco más pesada. Si el proyecto creciera, usaría caché local y los endpoints de búsqueda de la API.

## Créditos

Datos: [REST Countries](https://restcountries.com) (licencia MPL 2.0). Banderas incluidas en la propia API.
