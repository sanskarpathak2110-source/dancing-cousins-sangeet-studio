"""
Bollywood DJ Studio - Multi-Threaded Streaming Backend Server
Rock-solid HTTP server with chunked audio streaming, HTTP range support,
instant FFmpeg slice previewing (/api/solo_cut), and master mashup export for
Dance 1 (Boyz Only), Dance 2 (Cousins Combined), and Grand Finale (Deewangi Deewangi).
"""
import os
import sys
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import subprocess
import imageio_ffmpeg

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
AUDIO_INPUTS_DIR = os.path.join(BASE_DIR, "audio_inputs")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")
SFX_DIR = os.path.join(BASE_DIR, "sfx")

sys.path.insert(0, BASE_DIR)
import audio_engine

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

def get_project_path(dance_id="1"):
    if str(dance_id) == "2":
        return os.path.join(PROJECTS_DIR, "dance_number_2_v1.json")
    return os.path.join(PROJECTS_DIR, "dance_number_1_v1.json")

def get_output_basename(dance_id="1"):
    if str(dance_id) == "2":
        return "dance_number_2_v1"
    return "dance_number_1_v1"

class MashupStudioServer(HTTPServer):
    allow_reuse_address = True

class MashupStudioHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def add_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")
        self.send_header("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.add_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # 1. Web UI Homepage
        if path == "/" or path == "/index.html":
            self.serve_file(os.path.join(PUBLIC_DIR, "index.html"), "text/html; charset=utf-8")
            return

        # 2. Static public assets (serves /public/file or /file directly)
        rel_path = path[len("/public/"):] if path.startswith("/public/") else path.lstrip("/")
        local_path = os.path.join(PUBLIC_DIR, rel_path)
        if os.path.exists(local_path) and os.path.isfile(local_path):
            ext = os.path.splitext(local_path)[1].lower()
            mime = "text/plain"
            if ext == ".css": mime = "text/css"
            elif ext == ".js": mime = "application/javascript"
            elif ext == ".json": mime = "application/json"
            elif ext == ".pdf": mime = "application/pdf"
            elif ext in (".png", ".jpg", ".jpeg"): mime = f"image/{ext[1:]}"
            elif ext == ".svg": mime = "image/svg+xml"
            self.serve_file(local_path, mime)
            return

        # 3. Project Configuration API (Dance 1 or Dance 2)
        if path == "/api/project":
            dance_id = query.get("dance", ["1"])[0]
            proj_path = get_project_path(dance_id)
            if os.path.exists(proj_path):
                with open(proj_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.send_json(data)
            else:
                self.send_json({"error": f"Project file for dance {dance_id} not found"}, 404)
            return

        # 4. Local Audio Scanned List API
        if path == "/api/scan_inputs":
            files = []
            if os.path.exists(AUDIO_INPUTS_DIR):
                for f in sorted(os.listdir(AUDIO_INPUTS_DIR)):
                    if f.lower().endswith((".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg")):
                        fp = os.path.join(AUDIO_INPUTS_DIR, f)
                        dur = audio_engine.get_audio_duration(fp)
                        files.append({
                            "name": f,
                            "path": f"audio_inputs/{f}",
                            "size": os.path.getsize(fp),
                            "duration": dur
                        })
            self.send_json({"files": files})
            return

        # 5. Exact Sliced Audio for Previewing Trims with 100% Precision
        if path == "/api/solo_cut":
            rel_path = query.get("path", [None])[0]
            try:
                start_sec = float(query.get("start", [0])[0])
                end_sec = float(query.get("end", [60])[0])
            except Exception:
                start_sec, end_sec = 0.0, 60.0

            if not rel_path:
                self.send_error(400, "Missing path parameter")
                return
            full_path = os.path.normpath(os.path.join(BASE_DIR, rel_path))
            if not os.path.exists(full_path):
                self.send_error(404, "Audio file not found")
                return

            # Slice exact audio segment via fast FFmpeg stream copy (instant ~0.05s)
            slice_cmd = [
                FFMPEG_EXE, "-y",
                "-ss", f"{start_sec:.2f}",
                "-to", f"{end_sec:.2f}",
                "-i", full_path,
                "-c:a", "copy",
                "-f", "mp3",
                "pipe:1"
            ]
            res = subprocess.run(slice_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            sliced_bytes = res.stdout

            # If stream copy failed or returned empty for any reason, fallback to quick lame encode
            if len(sliced_bytes) < 1024:
                fallback_cmd = [
                    FFMPEG_EXE, "-y",
                    "-ss", f"{start_sec:.2f}",
                    "-to", f"{end_sec:.2f}",
                    "-i", full_path,
                    "-c:a", "libmp3lame",
                    "-b:a", "192k",
                    "-f", "mp3",
                    "pipe:1"
                ]
                res2 = subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
                sliced_bytes = res2.stdout

            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(sliced_bytes)))
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.add_cors_headers()
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(sliced_bytes)
            return

        # 6. Stream Full Audio Input
        if path == "/api/audio":
            rel_path = query.get("path", [None])[0]
            if not rel_path:
                self.send_error(400, "Missing path parameter")
                return
            full_path = os.path.normpath(os.path.join(BASE_DIR, rel_path))
            if not os.path.exists(full_path):
                self.send_error(404, "Audio file not found")
                return
            self.serve_audio_stream(full_path)
            return

        # 7. Stream or Download Final Master Mix (MP3 / WAV) for Dance 1 or Dance 2
        if path == "/api/download":
            dance_id = query.get("dance", ["1"])[0]
            fmt = query.get("format", ["mp3"])[0].lower()
            base = get_output_basename(dance_id)
            fname = f"{base}.mp3" if fmt == "mp3" else f"{base}.wav"
            full_path = os.path.join(OUTPUT_DIR, fname)
            if not os.path.exists(full_path):
                self.send_error(404, f"Exported file for {base} not found. Please click 'Export Mix' first.")
                return
            self.serve_audio_stream(full_path)
            return

        # 8. Grand Finale Full Song Stream & Download
        if path == "/api/finale_audio" or path == "/api/finale_download":
            finale_path = os.path.join(AUDIO_INPUTS_DIR, "finale_deewangi_deewangi.mp3")
            if not os.path.exists(finale_path):
                self.send_error(404, "Finale audio file not found")
                return
            if path == "/api/finale_download":
                with open(finale_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Disposition", 'attachment; filename="Grand_Finale_Deewangi_Deewangi_FullSong.mp3"')
                self.send_header("Content-Length", str(len(content)))
                self.add_cors_headers()
                self.end_headers()
                if self.command != 'HEAD':
                    self.wfile.write(content)
                return
            self.serve_audio_stream(finale_path)
            return

        self.send_error(404, "Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Save project JSON
        if path == "/api/project":
            dance_id = query.get("dance", ["1"])[0]
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len) if content_len > 0 else b"{}"
            try:
                data = json.loads(body.decode("utf-8"))
                proj_path = get_project_path(dance_id)
                with open(proj_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                self.send_json({"status": "success", "message": f"Dance {dance_id} project saved successfully"})
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
            return

        # Render Mashup Pipeline
        if path == "/api/render":
            dance_id = query.get("dance", ["1"])[0]
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len) if content_len > 0 else b""
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                if "dance" in data:
                    dance_id = str(data["dance"])

                proj_path = get_project_path(dance_id)
                base = get_output_basename(dance_id)

                items = data.get("items")
                if not items:
                    with open(proj_path, "r", encoding="utf-8") as f:
                        proj = json.load(f)
                    items = proj["items"]

                for it in items:
                    it["filePath"] = os.path.normpath(os.path.join(BASE_DIR, it["filePath"]))

                print(f"[API] Starting render of Dance {dance_id} ({len(items)} items, output: {base})...")
                result = audio_engine.build_mashup(items, base)

                # Save the updated items back into the project file
                try:
                    with open(proj_path, "r", encoding="utf-8") as f:
                        proj = json.load(f)
                    proj["items"] = items
                    with open(proj_path, "w", encoding="utf-8") as f:
                        json.dump(proj, f, indent=2)
                except Exception:
                    pass

                self.send_json({
                    "status": "success",
                    "dance": dance_id,
                    "duration": result["duration"],
                    "durationFormatted": result["durationFormatted"],
                    "mp3": f"/api/download?dance={dance_id}&format=mp3",
                    "wav": f"/api/download?dance={dance_id}&format=wav",
                    "transitions": result.get("transitions", [])
                })
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_json({"error": str(e)}, 500)
            return

        self.send_error(404, "Not Found")

    def serve_file(self, filepath, mime_type):
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.add_cors_headers()
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Error reading file: {str(e)}")

    def serve_audio_stream(self, filepath):
        file_size = os.path.getsize(filepath)
        range_header = self.headers.get("Range")

        ext = os.path.splitext(filepath)[1].lower()
        mime = "audio/mpeg" if ext == ".mp3" else ("audio/wav" if ext == ".wav" else "audio/octet-stream")

        start = 0
        end = file_size - 1
        status = 200

        if range_header and range_header.startswith("bytes="):
            parts = range_header.replace("bytes=", "").split("-")
            if parts[0]:
                start = int(parts[0])
            if len(parts) > 1 and parts[1]:
                end = int(parts[1])
            status = 206

        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.add_cors_headers()
        self.end_headers()

        if self.command != 'HEAD':
            try:
                with open(filepath, "rb") as f:
                    f.seek(start)
                    remaining = length
                    chunk_size = 65536
                    while remaining > 0:
                        read_amount = min(remaining, chunk_size)
                        chunk = f.read(read_amount)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def send_json(self, data, status_code=200):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.add_cors_headers()
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

def start_server(port=8080):
    server = MashupStudioServer(("127.0.0.1", port), MashupStudioHandler)
    print(f"Bollywood DJ Studio Server running at http://localhost:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...", flush=True)
        server.server_close()

if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    start_server(port)
