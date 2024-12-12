const express = require('express');
const { formidable } = require('formidable');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Servir archivos estáticos desde el directorio raíz
app.use(express.static(__dirname));

// Servir index.html en la ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', (req, res) => {
    const form = formidable({
        multiples: false,
        uploadDir: __dirname,
        keepExtensions: true
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
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
            const newFilePath = path.join(__dirname, videoFile.originalFilename);
            
            // Renombrar el archivo temporal
            fs.renameSync(tempFilePath, newFilePath);

            console.log('Executing Python script with file:', newFilePath);
            // Ejecutar el script de Python con la ruta completa
            const pythonScript = path.join(__dirname, '..', 'shazam.py');
            exec(`python "${pythonScript}" "${newFilePath}"`, (error, stdout, stderr) => {
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

                    // Limpiar el archivo temporal
                    if (fs.existsSync(newFilePath)) {
                        fs.unlinkSync(newFilePath);
                    }

                    res.json({ track, artist, url, cover });
                } catch (parseError) {
                    console.error('Parse error:', parseError);
                    res.status(500).json({ error: 'Error parsing script output.' });
                }
            });
        } catch (fileError) {
            console.error('File handling error:', fileError);
            res.status(500).json({ error: 'Error handling uploaded file.' });
        }
    });
});

// Manejar todas las demás rutas sirviendo index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
