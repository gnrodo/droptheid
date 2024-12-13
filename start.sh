#!/bin/bash

# Instalar Python y pip
apt-get update
apt-get install -y python3 python3-pip ffmpeg

# Instalar dependencias de Python
pip3 install shazamio python-ffmpeg

# Cambiar al directorio de la aplicación web e instalar dependencias
cd /app/shazam-web
npm install --omit=dev

# Iniciar la aplicación
npm start