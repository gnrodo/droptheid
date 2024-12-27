import asyncio
from shazamio import Shazam
import os
import sys
import json
from urllib.parse import urlparse
from yt_dlp import YoutubeDL
import math
import re
import time
from datetime import datetime
from collections import defaultdict
import argparse

def create_set_directory(url_or_file):
    # Crear directorio base para sets si no existe
    base_dir = os.path.join(os.getcwd(), "sets")
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
    
    # Generar nombre del set basado en la fecha y URL/archivo
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if urlparse(url_or_file).scheme in ['http', 'https']:
        set_name = f"set_{timestamp}"
    else:
        set_name = f"set_{timestamp}_{os.path.splitext(os.path.basename(url_or_file))[0]}"
    
    # Crear directorio para este set
    set_dir = os.path.abspath(os.path.join(base_dir, set_name))
    os.makedirs(set_dir, exist_ok=True)
    return set_dir

class TrackDetector:
    def __init__(self):
        self.current_track = None
        self.detected_tracks = []
        self.last_timestamp = None
        
    def process_track(self, track):
        if not track['recognized']:
            return None
            
        # Si es un track nuevo (diferente al anterior)
        if not self.current_track or not self.tracks_match(track, self.current_track):
            # Si hay suficiente diferencia de tiempo con el último track detectado (más de 30 segundos)
            # o si es el primer track, lo consideramos como un track nuevo
            if not self.last_timestamp or abs(track['timestamp'] - self.last_timestamp) >= 30:
                self.current_track = track
                self.last_timestamp = track['timestamp']
                
                # Verificar si este track ya fue detectado anteriormente
                track_already_detected = False
                for t in self.detected_tracks:
                    if self.tracks_match(track, t):
                        track_already_detected = True
                        break
                
                if not track_already_detected:
                    self.detected_tracks.append(track)
                    return track
                    
        return None
    
    def tracks_match(self, track1, track2):
        return track1['title'].lower() == track2['title'].lower() and \
               track1['artist'].lower() == track2['artist'].lower()

async def recognize_segment(shazam, audio_file, start_time, segment_duration):
    try:
        # Extraer segmento usando ffmpeg
        segment_file = os.path.join(os.path.dirname(audio_file), f"segment_{start_time}.mp3")
        os.system(f'ffmpeg -y -ss {start_time} -t {segment_duration} -i "{audio_file}" "{segment_file}" -loglevel error')
        
        print(f"\rAnalyzing segment at {format_time(start_time)}...", end="", flush=True)
        
        # Realizar el reconocimiento con reintentos
        try:
            async def recognition_attempt():
                out = await shazam.recognize(segment_file)
                if not isinstance(out, dict):
                    raise ValueError("Invalid response format")
                return out
            
            out = await retry_with_backoff(recognition_attempt)
            
            if 'track' in out:
                # Procesar título y artista
                title = out['track']['title'].strip()
                artist = out['track']['subtitle'].strip()
                
                # Detectar y formatear remix info
                remix_info = ""
                remix_pattern = r'\(([^)]*remix[^)]*)\)'
                title_remix = re.search(remix_pattern, title, re.IGNORECASE)
                artist_remix = re.search(remix_pattern, artist, re.IGNORECASE)
                
                if title_remix:
                    remix_info = f" ({title_remix.group(1)})"
                    title = title[:title_remix.start()].strip()
                elif artist_remix:
                    remix_info = f" ({artist_remix.group(1)})"
                    artist = artist[:artist_remix.start()].strip()
                
                track = {
                    'timestamp': start_time,
                    'title': title,
                    'artist': artist,
                    'remix_info': remix_info,
                    'recognized': True,
                    'url': out['track']['hub']['actions'][1]['uri'] if 'hub' in out['track'] and 'actions' in out['track']['hub'] else "Unknown",
                    'cover': out['track'].get('images', {}).get('coverart') or 
                            out['track'].get('images', {}).get('coverarthq') or 
                            "Unknown"
                }
                print(f"\rFound track at {format_time(start_time)}: {title} - {artist}{remix_info}")
            else:
                track = {
                    'timestamp': start_time,
                    'title': "ID",
                    'artist': "ID",
                    'remix_info': "",
                    'recognized': False,
                    'url': "Unknown",
                    'cover': "Unknown"
                }
        except Exception as e:
            print(f"\nError recognizing segment at {format_time(start_time)}: {str(e)}")
            track = {
                'timestamp': start_time,
                'title': "ID",
                'artist': "ID",
                'remix_info': "",
                'recognized': False,
                'url': "Unknown",
                'cover': "Unknown"
            }
            
        # Limpiar archivo temporal
        if os.path.exists(segment_file):
            os.remove(segment_file)
            
        return track
    except Exception as e:
        print(f"\nError processing segment at {format_time(start_time)}: {str(e)}")
        return {
            'timestamp': start_time,
            'title': "ID",
            'artist': "ID",
            'remix_info': "",
            'recognized': False,
            'url': "Unknown",
            'cover': "Unknown"
        }

async def retry_with_backoff(func, max_retries=3, initial_delay=1):
    delay = initial_delay
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            return await func()
        except Exception as e:
            last_exception = e
            if attempt < max_retries - 1:
                await asyncio.sleep(delay)
                delay *= 2
    
    raise last_exception

def format_time(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    if hours > 0:
        return f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"
    else:
        return f"{int(minutes):02d}:{int(seconds):02d}"

def format_duration(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    parts = []
    if hours > 0:
        parts.append(f"{int(hours)} hour{'s' if hours != 1 else ''}")
    if minutes > 0:
        parts.append(f"{int(minutes)} minute{'s' if minutes != 1 else ''}")
    if seconds > 0 or not parts:
        parts.append(f"{int(seconds)} second{'s' if seconds != 1 else ''}")
    return " ".join(parts)

async def process_long_audio(audio_file, set_dir, segment_duration=30, sample_interval=60, batch_size=5):
    shazam = Shazam()
    duration_cmd = f'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{audio_file}"'
    
    try:
        total_duration = float(os.popen(duration_cmd).read().strip())
        all_start_times = list(range(0, int(total_duration), sample_interval))
        
        print(f"\nTotal duration: {format_time(total_duration)}")
        print(f"Processing {len(all_start_times)} segments...\n")
        
        detector = TrackDetector()
        confirmed_tracks = []
        current_track = None
        
        # Procesar en lotes
        for i in range(0, len(all_start_times), batch_size):
            batch = all_start_times[i:i+batch_size]
            print(f"\nProcessing batch {i//batch_size + 1} of {math.ceil(len(all_start_times)/batch_size)}")
            print(f"Time range: {format_time(batch[0])} - {format_time(batch[-1])}")
            
            tasks = []
            for start_time in batch:
                tasks.append(recognize_segment(shazam, audio_file, start_time, segment_duration))
                await asyncio.sleep(0.5)
            
            results = await asyncio.gather(*tasks)
            
            for result in results:
                confirmed = detector.process_track(result)
                if confirmed:
                    if not current_track or not detector.tracks_match(confirmed, current_track):
                        confirmed['timestamp_formatted'] = format_time(confirmed['timestamp'])
                        confirmed_tracks.append(confirmed)
                        current_track = confirmed
            
            # Guardar resultados parciales
            save_results(confirmed_tracks, set_dir, partial=True)
            
            # Pausa entre lotes
            if i + batch_size < len(all_start_times):
                await asyncio.sleep(3)
        
        # Contar tracks únicos (sin IDs)
        unique_tracks = set()
        for track in confirmed_tracks:
            if track['recognized']:
                unique_tracks.add((track['title'], track['artist']))
        
        return {
            'tracks': confirmed_tracks,
            'unique_track_count': len(unique_tracks)
        }
    except Exception as e:
        print(f"\nError processing audio: {str(e)}", file=sys.stderr)
        return {'tracks': [], 'unique_track_count': 0}

def save_results(tracks, set_dir, partial=False):
    # Preparar lista formateada
    formatted_tracks = []
    for track in tracks:
        if not track['recognized']:
            formatted_line = f"[{track['timestamp_formatted']}] ID - ID"
        else:
            formatted_line = f"[{track['timestamp_formatted']}] {track['title']} - {track['artist']}{track['remix_info']}"
        formatted_tracks.append(formatted_line)
    
    # Guardar JSON
    json_file = os.path.join(set_dir, 'tracks_partial.json' if partial else 'tracks.json')
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump({
            'tracks': tracks,
            'unique_track_count': len(set([(t['title'], t['artist']) for t in tracks if t['recognized']]))
        }, f, indent=2, ensure_ascii=False)
    
    # Guardar lista formateada
    txt_file = os.path.join(set_dir, 'tracklist_partial.txt' if partial else 'tracklist.txt')
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(formatted_tracks))

async def main():
    parser = argparse.ArgumentParser(description='Music recognition tool')
    parser.add_argument('input', help='YouTube URL or local file path')
    args = parser.parse_args()

    start_time = time.time()
    input_source = args.input
    
    # Crear directorio para este set
    set_dir = create_set_directory(input_source)
    print(f"Set directory created: {set_dir}")
    
    print("\nProcessing audio... This may take a while depending on the length of the track.\n")
    
    # Verificar si es una URL de YouTube
    if urlparse(input_source).scheme in ['http', 'https']:
        try:
            print("Downloading YouTube video...")
            # Configurar yt-dlp
            ydl_opts = {
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '128',
                }],
                'outtmpl': os.path.join(set_dir, 'audio'),
                'quiet': False,
                'no_warnings': False,
                'extract_flat': False,
                'ignoreerrors': False,
                'no_color': True,
                'noprogress': False,
                'progress_hooks': [lambda d: print(f"\rDownload progress: {d['_percent_str'] if '_percent_str' in d else '0%'}", end='', flush=True)],
            }
            
            # Descargar audio
            with YoutubeDL(ydl_opts) as ydl:
                print("\nExtracting video information...")
                info = ydl.extract_info(input_source, download=False)
                duration = info.get('duration', 0)
                print(f"Video duration: {format_time(duration)}")
                
                print("\nStarting download...")
                ydl.download([input_source])
            
            audio_file = os.path.join(set_dir, 'audio.mp3')
            print("\nDownload complete. Analyzing audio...\n")
            
            # Verificar que el archivo existe
            if not os.path.exists(audio_file):
                raise Exception(f"Downloaded file not found: {audio_file}")
                
        except Exception as e:
            print(f"\nError downloading YouTube video: {str(e)}", file=sys.stderr)
            sys.exit(1)
    else:
        # Es un archivo local
        if not os.path.exists(input_source):
            print("Error: File not found")
            sys.exit(1)
        
        print("Converting audio...")
        # Convertir video a audio si es necesario
        audio_file = os.path.join(set_dir, 'audio.mp3')
        if os.name == 'nt':
            os.system(f'ffmpeg -y -i "{input_source}" "{audio_file}" -loglevel error')
        else:
            os.system(f'ffmpeg -y -i "{input_source}" "{audio_file}" -loglevel error')
        print("Conversion complete. Analyzing audio...\n")

    try:
        # Verificar que el archivo existe antes de procesarlo
        if not os.path.exists(audio_file):
            raise Exception(f"Audio file not found: {audio_file}")
            
        # Procesar el audio en segmentos
        result = await process_long_audio(audio_file, set_dir)
        
        # Guardar resultados finales
        save_results(result['tracks'], set_dir)
        
        # Calcular tiempo total
        end_time = time.time()
        total_time = format_duration(int(end_time - start_time))
        
        # Imprimir resumen
        print("\nProcessing complete!")
        print(f"Total unique tracks identified: {result['unique_track_count']}")
        print(f"Total processing time: {total_time}")
        print(f"\nResults saved in: {set_dir}")
        
    except Exception as e:
        print(f"\nError: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(main())
    except KeyboardInterrupt:
        print("\n\nProcess interrupted by user.")
        sys.exit(0)
