import asyncio
from shazamio import Shazam
import os
import sys

async def main():
    if len(sys.argv) < 2:
        print("Error: No file provided")
        sys.exit(1)

    video_file = sys.argv[1]
    if not os.path.exists(video_file):
        print("Error: File not found")
        sys.exit(1)

    shazam = Shazam()
    mp3_file = os.path.splitext(video_file)[0] + '.mp3'
    
    # Convertir video a audio
    if os.name == 'nt':
        os.system(f'ffmpeg -y -i "{video_file}" "{mp3_file}" > NUL 2>&1')
    else:
        os.system(f'ffmpeg -y -i "{video_file}" "{mp3_file}" > /dev/null 2>&1')

    try:
        # Realizar el reconocimiento
        out = await shazam.recognize(mp3_file)
        
        if 'track' in out:
            track_title = out['track']['title']
            track_artist = out['track']['subtitle']
            track_url = out['track']['hub']['actions'][1]['uri']
            
            # Obtener la URL de la imagen de portada
            cover_url = out['track'].get('images', {}).get('coverart') or \
                       out['track'].get('images', {}).get('coverarthq') or \
                       "Unknown"
        else:
            track_title = "Unknown"
            track_artist = "Unknown"
            track_url = "Unknown"
            cover_url = "Unknown"

        print(f"Track: {track_title}")
        print(f"Artist: {track_artist}")
        print(f"URL: {track_url}")
        print(f"Cover: {cover_url}")

    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
    finally:
        # Limpiar el archivo de audio temporal
        if os.path.exists(mp3_file):
            os.remove(mp3_file)

loop = asyncio.get_event_loop()
loop.run_until_complete(main())
