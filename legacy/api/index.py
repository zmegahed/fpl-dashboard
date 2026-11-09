from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        response = {
            'status': 'FPL 3-Year Analysis API is running',
            'version': '3.0.0',
            'features': [
                'Real 3-year historical data analysis',
                'Optimal squad builder with historical performance',
                'Player search with season-by-season stats',
                'Comprehensive consistency and reliability metrics'
            ],
            'endpoints': [
                '/api/ - API status and information',
                '/api/players - 3-year player analysis and squad building',
                '/api/players?optimal-squad&budget=100&formation=3-5-2 - Optimal squad generation',
                '/api/players?player-search&q=player_name - Player history search',
                '/api/stats - Summary statistics'
            ],
            'data_sources': [
                'Fantasy Premier League Official API (current season)',
                'vaastav/Fantasy-Premier-League GitHub Repository (historical data)',
                'Real data from 2022-23, 2023-24, and 2024-25 seasons'
            ],
            'message': 'Complete FPL analysis system with real historical data!',
            'last_updated': '2024-12-19T12:00:00Z'
        }
        
        self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
