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
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="relative">
              <div className="w-24 h-24 mx-auto mb-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-4xl">⚽</div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Loading Premier League Data</h2>
            <p className="text-green-100 text-lg">
              Analyzing 3 seasons of fantasy football performance...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-200" />
            <h2 className="text-3xl font-bold text-white mb-4">Failed to Load Premier League Data</h2>
            <p className="text-red-100 mb-6 max-w-2xl mx-auto text-lg">{error}</p>
            <button
              onClick={fetchAllData}
              className="bg-white text-red-800 px-8 py-3 rounded-xl hover:bg-red-50 transition-all transform hover:scale-105 font-bold text-lg"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      {/* Football Pitch Pattern Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Football Theme */}
          <div className="mb-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-6xl">⚽</div>
                    <div>
                      <h1 className="text-5xl font-bold text-white mb-2">
                        Premier League Fantasy
                      </h1>
                      <h2 className="text-2xl font-semibold text-green-200">
                        3-Year Performance Analytics
                      </h2>
                    </div>
                  </div>
                  <p className="text-green-100 text-lg max-w-2xl">
                    Complete statistical analysis spanning three Premier League seasons with real player performance data
                  </p>
                  
                  {/* Premier League Style Badges */}
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <div className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                      <Trophy className="w-4 h-4 mr-2" />
                      PREMIER LEAGUE
                    </div>
                    <div className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                      <Database className="w-4 h-4 mr-2" />
                      3 SEASONS
                    </div>
                    <div className="flex items-center bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                      <Star className="w-4 h-4 mr-2" />
                      REAL DATA
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={fetchAllData}
                  className="bg-white text-green-800 px-6 py-3 rounded-xl hover:bg-green-50 transition-all transform hover:scale-105 font-bold shadow-lg"
                >
                  <RefreshCw className="w-5 h-5 inline mr-2" />
                  Refresh
                </button>
              </div>

              {/* Stadium Info Bar */}
              <div className="bg-green-800/50 border border-green-600/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-green-200" />
                  <h3 className="text-green-200 font-bold">Match Analysis Report</h3>
                </div>
                <p className="text-green-100 text-sm">
                  Official Fantasy Premier League statistics combined with historical performance tracking. 
                  {insights.dataQuality}% of players feature complete 3-season datasets for maximum accuracy.
                </p>
              </div>
            </div>
          </div>

          {/* Football-Style Navigation */}
          <div className="mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-2 shadow-2xl border border-white/30">
              <div className="flex space-x-2">
                {[
                  { id: 'overview', name: 'Stadium Overview', icon: '🏟️' },
                  { id: 'squad-builder', name: 'Team Builder', icon: '⚽' },
                  { id: 'player-search', name: 'Player Scout', icon: '🔍' },
                  { id: 'analysis', name: 'Match Analysis', icon: '📊' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all transform hover:scale-105 font-bold ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Overview Tab - Stadium Style */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Scoreboard Style Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Total Players", value: insights.totalAnalyzed || 0, subtitle: "In Database", icon: "👤", color: "from-blue-600 to-blue-700" },
                  { title: "Complete Records", value: insights.full3YearData || 0, subtitle: "3 Full Seasons", icon: "📋", color: "from-green-600 to-green-700" },
                  { title: "Avg Performance", value: `${insights.avgConsistency || 0}%`, subtitle: "Consistency Rating", icon: "⭐", color: "from-yellow-500 to-yellow-600" },
                  { title: "Regular Starters", value: insights.reliableStarters || 0, subtitle: "Reliable Players", icon: "🛡️", color: "from-purple-600 to-purple-700" }
                ].map((metric, idx) => (
                  <div key={idx} className={`bg-gradient-to-br ${metric.color} rounded-2xl p-6 text-white shadow-2xl transform hover:scale-105 transition-all`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-3xl">{metric.icon}</div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{metric.value}</div>
                        <div className="text-sm opacity-90">{metric.subtitle}</div>
                      </div>
                    </div>
                    <div className="text-lg font-semibold opacity-95">{metric.title}</div>
                  </div>
                ))}
              </div>

              {/* Football Pitch Style Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Scorers Chart */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="text-2xl">🥅</div>
                    <h3 className="text-2xl font-bold text-gray-800">Top Goal Scorers</h3>
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
                      3-Year Total Points
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={filteredPlayers.slice(0, 8).map(p => ({
                      name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
                      points: p.three_year_metrics?.total_3year_points || 0,
                      team: p.team
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                      <Tooltip 
                        formatter={(value, name) => [value, '3-Year Points']} 
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '12px',
                          color: 'white'
                        }}
                      />
                      <Bar 
                        dataKey="points" 
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Consistency Champions */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="text-2xl">🏆</div>
                    <h3 className="text-2xl font-bold text-gray-800">Consistency Champions</h3>
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                      Performance Rating
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={filteredPlayers
                      .filter(p => p.seasons_found >= 2)
                      .sort((a, b) => (b.three_year_metrics?.consistency_score || 0) - (a.three_year_metrics?.consistency_score || 0))
                      .slice(0, 8)
                      .map(p => ({
                        name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
                        consistency: p.three_year_metrics?.consistency_score || 0,
                        position: p.position
                      }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${value}%`, 'Consistency Score']} 
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '12px',
                          color: 'white'
                        }}
                      />
                      <Bar 
                        dataKey="consistency" 
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Squad Builder Tab - Football Pitch Layout */}
          {activeTab === 'squad-builder' && (
            <div className="space-y-8">
              {/* Manager's Office Controls */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-3xl">👔</div>
                  <h3 className="text-2xl font-bold text-gray-800">Manager's Tactics Board</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-lg font-bold text-gray-800 mb-3">
                        💰 Transfer Budget: £{budget}m
                      </label>
                      <input
                        type="range"
                        min="80"
                        max="120"
                        step="5"
                        value={budget}
                        onChange={(e) => setBudget(parseFloat(e.target.value))}
                        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #10b981 0%, #10b981 ${((budget-80)/40)*100}%, #e5e7eb ${((budget-80)/40)*100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-sm text-gray-600 mt-1">
                        <span>£80m</span>
                        <span>£120m</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-lg font-bold text-gray-800 mb-3">⚽ Formation</label>
                      <select
                        value={formation}
                        onChange={(e) => setFormation(e.target.value)}
                        className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-500 focus:border-green-500 bg-white"
                      >
                        <option value="3-4-3">3-4-3 ⚔️ Ultra Attack</option>
                        <option value="3-5-2">3-5-2 ⚖️ Balanced</option>
                        <option value="4-3-3">4-3-3 🎯 Classic</option>
                        <option value="4-4-2">4-4-2 🏛️ Traditional</option>
                        <option value="5-3-2">5-3-2 🛡️ Defensive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Football Pitch Squad Display */}
              {optimalSquad && optimalSquad.success ? (
                <div className="bg-gradient-to-b from-green-400 to-green-600 rounded-2xl p-8 shadow-2xl border-4 border-white">
                  <div className="text-center mb-6">
                    <h3 className="text-3xl font-bold text-white mb-2">🏟️ Your Starting XI</h3>
                    <div className="flex justify-center gap-6 text-white">
                      <div className="bg-white/20 px-4 py-2 rounded-full">
                        💰 Cost: £{optimalSquad.total_cost}m
                      </div>
                      <div className="bg-white/20 px-4 py-2 rounded-full">
                        🎯 Predicted: {optimalSquad.predicted_total_points} pts
                      </div>
                      <div className="bg-white/20 px-4 py-2 rounded-full">
                        ⭐ Consistency: {optimalSquad.squad_analysis?.avg_consistency}%
                      </div>
                    </div>
                  </div>

                  {/* Pitch Layout */}
                  <div className="relative bg-green-500 rounded-xl p-8" style={{
                    backgroundImage: `
                      linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px),
                      linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
                      radial-gradient(circle at center, rgba(255,255,255,0.1) 2px, transparent 2px)
                    `,
                    backgroundSize: '30px 30px, 30px 30px, 60px 60px'
                  }}>
                    {/* Center Circle */}
                    <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white/50 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                    
                    <div className="space-y-12">
                      {/* Forwards */}
                      {optimalSquad.squad.Forward?.length > 0 && (
                        <div className="flex justify-center gap-8">
                          {optimalSquad.squad.Forward.map((player, idx) => (
                            <div key={idx} className="bg-red-600 text-white px-4 py-3 rounded-xl font-bold text-center min-w-24 shadow-lg border-2 border-white">
                              <div className="text-sm">{player.name}</div>
                              <div className="text-xs">£{player.price}m</div>
                              <div className="text-xs">⭐ {player.three_year_metrics?.avg_points_per_season || 0} avg</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Midfielders */}
                      {optimalSquad.squad.Midfielder?.length > 0 && (
                        <div className="flex justify-center gap-6">
                          {optimalSquad.squad.Midfielder.map((player, idx) => (
                            <div key={idx} className="bg-blue-600 text-white px-3 py-2 rounded-xl font-bold text-center min-w-20 shadow-lg border-2 border-white">
                              <div className="text-xs">{player.name}</div>
                              <div className="text-xs">£{player.price}m</div>
                              <div className="text-xs">{player.three_year_metrics?.avg_points_per_season || 0} avg</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Defenders */}
                      {optimalSquad.squad.Defender?.length > 0 && (
                        <div className="flex justify-center gap-8">
                          {optimalSquad.squad.Defender.map((player, idx) => (
                            <div key={idx} className="bg-green-700 text-white px-3 py-2 rounded-xl font-bold text-center min-w-20 shadow-lg border-2 border-white">
                              <div className="text-xs">{player.name}</div>
                              <div className="text-xs">£{player.price}m</div>
                              <div className="text-xs">{player.three_year_metrics?.avg_points_per_season || 0} avg</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Goalkeepers */}
                      {optimalSquad.squad.Goalkeeper?.length > 0 && (
                        <div className="flex justify-center">
                          {optimalSquad.squad.Goalkeeper.map((player, idx) => (
                            <div key={idx} className="bg-yellow-500 text-black px-4 py-3 rounded-xl font-bold text-center min-w-24 shadow-lg border-2 border-white">
                              <div className="text-sm">{player.name}</div>
                              <div className="text-xs">£{player.price}m</div>
                              <div className="text-xs">🧤 {player.three_year_metrics?.avg_points_per_season || 0} avg</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Squad Analysis */}
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/20 rounded-xl p-4">
                      <h4 className="text-white font-bold mb-2 text-center">📊 Squad Summary</h4>
                      <div className="space-y-1 text-sm text-white text-center">
                        <div>Players: {optimalSquad.squad.all_players?.length || 0}</div>
                        <div>Remaining: £{optimalSquad.remaining_budget}m</div>
                        <div>Reliable Starters: {optimalSquad.squad_analysis?.reliable_starters || 0}</div>
                      </div>
                    </div>
                    
                    <div className="bg-white/20 rounded-xl p-4">
                      <h4 className="text-white font-bold mb-2 text-center">🎯 Performance</h4>
                      <div className="space-y-1 text-sm text-white text-center">
                        <div>Predicted Points: {optimalSquad.predicted_total_points}</div>
                        <div>Avg Consistency: {optimalSquad.squad_analysis?.avg_consistency}%</div>
                        <div>Data Quality: Complete</div>
                      </div>
                    </div>
                    
                    <div className="bg-white/20 rounded-xl p-4">
                      <h4 className="text-white font-bold mb-2 text-center">📈 3-Year Basis</h4>
                      <div className="space-y-1 text-sm text-white text-center">
                        <div>Historical Performance: Real</div>
                        <div>Consistency Analysis: Yes</div>
                        <div>Reliability Assessment: Yes</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-b from-green-400 to-green-600 rounded-2xl p-8 shadow-2xl border-4 border-white">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4">⚽</div>
                    <h3 className="text-2xl font-bold mb-4">Building Your Optimal Squad...</h3>
                    <p className="text-green-100">Analyzing player performance data to create the perfect team within your budget</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Player Search Tab - Scouting Theme */}
          {activeTab === 'player-search' && (
            <div className="space-y-8">
              {/* Scout's Notebook */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-3xl">🔍</div>
                  <h3 className="text-2xl font-bold text-gray-800">Scout's Player Database</h3>
                </div>
                
                <div className="relative">
                  <Search className="w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search any Premier League player... (e.g., Salah, Haaland, Bruno)"
                    value={playerSearchTerm}
                    onChange={(e) => setPlayerSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-500 focus:border-green-500 bg-white"
                  />
                </div>
              </div>

              {/* Search Results */}
              {playerSearchResults.length > 0 && (
                <div className="space-y-6">
                  {playerSearchResults.map((player) => (
                    <div key={player.id} className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/30">
                      {/* Player Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {player.name.substring(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-800">{player.full_name}</h3>
                            <p className="text-lg text-gray-600">{player.team} • {player.position} • £{player.current_price}m</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                                {player.seasons_found}/3 seasons analyzed
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold text-green-600">
                            {player.three_year_summary?.total_3year_points || 0}
                          </div>
                          <div className="text-gray-500 font-medium">Total Points (3 years)</div>
                        </div>
                      </div>

                      {/* Performance Timeline */}
                      <div className="mb-6">
                        <h4 className="text-xl font-bold text-gray-800 mb-4">🏆 Season Performance Timeline</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {player.seasons_data.map((season) => (
                            <div key={season.season} className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-bold text-gray-800">{season.season}</span>
                                <span className="text-2xl font-bold text-green-600">{season.total_points}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <div>⚽ Goals: {season.goals}</div>
                                <div>🎯 Assists: {season.assists}</div>
                                <div>🎮 Games: {season.games_played}</div>
                                <div>💫 PPG: {season.ppg}</div>
                                {season.clean_sheets > 0 && (
                                  <>
                                    <div>🛡️ Clean Sheets: {season.clean_sheets}</div>
                                    <div>⏱️ Minutes: {season.minutes}</div>
                                  </>
                                )}
                                <div>💰 Start: £{season.price_start}m</div>
                                <div>💰 End: £{season.price_end}m</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Player Stats Dashboard */}
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
                        <h4 className="text-xl font-bold text-gray-800 mb-4">📊 Complete Statistical Analysis</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="text-center">
                            <div className="text-3xl mb-2">⭐</div>
                            <div className="text-2xl font-bold text-green-600">
                              {player.three_year_summary?.avg_points_per_season || 0}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Avg Points/Season</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl mb-2">🛡️</div>
                            <div className="text-2xl font-bold text-blue-600">
                              {player.three_year_summary?.consistency_score || 0}%
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Consistency Score</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl mb-2">🏆</div>
                            <div className="text-2xl font-bold text-yellow-600">
                              {player.three_year_summary?.best_season || 0}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Best Season</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl mb-2">
                              {player.three_year_summary?.reliable_starter ? '✅' : '⚠️'}
                            </div>
                            <div className="text-lg font-bold text-gray-800">
                              {player.three_year_summary?.reliable_starter ? 'Reliable' : 'Rotation'}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Starter Status</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {playerSearchTerm && playerSearchResults.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-8xl mb-4">🔍</div>
                  <h3 className="text-3xl font-bold text-white mb-4">No Players Found</h3>
                  <p className="text-green-100 text-lg">No players found matching "{playerSearchTerm}"</p>
                  <p className="text-green-200 text-sm">Try searching for first name, last name, or team</p>
                </div>
              )}

              {!playerSearchTerm && (
                <div className="text-center py-16">
                  <div className="text-8xl mb-4">🔍</div>
                  <h3 className="text-3xl font-bold text-white mb-4">Scout Any Premier League Player</h3>
                  <p className="text-green-100 text-lg max-w-2xl mx-auto">
                    Search our comprehensive database featuring 3 years of real performance data from every Premier League player
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Analysis Tab - Match Analysis Style */}
          {activeTab === 'analysis' && (
            <div className="space-y-8">
              {/* Analysis Controls */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-3xl">📊</div>
                  <h3 className="text-2xl font-bold text-gray-800">Advanced Match Analysis</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-lg font-bold text-gray-800 mb-3">⚽ Position</label>
                    <select
                      value={selectedPosition}
                      onChange={(e) => setSelectedPosition(e.target.value)}
                      className="w-full p-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-500 bg-white"
                    >
                      <option value="All">🌟 All Positions</option>
                      <option value="Goalkeeper">🧤 Goalkeeper</option>
                      <option value="Defender">🛡️ Defender</option>
                      <option value="Midfielder">⚡ Midfielder</option>
                      <option value="Forward">🎯 Forward</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-lg font-bold text-gray-800 mb-3">
                      💰 Max Price: £{maxPrice}m
                    </label>
                    <input
                      type="range"
                      min="4"
                      max="15"
                      step="0.5"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-lg font-bold text-gray-800 mb-3">
                      ⭐ Min Consistency: {minConsistency}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={minConsistency}
                      onChange={(e) => setMinConsistency(parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-lg font-bold text-gray-800 mb-3">🔍 Search</label>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Player name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 p-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Premier League Style Player Table */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/30">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">🏆</div>
                      <h3 className="text-2xl font-bold">Premier League Performance Analysis</h3>
                    </div>
                    <div className="bg-white/20 px-4 py-2 rounded-full">
                      {filteredPlayers.length} Players Analyzed
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase">Player</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase">Position</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase">Value</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase">3Y Total</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase">Season Avg</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase">Consistency</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase">Form</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPlayers.slice(0, 50).map((player, idx) => (
                        <tr key={player.id} className={`hover:bg-green-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                {player.name.substring(0, 2)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{player.name}</div>
                                <div className="text-sm text-gray-500">{player.team}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                              player.position === 'Forward' ? 'bg-red-100 text-red-800' :
                              player.position === 'Midfielder' ? 'bg-blue-100 text-blue-800' :
                              player.position === 'Defender' ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {player.position === 'Forward' ? '🎯' : 
                               player.position === 'Midfielder' ? '⚡' :
                               player.position === 'Defender' ? '🛡️' : '🧤'} {player.position}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-green-600">£{player.price}m</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xl font-bold text-purple-600">
                              {player.three_year_metrics?.total_3year_points || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-semibold">
                              {player.three_year_metrics?.avg_points_per_season || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-3">
                                <div 
                                  className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all" 
                                  style={{ width: `${Math.min(100, player.three_year_metrics?.consistency_score || 0)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold">{player.three_year_metrics?.consistency_score?.toFixed(0) || 0}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {player.three_year_metrics?.reliable_starter ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-semibold">Starter</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-orange-600">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-semibold">Rotation</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                              player.three_year_metrics?.performance_trend === 'improving' ? 'bg-green-100 text-green-800' :
                              player.three_year_metrics?.performance_trend === 'declining' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {player.three_year_metrics?.performance_trend === 'improving' ? '📈 Rising' :
                               player.three_year_metrics?.performance_trend === 'declining' ? '📉 Falling' : '➡️ Stable'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                              player.seasons_found === 3 ? 'bg-green-100 text-green-800' :
                              player.seasons_found === 2 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {player.seasons_found}/3 seasons
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

          {/* Footer - Premier League Style */}
          <div className="text-center mt-12 pb-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
              <div className="text-4xl mb-4">⚽🏆📊</div>
              <h3 className="text-2xl font-bold text-white mb-3">Official Premier League Fantasy Analysis</h3>
              <p className="text-green-100 text-lg mb-4 max-w-3xl mx-auto">
                Complete statistical analysis powered by real Premier League data spanning three full seasons
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <a href="https://github.com/vaastav/Fantasy-Premier-League" target="_blank" rel="noopener noreferrer" 
                   className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-all transform hover:scale-105 font-bold flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Historical Data Source
                </a>
                <a href="https://fantasy.premierleague.com/" target="_blank" rel="noopener noreferrer"
                   className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 font-bold flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Official FPL Site
                </a>
              </div>
              
              <div className="bg-green-800/30 border border-green-600/30 rounded-xl p-4 max-w-4xl mx-auto">
                <p className="text-green-100 text-sm leading-relaxed">
                  <strong className="text-white">🏟️ Complete Fantasy Football Solution:</strong> Real 3-year Premier League analysis, 
                  intelligent squad optimization based on historical performance patterns, and comprehensive player scouting 
                  with detailed season-by-season statistics. All data sourced directly from official records - no simulations or estimates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteFPLDashboard;
