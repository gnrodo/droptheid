FROM python:3.11-slim

# Instalar Node.js y otras dependencias
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de la aplicación
COPY . .

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Asegurarse de que shazam.py tenga permisos de ejecución
RUN chmod +x shazam.py

# Instalar dependencias de Node.js
WORKDIR /app/shazam-web
RUN npm install

# Exponer puerto
EXPOSE 8080

# Variable de entorno para el puerto
ENV PORT=8080

# Comando para iniciar la aplicación
CMD ["npm", "start"]