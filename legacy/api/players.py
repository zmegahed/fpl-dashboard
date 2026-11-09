from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import ssl
import csv
from urllib.parse import urlparse, parse_qs
from io import StringIO
import statistics

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            # Parse URL to determine endpoint
            url_path = urlparse(self.path).path
            query_params = parse_qs(urlparse(self.path).query)
            
            if 'optimal-squad' in self.path:
                response = self.get_optimal_squad(query_params)
            elif 'player-search' in self.path:
                response = self.search_player_history(query_params)
            else:
                response = self.get_3year_analysis()
            
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            print(f"Error: {e}")
            error_response = {
                'error': str(e),
                'players': [],
                'count': 0,
                'message': 'Failed to fetch player data'
            }
            self.wfile.write(json.dumps(error_response).encode())

    def get_current_season_data(self):
        """Get current season data from FPL API"""
        ssl_context = ssl.create_default_context()
        req = urllib.request.Request(
            'https://fantasy.premierleague.com/api/bootstrap-static/',
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        
        with urllib.request.urlopen(req, context=ssl_context, timeout=30) as response:
            fpl_data = json.loads(response.read().decode('utf-8'))
        
        teams = {team['id']: team['name'] for team in fpl_data.get('teams', [])}
        positions = {pos['id']: pos['singular_name'] for pos in fpl_data.get('element_types', [])}
        
        current_players = {}
        for player in fpl_data.get('elements', []):
            if player.get('minutes', 0) >= 90:
                full_name = f"{player.get('first_name', '')} {player.get('second_name', '')}".strip()
                current_players[full_name] = {
                    'id': player.get('id', 0),
                    'name': player.get('web_name', 'Unknown'),
                    'full_name': full_name,
                    'team': teams.get(player.get('team', 0), 'Unknown'),
                    'position': positions.get(player.get('element_type', 0), 'Unknown'),
                    'price': round(player.get('now_cost', 0) / 10, 1),
                    'total_points': player.get('total_points', 0),
                    'ppg': float(player.get('points_per_game', 0)) if player.get('points_per_game') else 0,
                    'goals': player.get('goals_scored', 0),
                    'assists': player.get('assists', 0),
                    'clean_sheets': player.get('clean_sheets', 0),
                    'minutes': player.get('minutes', 0),
                    'form': float(player.get('form', 0)) if player.get('form') else 0,
                    'ownership': float(player.get('selected_by_percent', 0)) if player.get('selected_by_percent') else 0
                }
        
        return current_players

    def get_historical_data(self, seasons=['2022-23', '2023-24']):
        """Get real historical data from GitHub"""
        historical_data = {}
        
        for season in seasons:
            try:
                print(f"Fetching real data for {season}...")
                url = f"https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/{season}/cleaned_players.csv"
                
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=30) as response:
                    csv_content = response.read().decode('utf-8')
                
                season_data = {}
                csv_reader = csv.DictReader(StringIO(csv_content))
                
                for row in csv_reader:
                    try:
                        first_name = row.get('first_name', '').strip()
                        second_name = row.get('second_name', '').strip()
                        full_name = f"{first_name} {second_name}".strip()
                        
                        if not full_name:
                            continue
                        
                        position_map = {'1': 'Goalkeeper', '2': 'Defender', '3': 'Midfielder', '4': 'Forward'}
                        position = position_map.get(str(row.get('element_type', '0')), 'Unknown')
                        
                        season_data[full_name] = {
                            'season': season,
                            'total_points': int(row.get('total_points', 0)),
                            'goals': int(row.get('goals_scored', 0)),
                            'assists': int(row.get('assists', 0)),
                            'clean_sheets': int(row.get('clean_sheets', 0)),
                            'minutes': int(row.get('minutes', 0)),
                            'games_played': max(1, int(row.get('minutes', 0)) // 90),
                            'start_cost': float(row.get('start_cost', 0)) / 10 if row.get('start_cost') else 0,
                            'end_cost': float(row.get('end_cost', 0)) / 10 if row.get('end_cost') else 0,
                            'position': position,
                            'team': row.get('team', 'Unknown'),
                            'ppg': float(row.get('points_per_game', 0)) if row.get('points_per_game') else 0
                        }
                    except (ValueError, TypeError):
                        continue
                
                historical_data[season] = season_data
                print(f"Loaded {len(season_data)} players for {season}")
                
            except Exception as e:
                print(f"Failed to load {season}: {e}")
                continue
        
        return historical_data

    def get_3year_analysis(self):
        """Get complete 3-year analysis"""
        try:
            current_data = self.get_current_season_data()
            historical_data = self.get_historical_data()
            
            three_year_players = []
            
            for player_name, current_stats in current_data.items():
                # Build 3-year profile
                player_profile = {
                    **current_stats,
                    'season_data': {
                        '2024-25': {
                            'season': '2024-25',
                            'total_points': current_stats['total_points'],
                            'goals': current_stats['goals'],
                            'assists': current_stats['assists'],
                            'clean_sheets': current_stats['clean_sheets'],
                            'minutes': current_stats['minutes'],
                            'games_played': max(1, current_stats['minutes'] // 90),
                            'ppg': current_stats['ppg'],
                            'price_start': current_stats['price'],
                            'price_end': current_stats['price']
                        }
                    },
                    'seasons_found': 1
                }
                
                # Add historical seasons
                for season in ['2023-24', '2022-23']:
                    if season in historical_data and player_name in historical_data[season]:
                        player_profile['season_data'][season] = historical_data[season][player_name]
                        player_profile['seasons_found'] += 1
                
                # Calculate 3-year metrics
                metrics = self.calculate_3year_metrics(player_profile['season_data'])
                player_profile['three_year_metrics'] = metrics
                
                three_year_players.append(player_profile)
            
            # Sort by 3-year total points
            three_year_players.sort(key=lambda x: x['three_year_metrics']['total_3year_points'], reverse=True)
            
            return {
                'players': three_year_players,
                'count': len(three_year_players),
                'data_source': 'Real 3-Year Historical Data',
                'seasons_analyzed': ['2022-23', '2023-24', '2024-25'],
                'last_updated': '2024-12-19T12:00:00Z'
            }
            
        except Exception as e:
            print(f"Error in 3-year analysis: {e}")
            return {
                'error': str(e),
                'players': [],
                'count': 0
            }

    def calculate_3year_metrics(self, season_data):
        """Calculate metrics from real 3-year data"""
        seasons = list(season_data.values())
        
        if not seasons:
            return {}
        
        # Basic totals
        total_points = [s['total_points'] for s in seasons]
        total_games = [s['games_played'] for s in seasons]
        total_minutes = [s['minutes'] for s in seasons]
        
        total_3year_points = sum(total_points)
        avg_points_per_season = total_3year_points / len(seasons)
        avg_games_per_season = sum(total_games) / len(seasons)
        
        # Consistency (lower variance = more consistent)
        if len(total_points) > 1:
            points_std = statistics.stdev(total_points)
            points_mean = statistics.mean(total_points)
            cv = points_std / max(points_mean, 1)
            consistency_score = max(0, min(100, 100 - (cv * 50)))
        else:
            consistency_score = 50
        
        # Reliability
        reliable_starter = avg_games_per_season >= 25
        
        # Availability
        max_possible_minutes = len(seasons) * 38 * 90
        availability_score = (sum(total_minutes) / max_possible_minutes) * 100
        
        # Performance trend
        if len(total_points) >= 2:
            trend = 'improving' if total_points[-1] > total_points[0] else 'declining' if total_points[-1] < total_points[0] else 'stable'
        else:
            trend = 'unknown'
        
        return {
            'total_3year_points': total_3year_points,
            'avg_points_per_season': round(avg_points_per_season, 1),
            'best_season': max(total_points),
            'worst_season': min(total_points),
            'consistency_score': round(consistency_score, 1),
            'avg_games_per_season': round(avg_games_per_season, 1),
            'reliable_starter': reliable_starter,
            'availability_score': round(availability_score, 1),
            'performance_trend': trend,
            'seasons_analyzed': len(seasons)
        }

    def get_optimal_squad(self, query_params):
        """Generate optimal squad based on 3-year data"""
        try:
            budget = float(query_params.get('budget', [100])[0])
            formation = query_params.get('formation', ['3-5-2'])[0]
            
            # Get 3-year analysis
            analysis = self.get_3year_analysis()
            players = analysis['players']
            
            # Parse formation
            parts = formation.split('-')
            requirements = {
                'Goalkeeper': 1,
                'Defender': int(parts[0]) if len(parts) > 0 else 3,
                'Midfielder': int(parts[1]) if len(parts) > 1 else 5,
                'Forward': int(parts[2]) if len(parts) > 2 else 2
            }
            
            # Group by position and sort by value
            players_by_position = {}
            for player in players:
                position = player['position']
                if position not in players_by_position:
                    players_by_position[position] = []
                
                # Calculate value score (3-year points per current price)
                value_score = player['three_year_metrics']['avg_points_per_season'] / max(player['price'], 0.1)
                consistency_bonus = player['three_year_metrics']['consistency_score'] / 100
                reliability_bonus = 1.2 if player['three_year_metrics']['reliable_starter'] else 1.0
                
                player['value_score'] = value_score * consistency_bonus * reliability_bonus
                players_by_position[position].append(player)
            
            # Sort each position by value score
            for position in players_by_position:
                players_by_position[position].sort(key=lambda x: x['value_score'], reverse=True)
            
            # Select optimal squad
            squad = {position: [] for position in requirements.keys()}
            squad['all_players'] = []
            remaining_budget = budget
            
            for position, required_count in requirements.items():
                if position in players_by_position:
                    selected = 0
                    for player in players_by_position[position]:
                        if selected < required_count and player['price'] <= remaining_budget:
                            squad[position].append(player)
                            squad['all_players'].append(player)
                            remaining_budget -= player['price']
                            selected += 1
            
            total_cost = budget - remaining_budget
            predicted_points = sum(p['three_year_metrics']['avg_points_per_season'] for p in squad['all_players'])
            
            return {
                'success': True,
                'formation': formation,
                'budget': budget,
                'squad': squad,
                'total_cost': round(total_cost, 1),
                'remaining_budget': round(remaining_budget, 1),
                'predicted_total_points': round(predicted_points, 1),
                'squad_analysis': {
                    'avg_consistency': round(sum(p['three_year_metrics']['consistency_score'] for p in squad['all_players']) / len(squad['all_players']), 1),
                    'reliable_starters': sum(1 for p in squad['all_players'] if p['three_year_metrics']['reliable_starter']),
                    'data_quality': f"{len(squad['all_players'])} players with 3-year analysis"
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def search_player_history(self, query_params):
        """Search for specific player's 3-year history"""
        try:
            search_term = query_params.get('q', [''])[0].lower()
            
            if not search_term:
                return {'players': [], 'message': 'No search term provided'}
            
            analysis = self.get_3year_analysis()
            players = analysis['players']
            
            # Filter players by search term
            matching_players = []
            for player in players:
                if (search_term in player['name'].lower() or 
                    search_term in player['full_name'].lower() or 
                    search_term in player['team'].lower()):
                    
                    # Format season data for display
                    seasons_display = []
                    for season, data in player['season_data'].items():
                        seasons_display.append({
                            'season': season,
                            'total_points': data['total_points'],
                            'goals': data['goals'],
                            'assists': data['assists'],
                            'clean_sheets': data['clean_sheets'],
                            'games_played': data['games_played'],
                            'ppg': round(data['total_points'] / max(data['games_played'], 1), 2),
                            'minutes': data['minutes'],
                            'price_start': data.get('price_start', player['price']),
                            'price_end': data.get('price_end', player['price'])
                        })
                    
                    matching_players.append({
                        'id': player['id'],
                        'name': player['name'],
                        'full_name': player['full_name'],
                        'team': player['team'],
                        'position': player['position'],
                        'current_price': player['price'],
                        'seasons_data': sorted(seasons_display, key=lambda x: x['season'], reverse=True),
                        'three_year_summary': player['three_year_metrics'],
                        'seasons_found': player['seasons_found']
                    })
            
            return {
                'players': matching_players[:20],  # Limit results
                'count': len(matching_players),
                'search_term': search_term
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'players': []
            }

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
