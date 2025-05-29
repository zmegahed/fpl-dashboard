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