# FILE: api/index.py
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
            'status': 'FPL Analysis API is running',
            'version': '1.0.0',
            'endpoints': [
                '/api/ - API status',
                '/api/players - Get all players data',
                '/api/stats - Get summary statistics'
            ],
            'message': 'Python backend is working successfully!',
            'dataSource': 'Fantasy Premier League Official API'
        }
        
        self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

---

# FILE: api/players.py
from http.server import BaseHTTPRequestHandler
import json
import requests
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        try:
            print("Fetching FPL data from official API...")
            
            # Fetch real FPL data
            response = requests.get('https://fantasy.premierleague.com/api/bootstrap-static/', timeout=30)
            response.raise_for_status()
            fpl_data = response.json()
            
            print(f"Successfully fetched data for {len(fpl_data['elements'])} players")
            
            # Process teams and positions
            teams = {team['id']: team['name'] for team in fpl_data['teams']}
            positions = {pos['id']: pos['singular_name'] for pos in fpl_data['element_types']}
            
            # Process players (only active players with at least 90 minutes)
            players = []
            for player in fpl_data['elements']:
                if player['minutes'] >= 90:  # Only active players
                    price = player['now_cost'] / 10  # Convert from tenths
                    total_points = player['total_points']
                    
                    # Calculate advanced metrics
                    games_played = max(player['minutes'] / 90, 1)
                    points_per_million = total_points / price if price > 0 else 0
                    goals_per_game = player['goals_scored'] / games_played
                    assists_per_game = player['assists'] / games_played
                    availability_score = (player['minutes'] / (38 * 90)) * 100  # % of possible minutes
                    
                    # Calculate overall score (weighted combination of metrics)
                    overall_score = (
                        (total_points * 0.4) +
                        (points_per_million * 0.3) +
                        (float(player['points_per_game']) * 10 * 0.2) +
                        (availability_score * 0.1)
                    )
                    
                    player_data = {
                        'id': player['id'],
                        'name': player['web_name'],
                        'fullName': f"{player['first_name']} {player['second_name']}",
                        'team': teams.get(player['team'], 'Unknown'),
                        'teamId': player['team'],
                        'position': positions.get(player['element_type'], 'Unknown'),
                        'positionId': player['element_type'],
                        'price': round(price, 1),
                        'totalPoints': total_points,
                        'ppg': float(player['points_per_game']) if player['points_per_game'] else 0,
                        'goals': player['goals_scored'],
                        'assists': player['assists'],
                        'minutes': player['minutes'],
                        'cleanSheets': player['clean_sheets'],
                        'goalsConceded': player['goals_conceded'],
                        'saves': player['saves'],
                        'bonus': player['bonus'],
                        'bps': player['bps'],
                        'influence': float(player['influence']) if player['influence'] else 0,
                        'creativity': float(player['creativity']) if player['creativity'] else 0,
                        'threat': float(player['threat']) if player['threat'] else 0,
                        'ictIndex': float(player['ict_index']) if player['ict_index'] else 0,
                        'ownership': float(player['selected_by_percent']) if player['selected_by_percent'] else 0,
                        'form': float(player['form']) if player['form'] else 0,
                        'transfersIn': player['transfers_in_event'] if player['transfers_in_event'] else 0,
                        'transfersOut': player['transfers_out_event'] if player['transfers_out_event'] else 0,
                        'status': player['status'],
                        'news': player['news'] if player['news'] else '',
                        
                        # Calculated metrics
                        'pointsPerMillion': round(points_per_million, 1),
                        'gamesPlayed': int(games_played),
                        'goalsPerGame': round(goals_per_game, 2),
                        'assistsPerGame': round(assists_per_game, 2),
                        'goalInvolvement': player['goals_scored'] + player['assists'],
                        'availabilityScore': round(availability_score, 1),
                        'overallScore': round(overall_score, 1),
                        'seasonsPlayed': 1,  # Current season data only
                        'avgPointsPerSeason': total_points,
                        'consistencyScore': round(total_points / max(games_played, 1), 1)
                    }
                    players.append(player_data)
            
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
            
        except requests.exceptions.RequestException as e:
            print(f"API request error: {e}")
            error_response = {
                'error': f'Failed to fetch FPL data: API request failed - {str(e)}',
                'players': [],
                'count': 0,
                'message': 'The Fantasy Premier League API may be temporarily unavailable'
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

---

# FILE: api/stats.py
from http.server import BaseHTTPRequestHandler
import json
import requests

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        try:
            print("Fetching FPL data for statistics...")
            
            # Fetch real FPL data
            response = requests.get('https://fantasy.premierleague.com/api/bootstrap-static/', timeout=30)
            response.raise_for_status()
            fpl_data = response.json()
            
            # Process active players only
            active_players = [p for p in fpl_data['elements'] if p['minutes'] >= 90]
            
            if not active_players:
                raise Exception("No active players found")
            
            print(f"Calculating statistics for {len(active_players)} active players")
            
            # Calculate comprehensive statistics
            total_points_list = [p['total_points'] for p in active_players]
            prices_list = [p['now_cost'] / 10 for p in active_players]
            ppg_list = [float(p['points_per_game']) if p['points_per_game'] else 0 for p in active_players]
            
            # Find top performers
            top_scorer = max(active_players, key=lambda x: x['total_points'])
            best_value_player = max(active_players, key=lambda x: x['total_points'] / (x['now_cost'] / 10))
            highest_ppg = max(active_players, key=lambda x: float(x['points_per_game']) if x['points_per_game'] else 0)
            most_owned = max(active_players, key=lambda x: float(x['selected_by_percent']) if x['selected_by_percent'] else 0)
            
            # Calculate averages
            avg_points = sum(total_points_list) / len(total_points_list)
            avg_price = sum(prices_list) / len(prices_list)
            avg_ppg = sum(ppg_list) / len(ppg_list)
            
            # Position breakdown
            positions = {pos['id']: pos['singular_name'] for pos in fpl_data['element_types']}
            position_counts = {}
            position_avg_points = {}
            
            for pos_id, pos_name in positions.items():
                pos_players = [p for p in active_players if p['element_type'] == pos_id]
                if pos_players:
                    position_counts[pos_name] = len(pos_players)
                    position_avg_points[pos_name] = sum(p['total_points'] for p in pos_players) / len(pos_players)
            
            # Team breakdown
            teams = {team['id']: team['name'] for team in fpl_data['teams']}
            team_counts = {}
            for team_id, team_name in teams.items():
                team_players = [p for p in active_players if p['team'] == team_id]
                if team_players:
                    team_counts[team_name] = len(team_players)
            
            stats = {
                'totalPlayers': len(active_players),
                'avgPoints': round(avg_points, 1),
                'avgPrice': round(avg_price, 1),
                'avgPointsPerGame': round(avg_ppg, 2),
                
                'topScorer': {
                    'name': top_scorer['web_name'],
                    'fullName': f"{top_scorer['first_name']} {top_scorer['second_name']}",
                    'points': top_scorer['total_points'],
                    'totalPoints': top_scorer['total_points'],
                    'team': teams.get(top_scorer['team'], 'Unknown'),
                    'position': positions.get(top_scorer['element_type'], 'Unknown')
                },
                
                'bestValue': {
                    'name': best_value_player['web_name'],
                    'fullName': f"{best_value_player['first_name']} {best_value_player['second_name']}",
                    'pointsPerMillion': round(best_value_player['total_points'] / (best_value_player['now_cost'] / 10), 1),
                    'points': best_value_player['total_points'],
                    'price': round(best_value_player['now_cost'] / 10, 1),
                    'team': teams.get(best_value_player['team'], 'Unknown'),
                    'position': positions.get(best_value_player['element_type'], 'Unknown')
                },
                
                'mostConsistent': {
                    'name': highest_ppg['web_name'],
                    'fullName': f"{highest_ppg['first_name']} {highest_ppg['second_name']}",
                    'pointsPerGame': float(highest_ppg['points_per_game']) if highest_ppg['points_per_game'] else 0,
                    'totalPoints': highest_ppg['total_points'],
                    'team': teams.get(highest_ppg['team'], 'Unknown'),
                    'position': positions.get(highest_ppg['element_type'], 'Unknown')
                },
                
                'mostOwned': {
                    'name': most_owned['web_name'],
                    'fullName': f"{most_owned['first_name']} {most_owned['second_name']}",
                    'ownership': float(most_owned['selected_by_percent']) if most_owned['selected_by_percent'] else 0,
                    'totalPoints': most_owned['total_points'],
                    'team': teams.get(most_owned['team'], 'Unknown'),
                    'position': positions.get(most_owned['element_type'], 'Unknown')
                },
                
                'positionBreakdown': position_counts,
                'positionAverages': {k: round(v, 1) for k, v in position_avg_points.items()},
                'teamBreakdown': team_counts,
                
                'dataRange': 'Current season (Real FPL API data)',
                'lastUpdated': '2024-12-19T12:00:00Z',
                'source': 'Fantasy Premier League Official API',
                
                'insights': {
                    'highestScoringPosition': max(position_avg_points.items(), key=lambda x: x[1])[0] if position_avg_points else 'Unknown',
                    'totalGoalsScored': sum(p['goals_scored'] for p in active_players),
                    'totalAssists': sum(p['assists'] for p in active_players),
                    'totalCleanSheets': sum(p['clean_sheets'] for p in active_players),
                    'averageOwnership': round(sum(float(p['selected_by_percent']) if p['selected_by_percent'] else 0 for p in active_players) / len(active_players), 1)
                }
            }
            
            print("Statistics calculated successfully")
            self.wfile.write(json.dumps(stats).encode())
            
        except requests.exceptions.RequestException as e:
            print(f"API request error: {e}")
            error_response = {
                'error': f'Failed to fetch FPL statistics: API request failed - {str(e)}',
                'totalPlayers': 0,
                'avgPoints': 0,
                'avgPrice': 0,
                'topScorer': {'name': 'N/A', 'points': 0},
                'bestValue': {'name': 'N/A', 'pointsPerMillion': 0},
                'message': 'The Fantasy Premier League API may be temporarily unavailable'
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