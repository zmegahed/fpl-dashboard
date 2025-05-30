from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import ssl

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            print("Fetching FPL data for statistics...")
            
            # Create SSL context
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
            
            # Process active players only
            active_players = [p for p in fpl_data.get('elements', []) if p.get('minutes', 0) >= 90]
            
            if not active_players:
                raise Exception("No active players found")
            
            print(f"Calculating statistics for {len(active_players)} active players")
            
            # Calculate comprehensive statistics safely
            total_points_list = [p.get('total_points', 0) for p in active_players]
            prices_list = [p.get('now_cost', 0) / 10 for p in active_players]
            ppg_list = [float(p.get('points_per_game', 0)) if p.get('points_per_game') else 0 for p in active_players]
            
            # Find top performers safely
            top_scorer = max(active_players, key=lambda x: x.get('total_points', 0))
            best_value_player = max(active_players, key=lambda x: x.get('total_points', 0) / max(x.get('now_cost', 1) / 10, 0.1))
            highest_ppg = max(active_players, key=lambda x: float(x.get('points_per_game', 0)) if x.get('points_per_game') else 0)
            most_owned = max(active_players, key=lambda x: float(x.get('selected_by_percent', 0)) if x.get('selected_by_percent') else 0)
            
            # Calculate averages
            avg_points = sum(total_points_list) / len(total_points_list) if total_points_list else 0
            avg_price = sum(prices_list) / len(prices_list) if prices_list else 0
            avg_ppg = sum(ppg_list) / len(ppg_list) if ppg_list else 0
            
            # Process teams and positions
            teams = {team['id']: team['name'] for team in fpl_data.get('teams', [])}
            positions = {pos['id']: pos['singular_name'] for pos in fpl_data.get('element_types', [])}
            
            # Position breakdown
            position_counts = {}
            position_avg_points = {}
            
            for pos_id, pos_name in positions.items():
                pos_players = [p for p in active_players if p.get('element_type') == pos_id]
                if pos_players:
                    position_counts[pos_name] = len(pos_players)
                    position_avg_points[pos_name] = sum(p.get('total_points', 0) for p in pos_players) / len(pos_players)
            
            # Team breakdown
            team_counts = {}
            for team_id, team_name in teams.items():
                team_players = [p for p in active_players if p.get('team') == team_id]
                if team_players:
                    team_counts[team_name] = len(team_players)
            
            stats = {
                'totalPlayers': len(active_players),
                'avgPoints': round(avg_points, 1),
                'avgPrice': round(avg_price, 1),
                'avgPointsPerGame': round(avg_ppg, 2),
                
                'topScorer': {
                    'name': top_scorer.get('web_name', 'Unknown'),
                    'fullName': f"{top_scorer.get('first_name', '')} {top_scorer.get('second_name', '')}".strip(),
                    'points': top_scorer.get('total_points', 0),
                    'totalPoints': top_scorer.get('total_points', 0),
                    'team': teams.get(top_scorer.get('team', 0), 'Unknown'),
                    'position': positions.get(top_scorer.get('element_type', 0), 'Unknown')
                },
                
                'bestValue': {
                    'name': best_value_player.get('web_name', 'Unknown'),
                    'fullName': f"{best_value_player.get('first_name', '')} {best_value_player.get('second_name', '')}".strip(),
                    'pointsPerMillion': round(best_value_player.get('total_points', 0) / max(best_value_player.get('now_cost', 1) / 10, 0.1), 1),
                    'points': best_value_player.get('total_points', 0),
                    'price': round(best_value_player.get('now_cost', 0) / 10, 1),
                    'team': teams.get(best_value_player.get('team', 0), 'Unknown'),
                    'position': positions.get(best_value_player.get('element_type', 0), 'Unknown')
                },
                
                'mostConsistent': {
                    'name': highest_ppg.get('web_name', 'Unknown'),
                    'fullName': f"{highest_ppg.get('first_name', '')} {highest_ppg.get('second_name', '')}".strip(),
                    'pointsPerGame': float(highest_ppg.get('points_per_game', 0)) if highest_ppg.get('points_per_game') else 0,
                    'totalPoints': highest_ppg.get('total_points', 0),
                    'team': teams.get(highest_ppg.get('team', 0), 'Unknown'),
                    'position': positions.get(highest_ppg.get('element_type', 0), 'Unknown')
                },
                
                'mostOwned': {
                    'name': most_owned.get('web_name', 'Unknown'),
                    'fullName': f"{most_owned.get('first_name', '')} {most_owned.get('second_name', '')}".strip(),
                    'ownership': float(most_owned.get('selected_by_percent', 0)) if most_owned.get('selected_by_percent') else 0,
                    'totalPoints': most_owned.get('total_points', 0),
                    'team': teams.get(most_owned.get('team', 0), 'Unknown'),
                    'position': positions.get(most_owned.get('element_type', 0), 'Unknown')
                },
                
                'positionBreakdown': position_counts,
                'positionAverages': {k: round(v, 1) for k, v in position_avg_points.items()},
                'teamBreakdown': team_counts,
                
                'dataRange': 'Current season (Real FPL API data)',
                'lastUpdated': '2024-12-19T12:00:00Z',
                'source': 'Fantasy Premier League Official API',
                
                'insights': {
                    'highestScoringPosition': max(position_avg_points.items(), key=lambda x: x[1])[0] if position_avg_points else 'Unknown',
                    'totalGoalsScored': sum(p.get('goals_scored', 0) for p in active_players),
                    'totalAssists': sum(p.get('assists', 0) for p in active_players),
                    'totalCleanSheets': sum(p.get('clean_sheets', 0) for p in active_players),
                    'averageOwnership': round(sum(float(p.get('selected_by_percent', 0)) if p.get('selected_by_percent') else 0 for p in active_players) / len(active_players), 1)
                }
            }
            
            print("Statistics calculated successfully")
            self.wfile.write(json.dumps(stats).encode())
            
        except urllib.error.HTTPError as e:
            print(f"HTTP Error: {e.code} - {e.reason}")
            error_response = {
                'error': f'Failed to fetch FPL statistics: HTTP {e.code} - {e.reason}',
                'totalPlayers': 0,
                'avgPoints': 0,
                'avgPrice': 0,
                'topScorer': {'name': 'N/A', 'points': 0},
                'bestValue': {'name': 'N/A', 'pointsPerMillion': 0},
                'message': 'The Fantasy Premier League API may be temporarily unavailable'
            }
            self.wfile.write(json.dumps(error_response).encode())
            
        except urllib.error.URLError as e:
            print(f"URL Error: {e.reason}")
            error_response = {
                'error': f'Failed to connect to FPL API: {e.reason}',
                'totalPlayers': 0,
                'avgPoints': 0,
                'avgPrice': 0,
                'topScorer': {'name': 'N/A', 'points': 0},
                'bestValue': {'name': 'N/A', 'pointsPerMillion': 0},
                'message': 'Network connection issue - please try again'
            }
            self.wfile.write(json.dumps(error_response).encode())
            
        except Exception as e:
            print(f"General error: {e}")
            error_response = {
                'error': f'Failed to calculate statistics: {str(e)}',
                'totalPlayers': 0,
                'avgPoints': 0,
                'avgPrice': 0,
                'topScorer': {'name': 'N/A', 'points': 0},
                'bestValue': {'name': 'N/A', 'pointsPerMillion': 0},
                'message': 'An error occurred while calculating statistics'
            }
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
