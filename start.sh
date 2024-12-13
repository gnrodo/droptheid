#!/bin/bash

# Instalar dependencias de Python
pip3 install shazamio python-ffmpeg

# Cambiar al directorio de la aplicación web e instalar dependencias
cd shazam-web
npm install --omit=dev

# Iniciar la aplicación
node server.js