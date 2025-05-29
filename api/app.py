# Python Flask API for FPL Data - Last 3 Years Real Data Only

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app) 

class FPLHistoricalDataProcessor:
    def __init__(self):
        self.base_url = "https://fantasy.premierleague.com/api"
        self.players_data = None
        self.historical_data = None
        self.teams_data = None
        self.positions_data = None
        self.current_season = None
        self.last_updated = None
        self.seasons_to_fetch = 3  # Last 3 years
        
    def get_current_season_info(self):
        """Determine current and previous seasons based on current date"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        # FPL season runs from August to May
        if current_month >= 8:  # August onwards = new season
            current_season_start = current_year
        else:  # January to July = previous season
            current_season_start = current_year - 1
            
        seasons = []
        for i in range(self.seasons_to_fetch):
            season_start = current_season_start - i
            season_end = season_start + 1
            seasons.append({
                'start_year': season_start,
                'end_year': season_end,
                'season_name': f"{season_start}/{str(season_end)[2:]}",
                'is_current': i == 0
            })
            
        logger.info(f"Analyzing seasons: {[s['season_name'] for s in seasons]}")
        return seasons
    
    def fetch_current_season_data(self):
        """Fetch current season data from FPL API"""
        try:
            logger.info("Fetching current season data from FPL API...")
            
            # Get bootstrap data (current season)
            response = requests.get(f"{self.base_url}/bootstrap-static/", timeout=30)
            response.raise_for_status()
            current_data = response.json()
            
            # Store teams and positions data
            teams_df = pd.DataFrame(current_data['teams'])
            self.teams_data = teams_df.set_index('id')['name'].to_dict()
            
            positions_df = pd.DataFrame(current_data['element_types'])
            self.positions_data = positions_df.set_index('id')['singular_name'].to_dict()
            
            # Get current gameweek info
            events = current_data['events']
            current_gw = next((gw['id'] for gw in events if gw['is_current']), len(events))
            
            logger.info(f"Current gameweek: {current_gw}")
            
            return current_data, current_gw
            
        except Exception as e:
            logger.error(f"Error fetching current season data: {e}")
            raise
    
    def fetch_player_historical_data(self, player_id, max_retries=3):
        """Fetch historical data for a specific player"""
        for attempt in range(max_retries):
            try:
                response = requests.get(
                    f"{self.base_url}/element-summary/{player_id}/", 
                    timeout=15
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.warning(f"Failed to fetch data for player {player_id} after {max_retries} attempts: {e}")
                    return None
                time.sleep(1)  # Brief delay before retry
    
    def process_historical_data_batch(self, player_ids, batch_size=20):
        """Process historical data for players in batches with threading"""
        all_historical_data = {}
        
        # Process in batches to avoid overwhelming the API
        for i in range(0, len(player_ids), batch_size):
            batch = player_ids[i:i + batch_size]
            batch_data = {}
            
            logger.info(f"Processing batch {i//batch_size + 1}/{(len(player_ids) + batch_size - 1)//batch_size} ({len(batch)} players)")
            
            # Use threading for concurrent requests within batch
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_player = {
                    executor.submit(self.fetch_player_historical_data, player_id): player_id 
                    for player_id in batch
                }
                
                for future in as_completed(future_to_player):
                    player_id = future_to_player[future]
                    try:
                        data = future.result()
                        if data:
                            batch_data[player_id] = data
                    except Exception as e:
                        logger.warning(f"Error processing player {player_id}: {e}")
            
            all_historical_data.update(batch_data)
            
            # Rate limiting - small delay between batches
            if i + batch_size < len(player_ids):
                time.sleep(0.5)
        
        return all_historical_data
    
    def calculate_3_year_aggregated_stats(self, current_data, historical_data):
        """Calculate comprehensive 3-year aggregated statistics"""
        players_df = pd.DataFrame(current_data['elements'])
        
        # Filter only currently active players (played this season)
        active_players = players_df[players_df['minutes'] >= 90].copy()
        
        logger.info(f"Processing {len(active_players)} active players for 3-year analysis")
        
        # Get active player IDs
        active_player_ids = active_players['id'].tolist()
        
        # Fetch historical data for active players only
        player_historical = self.process_historical_data_batch(active_player_ids)
        
        # Calculate 3-year stats for each player
        three_year_stats = []
        
        for _, player in active_players.iterrows():
            player_id = player['id']
            
            # Current season stats
            current_stats = {
                'total_points': player['total_points'],
                'goals': player['goals_scored'],
                'assists': player['assists'],
                'clean_sheets': player['clean_sheets'],
                'minutes': player['minutes'],
                'bonus': player['bonus'],
                'saves': player['saves'],
                'goals_conceded': player['goals_conceded'],
                'yellow_cards': player['yellow_cards'],
                'red_cards': player['red_cards']
            }
            
            # Historical stats aggregation
            historical_stats = {
                'total_points': 0,
                'goals': 0,
                'assists': 0,
                'clean_sheets': 0,
                'minutes': 0,
                'bonus': 0,
                'saves': 0,
                'goals_conceded': 0,
                'yellow_cards': 0,
                'red_cards': 0
            }
            
            seasons_played = 1  # Current season
            
            # Add historical data if available
            if player_id in player_historical and player_historical[player_id]:
                hist_data = player_historical[player_id]
                
                # Process previous seasons
                if 'history_past' in hist_data:
                    for season_data in hist_data['history_past'][-2:]:  # Last 2 previous seasons
                        historical_stats['total_points'] += season_data.get('total_points', 0)
                        historical_stats['goals'] += season_data.get('goals_scored', 0)
                        historical_stats['assists'] += season_data.get('assists', 0)
                        historical_stats['clean_sheets'] += season_data.get('clean_sheets', 0)
                        historical_stats['minutes'] += season_data.get('minutes', 0)
                        historical_stats['bonus'] += season_data.get('bonus', 0)
                        historical_stats['saves'] += season_data.get('saves', 0)
                        historical_stats['goals_conceded'] += season_data.get('goals_conceded', 0)
                        historical_stats['yellow_cards'] += season_data.get('yellow_cards', 0)
                        historical_stats['red_cards'] += season_data.get('red_cards', 0)
                        seasons_played += 1
            
            # Combine current + historical stats
            combined_stats = {
                'total_points': current_stats['total_points'] + historical_stats['total_points'],
                'goals': current_stats['goals'] + historical_stats['goals'],
                'assists': current_stats['assists'] + historical_stats['assists'],
                'clean_sheets': current_stats['clean_sheets'] + historical_stats['clean_sheets'],
                'minutes': current_stats['minutes'] + historical_stats['minutes'],
                'bonus': current_stats['bonus'] + historical_stats['bonus'],
                'saves': current_stats['saves'] + historical_stats['saves'],
                'goals_conceded': current_stats['goals_conceded'] + historical_stats['goals_conceded'],
                'yellow_cards': current_stats['yellow_cards'] + historical_stats['yellow_cards'],
                'red_cards': current_stats['red_cards'] + historical_stats['red_cards']
            }
            
            # Calculate derived metrics
            total_games = max(combined_stats['minutes'] / 90, 1)
            price = player['now_cost'] / 10
            
            player_stats = {
                'id': int(player['id']),
                'name': player['web_name'],
                'fullName': f"{player['first_name']} {player['second_name']}",
                'team': self.teams_data.get(player['team'], 'Unknown'),
                'teamId': int(player['team']),
                'position': self.positions_data.get(player['element_type'], 'Unknown'),
                'positionId': int(player['element_type']),
                'price': price,
                
                # 3-year aggregated stats
                'totalPoints': combined_stats['total_points'],
                'goals': combined_stats['goals'],
                'assists': combined_stats['assists'],
                'cleanSheets': combined_stats['clean_sheets'],
                'totalMinutes': combined_stats['minutes'],
                'bonus': combined_stats['bonus'],
                'saves': combined_stats['saves'],
                'goalsConceded': combined_stats['goals_conceded'],
                'yellowCards': combined_stats['yellow_cards'],
                'redCards': combined_stats['red_cards'],
                'seasonsPlayed': seasons_played,
                
                # Current season specific
                'currentSeasonPoints': current_stats['total_points'],
                'ppg': float(player['points_per_game']) if player['points_per_game'] else 0,
                'form': float(player['form']) if player['form'] else 0,
                'ownership': float(player['selected_by_percent']) if player['selected_by_percent'] else 0,
                'ictIndex': float(player['ict_index']) if player['ict_index'] else 0,
                'influence': float(player['influence']) if player['influence'] else 0,
                'creativity': float(player['creativity']) if player['creativity'] else 0,
                'threat': float(player['threat']) if player['threat'] else 0,
                'transfersIn': int(player['transfers_in_event']) if player['transfers_in_event'] else 0,
                'transfersOut': int(player['transfers_out_event']) if player['transfers_out_event'] else 0,
                'status': player['status'],
                'news': player['news'] if player['news'] else '',
                
                # Calculated 3-year metrics
                'avgPointsPerSeason': round(combined_stats['total_points'] / seasons_played, 1),
                'pointsPerMillion': round(combined_stats['total_points'] / price, 1),
                'gamesPlayed': int(total_games),
                'avgPointsPerGame': round(combined_stats['total_points'] / total_games, 2),
                'goalsPerGame': round(combined_stats['goals'] / total_games, 2),
                'assistsPerGame': round(combined_stats['assists'] / total_games, 2),
                'goalInvolvement': combined_stats['goals'] + combined_stats['assists'],
                'goalInvolvementPerGame': round((combined_stats['goals'] + combined_stats['assists']) / total_games, 2),
                'cleanSheetPercentage': round((combined_stats['clean_sheets'] / total_games) * 100, 1) if player['element_type'] in [1, 2] else 0,  # GK and DEF only
                'availabilityScore': round((combined_stats['minutes'] / (seasons_played * 38 * 90)) * 100, 1),
                'consistencyScore': round((combined_stats['total_points'] / max(seasons_played, 1)) / max(price, 1), 1)
            }
            
            three_year_stats.append(player_stats)
        
        # Calculate overall performance score
        df = pd.DataFrame(three_year_stats)
        
        # Normalize key metrics for overall score
        metrics_for_scoring = ['totalPoints', 'pointsPerMillion', 'avgPointsPerGame', 'availabilityScore', 'consistencyScore']
        
        for metric in metrics_for_scoring:
            if df[metric].max() > df[metric].min():
                df[f'{metric}_norm'] = (df[metric] - df[metric].min()) / (df[metric].max() - df[metric].min())
            else:
                df[f'{metric}_norm'] = 1.0
        
        # Calculate weighted overall score
        weights = {
            'totalPoints_norm': 0.35,      # Total output over 3 years
            'pointsPerMillion_norm': 0.25,  # Value for money
            'avgPointsPerGame_norm': 0.20,  # Consistency when playing
            'availabilityScore_norm': 0.15,  # Availability/injury record
            'consistencyScore_norm': 0.05   # Long-term consistency
        }
        
        df['overallScore'] = sum(df[f'{metric}_norm'] * weight for metric, weight in weights.items())
        df['overallScore'] = (df['overallScore'] * 100).round(1)
        
        # Convert back to list of dictionaries
        for i, row in df.iterrows():
            three_year_stats[i]['overallScore'] = row['overallScore']
        
        return three_year_stats
    
    def fetch_fpl_data(self):
        """Fetch and process 3-year FPL data"""
        try:
            logger.info("=== Starting 3-Year FPL Data Analysis ===")
            
            # Get current season data
            current_data, current_gw = self.fetch_current_season_data()
            
            # Calculate 3-year aggregated statistics
            logger.info("Calculating 3-year aggregated player statistics...")
            self.players_data = self.calculate_3_year_aggregated_stats(current_data, {})
            
            self.last_updated = datetime.now().isoformat()
            
            logger.info(f"=== 3-Year Analysis Complete: {len(self.players_data)} players ===")
            return True
            
        except Exception as e:
            logger.error(f"Error in fetch_fpl_data: {e}")
            return False
    
    def get_players_data(self):
        """Get processed 3-year players data"""
        if self.players_data is None:
            success = self.fetch_fpl_data()
            if not success:
                raise Exception("Failed to fetch FPL data - no sample data available")
        
        return self.players_data
    
    def get_summary_stats(self):
        """Get 3-year summary statistics"""
        if self.players_data is None:
            success = self.fetch_fpl_data()
            if not success:
                raise Exception("Failed to fetch FPL data - no sample data available")
        
        df = pd.DataFrame(self.players_data)
        
        stats = {
            'totalPlayers': len(df),
            'avgPoints': float(df['totalPoints'].mean().round(1)),
            'avgPointsPerSeason': float(df['avgPointsPerSeason'].mean().round(1)),
            'avgPrice': float(df['price'].mean().round(1)),
            'topScorer': {
                'name': df.loc[df['totalPoints'].idxmax(), 'name'],
                'points': int(df['totalPoints'].max()),
                'totalPoints': int(df['totalPoints'].max())
            },
            'bestValue': {
                'name': df.loc[df['pointsPerMillion'].idxmax(), 'name'],
                'pointsPerMillion': float(df['pointsPerMillion'].max().round(1))
            },
            'mostConsistent': {
                'name': df.loc[df['overallScore'].idxmax(), 'name'],
                'overallScore': float(df['overallScore'].max().round(1))
            },
            'dataRange': '3 years (current + 2 previous seasons)',
            'lastUpdated': self.last_updated
        }
        return stats

# Initialize FPL data processor
fpl_processor = FPLHistoricalDataProcessor()

@app.route('/')
def home():
    """Health check endpoint"""
    return jsonify({
        'status': 'FPL 3-Year Analysis API is running',
        'version': '2.0.0',
        'dataRange': '3 years of FPL data',
        'features': [
            '3-year aggregated player statistics',
            'Historical performance analysis', 
            'No sample data - real data only',
            'Advanced consistency metrics'
        ],
        'endpoints': ['/api/players', '/api/stats', '/api/refresh', '/api/top-players', '/api/team-optimizer']
    })

@app.route('/api/players')
def get_players():
    """Get all players 3-year data with optional filters"""
    try:
        # Get query parameters for filtering
        position = request.args.get('position', 'all').lower()
        max_price = request.args.get('maxPrice', type=float)
        min_points = request.args.get('minPoints', type=int, default=0)
        min_seasons = request.args.get('minSeasons', type=int, default=1)
        team = request.args.get('team', '').lower()
        search = request.args.get('search', '').lower()
        
        players = fpl_processor.get_players_data()
        
        # Apply filters
        filtered_players = players
        
        if position != 'all':
            filtered_players = [p for p in filtered_players if p['position'].lower() == position]
        
        if max_price:
            filtered_players = [p for p in filtered_players if p['price'] <= max_price]
            
        if min_points > 0:
            filtered_players = [p for p in filtered_players if p['totalPoints'] >= min_points]
            
        if min_seasons > 1:
            filtered_players = [p for p in filtered_players if p['seasonsPlayed'] >= min_seasons]
            
        if team:
            filtered_players = [p for p in filtered_players if team in p['team'].lower()]
            
        if search:
            filtered_players = [p for p in filtered_players 
                              if search in p['name'].lower() or search in p['team'].lower()]
        
        return jsonify({
            'players': filtered_players,
            'count': len(filtered_players),
            'dataRange': '3 years (current + 2 previous seasons)',
            'lastUpdated': fpl_processor.last_updated
        })
        
    except Exception as e:
        logger.error(f"Error in get_players: {e}")
        return jsonify({'error': f'Failed to fetch player data: {str(e)}'}), 500

@app.route('/api/stats')
def get_stats():
    """Get 3-year summary statistics"""
    try:
        stats = fpl_processor.get_summary_stats()            
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"Error in get_stats: {e}")
        return jsonify({'error': f'Failed to fetch statistics: {str(e)}'}), 500

@app.route('/api/refresh', methods=['POST'])
def refresh_data():
    """Manually refresh 3-year FPL data"""
    try:
        logger.info("Manual 3-year data refresh requested")
        success = fpl_processor.fetch_fpl_data()
        
        if success:
            return jsonify({
                'status': 'success',
                'message': '3-year FPL data refreshed successfully',
                'dataRange': '3 years (current + 2 previous seasons)',
                'lastUpdated': fpl_processor.last_updated,
                'playerCount': len(fpl_processor.players_data) if fpl_processor.players_data else 0
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to refresh 3-year data'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in refresh_data: {e}")
        return jsonify({'error': f'Failed to refresh data: {str(e)}'}), 500

@app.route('/api/top-players')
def get_top_players():
    """Get top players by various 3-year metrics"""
    try:
        metric = request.args.get('metric', 'totalPoints')
        limit = request.args.get('limit', type=int, default=15)
        position = request.args.get('position', 'all').lower()
        min_seasons = request.args.get('minSeasons', type=int, default=2)
        
        players = fpl_processor.get_players_data()
        
        # Filter by position and minimum seasons
        filtered_players = players
        if position != 'all':
            filtered_players = [p for p in filtered_players if p['position'].lower() == position]
        
        filtered_players = [p for p in filtered_players if p['seasonsPlayed'] >= min_seasons]
        
        # Sort by specified metric
        metric_map = {
            'totalPoints': 'totalPoints',
            'pointsPerMillion': 'pointsPerMillion', 
            'avgPointsPerSeason': 'avgPointsPerSeason',
            'avgPointsPerGame': 'avgPointsPerGame',
            'overallScore': 'overallScore',
            'consistencyScore': 'consistencyScore',
            'goalInvolvement': 'goalInvolvement',
            'availabilityScore': 'availabilityScore'
        }
        
        sort_key = metric_map.get(metric, 'totalPoints')
        sorted_players = sorted(filtered_players, key=lambda x: x[sort_key], reverse=True)
        
        return jsonify({
            'players': sorted_players[:limit],
            'metric': metric,
            'count': len(sorted_players[:limit]),
            'dataRange': '3 years (current + 2 previous seasons)',
            'minSeasons': min_seasons
        })
        
    except Exception as e:
        logger.error(f"Error in get_top_players: {e}")
        return jsonify({'error': f'Failed to fetch top players: {str(e)}'}), 500

@app.route('/api/team-optimizer')
def optimize_team():
    """Get optimized team selection based on 3-year data"""
    try:
        budget = request.args.get('budget', type=float, default=100.0)
        formation = request.args.get('formation', default='3-5-2')
        min_seasons = request.args.get('minSeasons', type=int, default=2)
        optimization_metric = request.args.get('metric', default='overallScore')
        
        formations = {
            '3-5-2': {'Goalkeeper': 1, 'Defender': 3, 'Midfielder': 5, 'Forward': 2},
            '3-4-3': {'Goalkeeper': 1, 'Defender': 3, 'Midfielder': 4, 'Forward': 3},
            '4-4-2': {'Goalkeeper': 1, 'Defender': 4, 'Midfielder': 4, 'Forward': 2},
            '4-3-3': {'Goalkeeper': 1, 'Defender': 4, 'Midfielder': 3, 'Forward': 3},
            '5-3-2': {'Goalkeeper': 1, 'Defender': 5, 'Midfielder': 3, 'Forward': 2}
        }
        
        if formation not in formations:
            formation = '3-5-2'
        
        players = fpl_processor.get_players_data()
        
        # Filter by minimum seasons played
        experienced_players = [p for p in players if p['seasonsPlayed'] >= min_seasons]
        
        requirements = formations[formation]
        selected_team = []
        total_cost = 0
        
        # Optimize by specified metric (default: overallScore)
        for position, count in requirements.items():
            position_players = [p for p in experienced_players if p['position'] == position]
            position_players.sort(key=lambda x: x[optimization_metric], reverse=True)
            
            selected = 0
            for player in position_players:
                if selected < count and total_cost + player['price'] <= budget:
                    selected_team.append(player)
                    total_cost += player['price']
                    selected += 1
                if selected == count:
                    break
        
        total_points = sum(p['totalPoints'] for p in selected_team)
        avg_overall_score = sum(p['overallScore'] for p in selected_team) / len(selected_team) if selected_team else 0
        
        return jsonify({
            'team': selected_team,
            'formation': formation,
            'totalCost': round(total_cost, 1),
            'remainingBudget': round(budget - total_cost, 1),
            'total3YearPoints': total_points,
            'avgOverallScore': round(avg_overall_score, 1),
            'playerCount': len(selected_team),
            'optimizationMetric': optimization_metric,
            'minSeasons': min_seasons,
            'dataRange': '3 years (current + 2 previous seasons)'
        })
        
    except Exception as e:
        logger.error(f"Error in optimize_team: {e}")
        return jsonify({'error': f'Failed to optimize team: {str(e)}'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Load 3-year data on startup
    logger.info("Starting FPL 3-Year Analysis API server...")
    logger.info("Note: Initial data load may take 2-3 minutes due to historical data processing")
    
    # Don't fetch on startup in production to avoid timeouts
    # Data will be fetched on first request
    
    # Run the app
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)