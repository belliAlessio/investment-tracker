#!/usr/bin/env python3
"""
PAC Tracker local server.
Run with: python3 server.py
Opens http://localhost:8080 in your browser.
Also proxies Yahoo Finance API calls (needed for fund info cards).
"""
import threading
import time
import urllib.request
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PROXY_HOSTS = {'query1.finance.yahoo.com', 'query2.finance.yahoo.com'}

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_GET(self):
        if self.path.startswith('/yf/'):
            self._yf_proxy()
        else:
            super().do_GET()

    def _yf_proxy(self):
        tail = self.path[4:]
        host, _, rest = tail.partition('/')
        if host not in PROXY_HOSTS:
            self.send_error(403)
            return
        try:
            req = urllib.request.Request(
                f'https://{host}/{rest}',
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                body = r.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(str(e).encode())


def _open_browser(port):
    time.sleep(0.4)
    webbrowser.open(f'http://localhost:{port}')


if __name__ == '__main__':
    port = 8080
    print(f'PAC Tracker → http://localhost:{port}')
    print('Ctrl+C to stop')
    threading.Thread(target=_open_browser, args=(port,), daemon=True).start()
    HTTPServer(('localhost', port), Handler).serve_forever()
