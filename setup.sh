#!/bin/bash

# Esperar a que los paquetes estén disponibles
sleep 5

# Mostrar contenido de /usr/bin
echo "Contenido de /usr/bin:"
ls -l /usr/bin/python*

# Usar rutas absolutas
/usr/bin/python3 --version || true
echo "Python location:"
which python3 || true
echo "Pip location:"
which pip3 || true

# Instalar dependencias de Python usando rutas absolutas
/usr/bin/python3 -m pip install -r requirements.txt || true

# Instalar dependencias de Node.js e iniciar la aplicación
cd shazam-web && npm install && node server.js