import http.server
import os

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='public', **kwargs)

    def do_GET(self): 
        if not os.path.exists(self.translate_path(self.path)):
            self.path = '/index.html'
        super().do_GET()

print('pagr dev server on http://localhost:8000')
http.server.ThreadingHTTPServer(('127.0.0.1', 8000), Handler).serve_forever()