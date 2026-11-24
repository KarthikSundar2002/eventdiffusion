"""Serve this folder on this machine with browser caching off:

    python3 serve.py [port]        # default 8000, then open http://127.0.0.1:8000/

Every response says `Cache-Control: no-store` and conditional requests are never answered 304, so the browser keeps
nothing between loads. Byte ranges are served (206), which video seeking and looping need. `python -m http.server` does
neither: it lets browsers cache files heuristically (an old copy, or old and new byte ranges of a rebuilt video mixed)
and cannot serve ranges. Binds 127.0.0.1 only; for a local preview, not for hosting.
"""

from __future__ import annotations

import http.server
import os
import re
import sys
from functools import partial

HERE = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        for h in ("If-Modified-Since", "If-None-Match", "If-Range"):
            del self.headers[h]  # never answer 304: the browser holds no copy to reuse
        self._remaining = None
        path, rng = self.translate_path(self.path), self.headers.get("Range")  # translate_path drops ?v=...
        if not rng or os.path.isdir(path):
            return super().send_head()
        m = re.fullmatch(r"bytes=(\d*)-(\d*)", rng.strip())
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        size = os.fstat(f.fileno()).st_size
        if m and m[1]:
            start, end = int(m[1]), min(int(m[2]), size - 1) if m[2] else size - 1
        elif m and m[2]:
            start, end = max(0, size - int(m[2])), size - 1
        else:
            start, end = size, -1
        if start >= size or start > end:
            f.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        f.seek(start)
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        try:
            if self._remaining is None:
                return super().copyfile(source, outputfile)
            n = self._remaining
            while n > 0:
                buf = source.read(min(n, 1 << 16))
                if not buf:
                    break
                outputfile.write(buf)
                n -= len(buf)
        except (BrokenPipeError, ConnectionResetError):
            pass  # the browser dropped a range it no longer needs

    def log_request(self, code="-", size="-"):
        if str(code).isdigit() and int(code) >= 400:
            super().log_request(code, size)


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(NoCacheHandler, directory=HERE))
    print(f"http://127.0.0.1:{port}/   (no caching; Ctrl+C stops)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
