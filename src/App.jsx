import React, { useState, useEffect, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, Users, Award, Target, Star, Shield, Activity, Database,
         Filter, Search, RefreshCw, AlertCircle, CheckCircle, Clock, Zap, Trophy, 
         BarChart3, Settings, Info, ExternalLink, User } from 'lucide-react';

const CompleteFPLDashboard = () => {
  const [threeYearData, setThreeYearData] = useState([]);
  const [optimalSquad, setOptimalSquad] = useState(null);
  const [playerSearchResults, setPlayerSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [maxPrice, setMaxPrice] = useState(15);
  const [minConsistency, setMinConsistency] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  
  // Squad builder settings
  const [budget, setBudget] = useState(100);
  const [formation, setFormation] = useState('3-5-2');

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching 3-year analysis data...');
      
      // Fetch 3-year analysis
      const playersResponse = await fetch('/api/players');
      if (!playersResponse.ok) {
        throw new Error(`Players API error! status: ${playersResponse.status}`);
      }
      
      const playersData = await playersResponse.json();
      
      if (playersData.error) {
        throw new Error(playersData.error);
      }
      
      console.log(`Loaded ${playersData.players?.length || 0} players with 3-year data`);
      setThreeYearData(playersData.players || []);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch optimal squad
  const fetchOptimalSquad = async () => {
    try {
      const squadResponse = await fetch(`/api/players?optimal-squad&budget=${budget}&formation=${formation}`);
      if (squadResponse.ok) {
        const squadData = await squadResponse.json();
        if (squadData.success) {
          setOptimalSquad(squadData);
        }
      }
    } catch (err) {
      console.error('Error fetching optimal squad:', err);
    }
  };

  // Search for specific player
  const searchPlayer = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setPlayerSearchResults([]);
      return;
    }
    
    try {
      const searchResponse = await fetch(`/api/players?player-search&q=${encodeURIComponent(searchQuery)}`);
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        setPlayerSearchResults(searchData.players || []);
      }
    } catch (err) {
      console.error('Error searching players:', err);
      setPlayerSearchResults([]);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (threeYearData.length > 0) {
      fetchOptimalSquad();
    }
  }, [budget, formation, threeYearData]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPlayer(playerSearchTerm);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [playerSearchTerm]);

  // Filter players
  const filteredPlayers = useMemo(() => {
    return threeYearData.filter(player => {
      const matchesPosition = selectedPosition === 'All' || player.position === selectedPosition;
      const matchesPrice = player.price <= maxPrice;
      const matchesConsistency = (player.three_year_metrics?.consistency_score || 0) >= minConsistency;
      const matchesSearch = searchTerm === '' || 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesPosition && matchesPrice && matchesConsistency && matchesSearch;
    });
  }, [threeYearData, selectedPosition, maxPrice, minConsistency, searchTerm]);

  // Calculate insights
  const insights = useMemo(() => {
    if (filteredPlayers.length === 0) return {};
    
    const full3YearData = filteredPlayers.filter(p => p.seasons_found === 3).length;
    const avgConsistency = filteredPlayers.reduce((sum, p) => sum + (p.three_year_metrics?.consistency_score || 0), 0) / filteredPlayers.length;
    const reliableStarters = filteredPlayers.filter(p => p.three_year_metrics?.reliable_starter).length;
    
    return {
      totalAnalyzed: filteredPlayers.length,
      full3YearData,
      avgConsistency: avgConsistency.toFixed(1),
      reliableStarters,
      dataQuality: ((full3YearData / filteredPlayers.length) * 100).toFixed(1)
    };
  }, [filteredPlayers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 animate-spin text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading 3-Year FPL Analysis</h2>
            <p className="text-gray-600 mb-2">
              Fetching real historical data from 2022-25 seasons...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Failed to Load Historical Data</h2>
            <p className="text-gray-600 mb-4 max-w-2xl mx-auto">{error}</p>
            <button
              onClick={fetchAllData}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                ⚽ FPL 3-Year Analysis & Squad Builder
              </h1>
              <p className="text-gray-600">
                Complete Fantasy Premier League analysis with real 3-year historical data (2022-25)
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <Database className="w-4 h-4 mr-1" />
                  Real 3-Year Data
                </div>
                <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <Trophy className="w-4 h-4 mr-1" />
                  Squad Builder
                </div>
                <div className="flex items-center text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  <User className="w-4 h-4 mr-1" />
                  Player Search
                </div>
              </div>
            </div>
            <button
              onClick={fetchAllData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>

          {/* Data Quality Notice */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Real Historical Data</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Analysis includes genuine 3-year FPL data: Current season (live API) + Historical seasons (GitHub repository).
                  {insights.dataQuality}% of players have complete 3-year performance data.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-lg">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'squad-builder', name: 'Squad Builder', icon: Trophy },
              { id: 'player-search', name: 'Player Search', icon: User },
              { id: 'analysis', name: '3-Year Analysis', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Players Analyzed</p>
                    <p className="text-3xl font-bold text-gray-800">{insights.totalAnalyzed || 0}</p>
                    <p className="text-xs text-green-600 mt-1">3-year historical data</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Complete Data</p>
                    <p className="text-3xl font-bold text-gray-800">{insights.full3YearData || 0}</p>
                    <p className="text-xs text-green-600 mt-1">Full 3 seasons</p>
                  </div>
                  <Database className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Avg Consistency</p>
                    <p className="text-3xl font-bold text-gray-800">{insights.avgConsistency || '0'}%</p>
                    <p className="text-xs text-green-600 mt-1">Performance reliability</p>
                  </div>
                  <Shield className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Reliable Starters</p>
                    <p className="text-3xl font-bold text-gray-800">{insights.reliableStarters || 0}</p>
                    <p className="text-xs text-green-600 mt-1">Consistent game time</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Quick Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Performers by 3-Year Points */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Top Performers (3-Year Total Points)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredPlayers.slice(0, 10).map(p => ({
                    name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
                    points: p.three_year_metrics?.total_3year_points || 0,
                    seasons: p.seasons_found
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [value, '3-Year Total Points']} />
                    <Bar dataKey="points" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Most Consistent Players */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Most Consistent Players</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredPlayers
                    .filter(p => p.seasons_found >= 2)
                    .sort((a, b) => (b.three_year_metrics?.consistency_score || 0) - (a.three_year_metrics?.consistency_score || 0))
                    .slice(0, 10)
                    .map(p => ({
                      name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
                      consistency: p.three_year_metrics?.consistency_score || 0,
                      seasons: p.seasons_found
                    }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [`${value}%`, 'Consistency Score']} />
                    <Bar dataKey="consistency" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Squad Builder Tab */}
        {activeTab === 'squad-builder' && (
          <div className="space-y-8">
            {/* Squad Builder Controls */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Squad Builder Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget: £{budget}m
                  </label>
                  <input
                    type="range"
                    min="80"
                    max="120"
                    step="5"
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Formation</label>
                  <select
                    value={formation}
                    onChange={(e) => setFormation(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="3-4-3">3-4-3 (Attacking)</option>
                    <option value="3-5-2">3-5-2 (Balanced)</option>
                    <option value="4-3-3">4-3-3 (Classic)</option>
                    <option value="4-4-2">4-4-2 (Traditional)</option>
                    <option value="5-3-2">5-3-2 (Defensive)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Optimal Squad Display */}
            {optimalSquad && optimalSquad.success && (
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Optimal Squad - {optimalSquad.formation}
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full">
                      Cost: £{optimalSquad.total_cost}m
                    </div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                      Predicted: {optimalSquad.predicted_total_points} pts
                    </div>
                    <div className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full">
                      Consistency: {optimalSquad.squad_analysis?.avg_consistency}%
                    </div>
                  </div>
                </div>

                {/* Formation Visualization */}
                <div className="bg-green-100 p-8 rounded-lg mb-6">
                  <div className="text-center text-sm text-gray-600 mb-4">Formation View</div>
                  <div className="space-y-6">
                    {/* Forwards */}
                    {optimalSquad.squad.Forward?.length > 0 && (
                      <div className="flex justify-center gap-4">
                        {optimalSquad.squad.Forward.map((player, idx) => (
                          <div key={idx} className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium min-w-24 text-center">
                            <div>{player.name}</div>
                            <div className="text-xs">£{player.price}m</div>
                            <div className="text-xs">{player.three_year_metrics?.avg_points_per_season || 0} avg</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Midfielders */}
                    {optimalSquad.squad.Midfielder?.length > 0 && (
                      <div className="flex justify-center gap-4">
                        {optimalSquad.squad.Midfielder.map((player, idx) => (
                          <div key={idx} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium min-w-24 text-center">
                            <div>{player.name}</div>
                            <div className="text-xs">£{player.price}m</div>
                            <div className="text-xs">{player.three_year_metrics?.avg_points_per_season || 0} avg</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Defenders */}
                    {optimalSquad.squad.Defender?.length > 0 && (
                      <div className="flex justify-center gap-4">
                        {optimalSquad.squad.Defender.map((player, idx) => (
                          <div key={idx} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium min-w-24 text-center">
                            <div>{player.name}</div>
                            <div className="text-xs">£{player.price}m</div>
                            <div className="text-xs">{player.three_year_metrics?.avg_points_per_season || 0} avg</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Goalkeepers */}
                    {optimalSquad.squad.Goalkeeper?.length > 0 && (
                      <div className="flex justify-center gap-4">
                        {optimalSquad.squad.Goalkeeper.map((player, idx) => (
                          <div key={idx} className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-medium min-w-24 text-center">
                            <div>{player.name}</div>
                            <div className="text-xs">£{player.price}m</div>
                            <div className="text-xs">{player.three_year_metrics?.avg_points_per_season || 0} avg</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Squad Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Squad Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div>Players: {optimalSquad.squad.all_players?.length || 0}</div>
                      <div>Remaining: £{optimalSquad.remaining_budget}m</div>
                      <div>Reliable Starters: {optimalSquad.squad_analysis?.reliable_starters || 0}</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Performance</h4>
                    <div className="space-y-1 text-sm">
                      <div>Predicted Points: {optimalSquad.predicted_total_points}</div>
                      <div>Avg Consistency: {optimalSquad.squad_analysis?.avg_consistency}%</div>
                      <div>Data Quality: Complete</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">3-Year Basis</h4>
                    <div className="space-y-1 text-sm">
                      <div>Historical Performance: Real</div>
                      <div>Consistency Analysis: Yes</div>
                      <div>Reliability Assessment: Yes</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Player Search Tab */}
        {activeTab === 'player-search' && (
          <div className="space-y-8">
            {/* Search Interface */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Player 3-Year History Search
              </h3>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for any player (e.g., Salah, Haaland, Kane)..."
                  value={playerSearchTerm}
                  onChange={(e) => setPlayerSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                />
              </div>
            </div>

            {/* Search Results */}
            {playerSearchResults.length > 0 && (
              <div className="space-y-6">
                {playerSearchResults.map((player) => (
                  <div key={player.id} className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{player.full_name}</h3>
                        <p className="text-gray-600">{player.team} • {player.position} • £{player.current_price}m</p>
                        <p className="text-sm text-green-600">
                          {player.seasons_found}/3 seasons of data available
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {player.three_year_summary?.total_3year_points || 0}
                        </div>
                        <div className="text-sm text-gray-500">3-Year Total Points</div>
                      </div>
                    </div>

                    {/* Season-by-Season Performance */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Season-by-Season Performance</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {player.seasons_data.map((season) => (
                          <div key={season.season} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-800">{season.season}</span>
                              <span className="text-lg font-bold text-green-600">{season.total_points} pts</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <div>Games: {season.games_played}</div>
                              <div>PPG: {season.ppg}</div>
                              <div>Goals: {season.goals}</div>
                              <div>Assists: {season.assists}</div>
                              {season.clean_sheets > 0 && (
                                <>
                                  <div>Clean Sheets: {season.clean_sheets}</div>
                                  <div>Minutes: {season.minutes}</div>
                                </>
                              )}
                              <div>Start: £{season.price_start}m</div>
                              <div>End: £{season.price_end}m</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3-Year Summary Stats */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">3-Year Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Avg Per Season:</span>
                          <span className="font-semibold ml-2">{player.three_year_summary?.avg_points_per_season || 0} pts</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Consistency:</span>
                          <span className="font-semibold ml-2">{player.three_year_summary?.consistency_score || 0}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Best Season:</span>
                          <span className="font-semibold ml-2">{player.three_year_summary?.best_season || 0} pts</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Reliable Starter:</span>
                          <span className="font-semibold ml-2">
                            {player.three_year_summary?.reliable_starter ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {playerSearchTerm && playerSearchResults.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No players found matching "{playerSearchTerm}"</p>
                <p className="text-sm">Try searching for first name, last name, or team</p>
              </div>
            )}

            {!playerSearchTerm && (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Search for any player to see their 3-year performance history</p>
                <p className="text-sm">Real data from 2022-23, 2023-24, and 2024-25 seasons</p>
              </div>
            )}
          </div>
        )}

        {/* 3-Year Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-8">
            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Analysis Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                  <select
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="All">All Positions</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Defender">Defender</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Forward">Forward</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Price: £{maxPrice}m
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="15"
                    step="0.5"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Consistency: {minConsistency}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={minConsistency}
                    onChange={(e) => setMinConsistency(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Player name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Player Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold">
                  3-Year Player Analysis ({filteredPlayers.length} players)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">3Y Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Season</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consistency</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reliable</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seasons</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPlayers.slice(0, 50).map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-500">{player.team}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            player.position === 'Forward' ? 'bg-red-100 text-red-800' :
                            player.position === 'Midfielder' ? 'bg-blue-100 text-blue-800' :
                            player.position === 'Defender' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {player.position}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">£{player.price}m</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          {player.three_year_metrics?.total_3year_points || 0}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {player.three_year_metrics?.avg_points_per_season || 0}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, player.three_year_metrics?.consistency_score || 0)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{player.three_year_metrics?.consistency_score?.toFixed(0) || 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {player.three_year_metrics?.reliable_starter ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            player.three_year_metrics?.performance_trend === 'improving' ? 'bg-green-100 text-green-800' :
                            player.three_year_metrics?.performance_trend === 'declining' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {player.three_year_metrics?.performance_trend || 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            player.seasons_found === 3 ? 'bg-green-100 text-green-800' :
                            player.seasons_found === 2 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {player.seasons_found}/3
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p className="font-semibold">🏆 Complete FPL 3-Year Analysis with Real Historical Data</p>
          <p className="mt-1">
            Data Sources: 
            <a href="https://github.com/vaastav/Fantasy-Premier-League" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
              GitHub Historical Data
            </a> • 
            <a href="https://fantasy.premierleague.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
              FPL Official API
            </a>
          </p>
          <div className="mt-3 p-3 bg-gray-100 rounded-lg max-w-3xl mx-auto">
            <p className="text-xs text-gray-600">
              <strong>Complete FPL Solution:</strong> Real 3-year historical analysis, optimal squad builder based on historical performance, 
              and comprehensive player search with season-by-season stats. All data is genuine - no simulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteFPLDashboard;
