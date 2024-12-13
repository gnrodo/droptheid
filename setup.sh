#!/bin/bash

# Mostrar versiones y rutas
echo "Python version:"
python3 --version
echo "Python location:"
which python3
echo "Pip location:"
which pip3

# Actualizar pip
python3 -m pip install --upgrade pip

# Instalar dependencias de Python
python3 -m pip install -r requirements.txt

# Instalar dependencias de Node.js e iniciar la aplicación
cd shazam-web && npm install && node server.js