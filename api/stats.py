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
