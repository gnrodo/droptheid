import asyncio
from shazamio import Shazam
import os
import sys
import re
import json
import glob
import hashlib
from datetime import datetime
import yt_dlp
from typing import List, Dict, Set, Optional, Tuple

def calculate_input_hash(input_path: str) -> str:
    """Calcula un hash único para el input (URL o archivo)."""
    return hashlib.md5(input_path.encode()).hexdigest()

def save_metadata(set_dir: str, input_path: str, status: Dict):
    """Guarda metadata del set."""
    metadata = {
        'input_hash': calculate_input_hash(input_path),
        'input_path': input_path,
        'created_at': datetime.now().isoformat(),
        'status': status
    }
    with open(os.path.join(set_dir, 'metadata.json'), 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

def find_existing_set(input_path: str) -> Optional[str]:
    """Busca un set existente para el mismo input."""
    input_hash = calculate_input_hash(input_path)
    
    # Buscar en todos los sets
    for set_dir in glob.glob('sets/set_*'):
        metadata_file = os.path.join(set_dir, 'metadata.json')
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                if metadata.get('input_hash') == input_hash:
                    return set_dir
            except:
                continue
    return None

def is_youtube_url(url: str) -> bool:
    """Verifica si una URL es de YouTube."""
    youtube_regex = r'(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+'
    return bool(re.match(youtube_regex, url))

def create_set_directory() -> str:
    """Crea y retorna un directorio único para el set actual."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    set_dir = os.path.join('sets', f'set_{timestamp}')
    os.makedirs(set_dir, exist_ok=True)
    return set_dir

async def download_youtube(url: str, set_dir: str) -> str:
    """Descarga un video de YouTube y retorna la ruta del archivo."""
    output_template = os.path.join(set_dir, 'youtube_video.%(ext)s')
    
    ydl_opts = {
        'format': 'best',
        'outtmpl': output_template,
        'quiet': True
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            return os.path.join(set_dir, f"youtube_video.{info['ext']}")
    except Exception as e:
        print(f"Error downloading YouTube video: {str(e)}")
        sys.exit(1)

def convert_to_mp3(video_file: str, set_dir: str) -> str:
    """Convierte un video a MP3 y lo guarda en el directorio del set."""
    mp3_file = os.path.join(set_dir, 'base_audio.mp3')
    if os.name == 'nt':
        os.system(f'ffmpeg -y -i "{video_file}" "{mp3_file}" > NUL 2>&1')
    else:
        os.system(f'ffmpeg -y -i "{video_file}" "{mp3_file}" > /dev/null 2>&1')
    return mp3_file

def split_audio(mp3_file: str, set_dir: str) -> List[str]:
    """Divide el audio en segmentos de 1 minuto."""
    segments = []
    segment_duration = 60  # 1 minuto en segundos
    
    # Obtener duración del archivo
    duration_cmd = f'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{mp3_file}"'
    duration = float(os.popen(duration_cmd).read().strip())
    
    # Crear segmentos
    for i in range(0, int(duration), segment_duration):
        segment_file = os.path.join(set_dir, f'segment_{i//segment_duration}.mp3')
        cmd = f'ffmpeg -y -i "{mp3_file}" -ss {i} -t {segment_duration} "{segment_file}" > NUL 2>&1' if os.name == 'nt' else \
              f'ffmpeg -y -i "{mp3_file}" -ss {i} -t {segment_duration} "{segment_file}" > /dev/null 2>&1'
        os.system(cmd)
        segments.append(segment_file)
    
    return segments

def save_results(results: List[Dict], set_dir: str):
    """Guarda los resultados en un archivo JSON."""
    results_file = os.path.join(set_dir, 'results.json')
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

async def analyze_segments(segments: List[str], set_dir: str) -> List[Dict]:
    """Analiza cada segmento y retorna una lista de tracks únicos."""
    shazam = Shazam()
    track_counts: Dict[str, int] = {}  # Contador de repeticiones por track ID
    track_info_cache: Dict[str, Dict] = {}  # Cache de información por track ID
    results = []
    
    for i, segment in enumerate(segments):
        # Pausa entre peticiones para no sobrecargar la API
        if i > 0:  # No pausar en la primera petición
            await asyncio.sleep(2)  # Pausa de 2 segundos entre peticiones
        try:
            out = await shazam.recognize(segment)
            if 'track' in out:
                track_id = out['track'].get('key', '')
                if track_id:
                    # Actualizar contador
                    track_counts[track_id] = track_counts.get(track_id, 0) + 1
                    count = track_counts[track_id]
                    
                    # Si es la primera vez que encontramos este track, guardamos su info
                    if track_id not in track_info_cache:
                        base_title = out['track']['title']
                        track_info_cache[track_id] = {
                            'track': base_title,
                            'artist': out['track']['subtitle'],
                            'url': out['track']['hub']['actions'][1]['uri'],
                            'cover': out['track'].get('images', {}).get('coverart') or \
                                    out['track'].get('images', {}).get('coverarthq') or \
                                    "Unknown",
                            'first_segment': i
                        }
                        
                        # Agregar a resultados solo la primera vez
                        track_info = track_info_cache[track_id].copy()
                        track_info['segment'] = i
                        results.append(track_info)
                        print(f"Found new track in segment {i}: {base_title} - {track_info['artist']}")
                    
                    # Actualizar el título con el contador si hay más de una ocurrencia
                    if count > 1:
                        base_title = track_info_cache[track_id]['track']
                        for result in results:
                            if result['track'] == base_title or result['track'].startswith(f"{base_title} ("):
                                result['track'] = f"{base_title} ({count})"
                        print(f"Track found again in segment {i}: {base_title} ({count})")
                    
                    # Guardar resultados parciales
                    save_results(results, set_dir)
        except Exception as e:
            print(f"Error analyzing segment {i}: {str(e)}")
            continue
    
    return results

async def main():
    if len(sys.argv) < 2:
        print("Error: No input provided")
        print("Usage: python shazam.py <file_or_youtube_url>")
        sys.exit(1)

    input_path = sys.argv[1]
    
    # Buscar set existente o crear uno nuevo
    set_dir = find_existing_set(input_path)
    if set_dir:
        print(f"Found existing set: {set_dir}")
    else:
        set_dir = create_set_directory()
        print(f"Created new set directory: {set_dir}")

    try:
        status = {'downloaded': False, 'converted': False, 'segmented': False}
        
        # 1. Verificar/Obtener video
        video_file = os.path.join(set_dir, 'youtube_video.mp4')
        if os.path.exists(video_file):
            print("Using existing video file...")
            status['downloaded'] = True
        else:
            if is_youtube_url(input_path):
                print("Downloading YouTube video...")
                video_file = await download_youtube(input_path, set_dir)
                status['downloaded'] = True
            else:
                if not os.path.exists(input_path):
                    print("Error: File not found")
                    sys.exit(1)
                video_file = input_path
                status['downloaded'] = True

        # 2. Verificar/Convertir MP3
        base_mp3 = os.path.join(set_dir, 'base_audio.mp3')
        if os.path.exists(base_mp3):
            print("Using existing MP3 file...")
            status['converted'] = True
        else:
            print("Converting to MP3...")
            base_mp3 = convert_to_mp3(video_file, set_dir)
            status['converted'] = True

        # 3. Verificar/Crear segmentos
        segment_pattern = os.path.join(set_dir, 'segment_*.mp3')
        existing_segments = glob.glob(segment_pattern)
        if existing_segments:
            print("Using existing segments...")
            segments = sorted(existing_segments)
            status['segmented'] = True
        else:
            print("Splitting audio into segments...")
            segments = split_audio(base_mp3, set_dir)
            status['segmented'] = True

        # Guardar metadata
        save_metadata(set_dir, input_path, status)

        # 4. Analizar segmentos (siempre se realiza)
        print("Analyzing segments...")
        results = await analyze_segments(segments, set_dir)

        # Guardar resultados finales
        save_results(results, set_dir)
        
        print("\nAnalysis complete!")
        print(f"Found {len(results)} unique tracks")
        print(f"Results saved in: {os.path.join(set_dir, 'results.json')}")

    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
