# DropTheId

DropTheId es una aplicación web que permite identificar música de videos utilizando la tecnología de reconocimiento musical de Shazam.

## Estructura del Proyecto

```
shazam/
├── shazam.py                 # Script Python para reconocimiento musical
└── shazam-web/              # Aplicación web
    ├── index.html           # Página principal
    ├── server.js            # Servidor Express
    ├── style.css           # Estilos globales
    ├── images/             # Imágenes y logos
    ├── js/                 # Scripts JavaScript
    │   ├── app.js         # Lógica principal
    │   ├── home.js        # Vista Home
    │   ├── search.js      # Vista Search
    │   ├── history.js     # Vista History
    │   └── settings.js    # Vista Settings
    ├── styles/            # Estilos específicos por vista
    │   ├── home.css
    │   ├── search.css
    │   ├── history.css
    │   └── settings.css
    └── views/             # Archivos HTML por vista
        ├── home.html
        ├── search.html
        ├── history.html
        └── settings.html
```

## Requisitos Previos

- Node.js
- Python 3.x
- FFmpeg (para la conversión de video a audio)
- Dependencias de Python:
  - shazamio
  - asyncio

## Dependencias

### Backend (Node.js)
- express: ^4.18.2
- formidable: ^3.5.2

## Instalación

1. Clonar el repositorio
2. Instalar dependencias de Node.js:
```bash
cd shazam-web
npm install
```

3. Instalar dependencias de Python:
```bash
pip install shazamio
```

4. Asegurarse de tener FFmpeg instalado en el sistema

## Uso

1. Iniciar el servidor:
```bash
cd shazam-web
npm start
```

2. Abrir el navegador y visitar `http://localhost:3000`

## Funcionalidades

- **Identificación de Música**: Sube un video y la aplicación identificará la música que contiene
- **Interfaz Moderna**: Diseño responsive con navegación intuitiva
- **Múltiples Vistas**:
  - Home: Página principal
  - Search: Búsqueda y subida de videos
  - History: Historial de búsquedas
  - Settings: Configuración de la aplicación

## Cómo Funciona

1. El usuario sube un video a través de la interfaz web
2. El servidor Node.js recibe el archivo y lo pasa al script Python
3. El script Python:
   - Convierte el video a audio usando FFmpeg
   - Utiliza la API de Shazam para identificar la música
   - Retorna la información de la canción (título, artista, URL, portada)
4. La interfaz web muestra los resultados al usuario

## Tecnologías Utilizadas

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js con Express
- **Reconocimiento Musical**: Python con ShazamIO
- **Procesamiento de Media**: FFmpeg

## Notas Adicionales

- La aplicación requiere una conexión a internet para el reconocimiento musical
- Se recomienda usar videos con buena calidad de audio para mejores resultados
- Los archivos temporales (audio convertido) se eliminan automáticamente después del procesamiento
