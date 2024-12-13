#!/bin/bash

# Actualizar e instalar dependencias
apt-get update
apt-get install -y python3 python3-pip ffmpeg

# Crear enlace simbólico para python3
ln -s /usr/bin/python3 /usr/local/bin/python3

# Instalar dependencias de Python
pip3 install shazamio python-ffmpeg

# Verificar instalación
python3 --version
which python3

# Cambiar al directorio de la aplicación web e instalar dependencias
cd /app/shazam-web
npm install --omit=dev

# Exportar PATH
export PATH="/usr/bin:/usr/local/bin:$PATH"

# Iniciar la aplicación
npm start