from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import ssl
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            print("Starting FPL data fetch...")
            
            # Create SSL context to handle HTTPS requests
            ssl_context = ssl.create_default_context()
            
            # Fetch real FPL data using urllib
            req = urllib.request.Request(
                'https://fantasy.premierleague.com/api/bootstrap-static/',
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )
            
            with urllib.request.urlopen(req, context=ssl_context, timeout=30) as response:
                if response.status != 200:
                    raise Exception(f"FPL API returned status {response.status}")
                
                fpl_data = json.loads(response.read().decode('utf-8'))
            
            print(f"Successfully fetched data for {len(fpl_data.get('elements', []))} players")
            
            # Process teams and positions
            teams = {team['id']: team['name'] for team in fpl_data.get('teams', [])}
            positions = {pos['id']: pos['singular_name'] for pos in fpl_data.get('element_types', [])}
            
            # Process players (only active players with at least 90 minutes)
            players = []
            for player in fpl_data.get('elements', []):
                try:
                    if player.get('minutes', 0) >= 90:  # Only active players
                        price = player.get('now_cost', 0) / 10  # Convert from tenths
                        total_points = player.get('total_points', 0)
                        
                        # Calculate advanced metrics safely
                        games_played = max(player.get('minutes', 0) / 90, 1)
                        points_per_million = total_points / price if price > 0 else 0
                        goals_per_game = player.get('goals_scored', 0) / games_played
                        assists_per_game = player.get('assists', 0) / games_played
                        availability_score = (player.get('minutes', 0) / (38 * 90)) * 100  # % of possible minutes
                        
                        # Calculate overall score (weighted combination of metrics)
                        ppg = float(player.get('points_per_game', 0)) if player.get('points_per_game') else 0
                        overall_score = (
                            (total_points * 0.4) +
                            (points_per_million * 0.3) +
                            (ppg * 10 * 0.2) +
                            (availability_score * 0.1)
                        )
                        
                        player_data = {
                            'id': player.get('id', 0),
                            'name': player.get('web_name', 'Unknown'),
                            'fullName': f"{player.get('first_name', '')} {player.get('second_name', '')}".strip(),
                            'team': teams.get(player.get('team', 0), 'Unknown'),
                            'teamId': player.get('team', 0),
                            'position': positions.get(player.get('element_type', 0), 'Unknown'),
                            'positionId': player.get('element_type', 0),
                            'price': round(price, 1),
                            'totalPoints': total_points,
                            'ppg': ppg,
                            'goals': player.get('goals_scored', 0),
                            'assists': player.get('assists', 0),
                            'minutes': player.get('minutes', 0),
                            'cleanSheets': player.get('clean_sheets', 0),
                            'goalsConceded': player.get('goals_conceded', 0),
                            'saves': player.get('saves', 0),
                            'bonus': player.get('bonus', 0),
                            'bps': player.get('bps', 0),
                            'influence': float(player.get('influence', 0)) if player.get('influence') else 0,
                            'creativity': float(player.get('creativity', 0)) if player.get('creativity') else 0,
                            'threat': float(player.get('threat', 0)) if player.get('threat') else 0,
                            'ictIndex': float(player.get('ict_index', 0)) if player.get('ict_index') else 0,
                            'ownership': float(player.get('selected_by_percent', 0)) if player.get('selected_by_percent') else 0,
                            'form': float(player.get('form', 0)) if player.get('form') else 0,
                            'transfersIn': player.get('transfers_in_event', 0),
                            'transfersOut': player.get('transfers_out_event', 0),
                            'status': player.get('status', 'a'),
                            'news': player.get('news', ''),
                            
                            # Calculated metrics
                            'pointsPerMillion': round(points_per_million, 1),
                            'gamesPlayed': int(games_played),
                            'goalsPerGame': round(goals_per_game, 2),
                            'assistsPerGame': round(assists_per_game, 2),
                            'goalInvolvement': player.get('goals_scored', 0) + player.get('assists', 0),
                            'availabilityScore': round(availability_score, 1),
                            'overallScore': round(overall_score, 1),
                            'seasonsPlayed': 1,  # Current season data only
                            'avgPointsPerSeason': total_points,
                            'consistencyScore': round(total_points / max(games_played, 1), 1)
                        }
                        players.append(player_data)
                except Exception as e:
                    print(f"Error processing player {player.get('web_name', 'Unknown')}: {e}")
                    continue
            
            # Sort by total points (descending)
            players.sort(key=lambda x: x['totalPoints'], reverse=True)
            
            print(f"Processed {len(players)} active players")
            
            result = {
                'players': players,
                'count': len(players),
                'dataRange': 'Current season (Real FPL API data)',
                'lastUpdated': '2024-12-19T12:00:00Z',
                'source': 'Fantasy Premier League Official API'
            }
            
            self.wfile.write(json.dumps(result).encode())
            
        except urllib.error.HTTPError as e:
            print(f"HTTP Error: {e.code} - {e.reason}")
            error_response = {
                'error': f'Failed to fetch FPL data: HTTP {e.code} - {e.reason}',
                'players': [],
                'count': 0,
                'message': 'The Fantasy Premier League API may be temporarily unavailable'
            }
            self.wfile.write(json.dumps(error_response).encode())
            
        except urllib.error.URLError as e:
            print(f"URL Error: {e.reason}")
            error_response = {
                'error': f'Failed to connect to FPL API: {e.reason}',
                'players': [],
                'count': 0,
                'message': 'Network connection issue - please try again'
            }
            self.wfile.write(json.dumps(error_response).encode())
            
        except Exception as e:
            print(f"General error: {e}")
            error_response = {
                'error': f'Failed to process FPL data: {str(e)}',
                'players': [],
                'count': 0,
                'message': 'An error occurred while processing player data'
            }
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
