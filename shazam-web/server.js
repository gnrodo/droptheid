const express = require('express');
const { formidable } = require('formidable');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Crear directorio para archivos temporales si no existe
const uploadDir = path.join(__dirname, 'temp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Servir archivos estáticos desde el directorio raíz
app.use(express.static(__dirname));

// Servir index.html en la ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', (req, res) => {
    const form = formidable({
        multiples: false,
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB límite
        filter: function ({name, originalFilename, mimetype}) {
            // Aceptar solo archivos de video y audio
            return mimetype && (mimetype.includes('video/') || mimetype.includes('audio/'));
        }
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File is too large. Maximum size is 50MB.' });
            }
            console.error('Error parsing form:', err);
            return res.status(500).json({ error: 'Error parsing form data.' });
        }

        if (!files.video || !files.video[0]) {
            console.error('No video file found in request');
            return res.status(400).json({ error: 'No video file uploaded.' });
        }

        try {
            const videoFile = files.video[0];
            const tempFilePath = videoFile.filepath;
            const newFilePath = path.join(uploadDir, videoFile.originalFilename);
            
            // Renombrar el archivo temporal
            fs.renameSync(tempFilePath, newFilePath);

            console.log('Executing Python script with file:', newFilePath);
            // Ejecutar el script de Python con la ruta completa
            const pythonScript = path.resolve(__dirname, '..', 'shazam.py');
            console.log('Python script path:', pythonScript);
            
            exec(`python "${pythonScript}" "${newFilePath}"`, (error, stdout, stderr) => {
                // Limpiar el archivo temporal después de procesarlo
                if (fs.existsSync(newFilePath)) {
                    fs.unlinkSync(newFilePath);
                }

                if (error) {
                    console.error('Exec error:', error);
                    console.error('Stderr:', stderr);
                    return res.status(500).json({ error: 'Error executing shazam script.' });
                }
                
                console.log('Python script output:', stdout);
                try {
                    const lines = stdout.trim().split('\n');
                    let track = 'Unknown';
                    let artist = 'Unknown';
                    let url = 'Unknown';
                    let cover = 'Unknown';

                    for (const line of lines) {
                        if (line.startsWith('Track: ')) {
                            track = line.substring(7);
                        } else if (line.startsWith('Artist: ')) {
                            artist = line.substring(8);
                        } else if (line.startsWith('URL: ')) {
                            url = line.substring(5);
                        } else if (line.startsWith('Cover: ')) {
                            cover = line.substring(7);
                        }
                    }

                    res.json({ track, artist, url, cover });
                } catch (parseError) {
                    console.error('Parse error:', parseError);
                    res.status(500).json({ error: 'Error parsing script output.' });
                }
            });
        } catch (fileError) {
            console.error('File handling error:', fileError);
            // Asegurarse de limpiar archivos temporales en caso de error
            const tempFiles = [tempFilePath, newFilePath].filter(fs.existsSync);
            tempFiles.forEach(file => fs.unlinkSync(file));
            res.status(500).json({ error: 'Error handling uploaded file.' });
        }
    });
});

// Limpiar archivos temporales periódicamente (cada hora)
setInterval(() => {
    if (fs.existsSync(uploadDir)) {
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                console.error('Error reading temp directory:', err);
                return;
            }
            files.forEach(file => {
                const filePath = path.join(uploadDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) {
                        console.error('Error getting file stats:', err);
                        return;
                    }
                    // Eliminar archivos más antiguos de 1 hora
                    if (Date.now() - stats.mtime.getTime() > 3600000) {
                        fs.unlink(filePath, err => {
                            if (err) console.error('Error deleting temp file:', err);
                        });
                    }
                });
            });
        });
    }
}, 3600000);

// Manejar todas las demás rutas sirviendo index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${port}`);
});

// Limpiar archivos temporales al cerrar el servidor
process.on('SIGINT', () => {
    if (fs.existsSync(uploadDir)) {
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                console.error('Error reading temp directory:', err);
                process.exit(1);
            }
            files.forEach(file => {
                const filePath = path.join(uploadDir, file);
                fs.unlinkSync(filePath);
            });
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});
