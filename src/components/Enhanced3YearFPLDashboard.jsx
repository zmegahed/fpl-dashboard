import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
         ScatterChart, Scatter, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, Users, Award, Target, Star, Shield, Activity,
         Filter, Search, RefreshCw, AlertCircle, CheckCircle, Clock, Zap, 
         Trophy, BarChart3, PieChart as PieChartIcon, Settings, Download } from 'lucide-react';

const Enhanced3YearFPLDashboard = () => {
  const [currentData, setCurrentData] = useState([]);
  const [threeYearData, setThreeYearData] = useState([]);
  const [optimalSquad, setOptimalSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [maxPrice, setMaxPrice] = useState(15);
  const [minConsistency, setMinConsistency] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Squad builder settings
  const [budget, setBudget] = useState(100);
  const [formation, setFormation] = useState('3-5-2');
  const [prioritizeConsistency, setPrioritizeConsistency] = useState(true);

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch current season data
      const currentResponse = await fetch('/api/players');
      const currentData = await currentResponse.json();
      
      // Fetch 3-year analysis
      const threeYearResponse = await fetch('/api/3year-analysis');
      const threeYearData = await threeYearResponse.json();
      
      // Fetch optimal squad
      const squadResponse = await fetch(`/api/optimal-squad?budget=${budget}&formation=${formation}`);
      const squadData = await squadResponse.json();
      
      setCurrentData(currentData.players || []);
      setThreeYearData(threeYearData.players || []);
      setOptimalSquad(squadData);
      
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [budget, formation]);

  // Filter players based on current filters
  const filteredPlayers = useMemo(() => {
    return threeYearData.filter(player => {
      const matchesPosition = selectedPosition === 'All' || player.position === selectedPosition;
      const matchesPrice = player.price <= maxPrice;
      const matchesConsistency = player.three_year_metrics?.consistency_score >= minConsistency;
      const matchesSearch = searchTerm === '' || 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesPosition && matchesPrice && matchesConsistency && matchesSearch;
    });
  }, [threeYearData, selectedPosition, maxPrice, minConsistency, searchTerm]);

  // Calculate insights
  const insights = useMemo(() => {
    if (filteredPlayers.length === 0) return {};
    
    const avgConsistency = filteredPlayers.reduce((sum, p) => sum + (p.three_year_metrics?.consistency_score || 0), 0) / filteredPlayers.length;
    const reliableStarters = filteredPlayers.filter(p => p.three_year_metrics?.reliable_starter).length;
    const lowInjuryRisk = filteredPlayers.filter(p => (p.three_year_metrics?.injury_risk || 0) < 2).length;
    
    return {
      avgConsistency: avgConsistency.toFixed(1),
      reliableStarters,
      lowInjuryRisk,
      totalAnalyzed: filteredPlayers.length
    };
  }, [filteredPlayers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 animate-spin text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Analyzing 3 Years of FPL Data</h2>
            <p className="text-gray-600">Processing player histories and generating optimal squad recommendations...</p>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Analysis Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
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
                Comprehensive 3-year player analysis to build your optimal Fantasy Premier League squad
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  3-Year Analysis
                </div>
                <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <Trophy className="w-4 h-4 mr-1" />
                  Squad Optimization
                </div>
              </div>
            </div>
            <button
              onClick={fetchAllData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Analysis
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-lg">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'analysis', name: '3-Year Analysis', icon: TrendingUp },
              { id: 'squad-builder', name: 'Squad Builder', icon: Trophy },
              { id: 'player-compare', name: 'Player Comparison', icon: Users }
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
            {/* Key Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Players Analyzed</p>
                    <p className="text-3xl font-bold text-gray-800">{insights.totalAnalyzed || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Avg Consistency</p>
                    <p className="text-3xl font-bold text-gray-800">{insights.avgConsistency || '0'}%</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Reliable Starters</p>
                    <p className="text-3xl font-bold text-gray-800">{insights.reliableStarters || 0}</p>
                  </div>
                  <Shield className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Low Injury Risk</p>
                    <p className="text-3xl font-bold text-gray-800">{insights.lowInjuryRisk || 0}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Quick Optimal Squad Preview */}
            {optimalSquad && optimalSquad.success && (
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Recommended Squad ({optimalSquad.formation})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(optimalSquad.squad).map(([position, players]) => {
                    if (position === 'all_players') return null;
                    return (
                      <div key={position} className="border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-2">{position}s</h4>
                        {players.map((player, idx) => (
                          <div key={idx} className="text-sm text-gray-600 mb-1">
                            {player.name} (£{player.price}m)
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total Cost: £{optimalSquad.total_cost?.toFixed(1)}m | 
                    Remaining: £{optimalSquad.remaining_budget?.toFixed(1)}m
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    Predicted Points: {optimalSquad.predicted_total_points?.toFixed(0)}
                  </div>
                </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Player</label>
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

            {/* 3-Year Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Consistency vs Performance Scatter */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Consistency vs Performance (3-Year)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={filteredPlayers.slice(0, 50)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="three_year_metrics.consistency_score" 
                      name="Consistency Score"
                      domain={[0, 100]}
                    />
                    <YAxis 
                      dataKey="three_year_metrics.avg_points_per_season" 
                      name="Avg Points/Season"
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        typeof value === 'number' ? value.toFixed(1) : value, 
                        name === 'three_year_metrics.consistency_score' ? 'Consistency' : 'Avg Points'
                      ]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.name;
                        }
                        return '';
                      }}
                    />
                    <Scatter 
                      dataKey="three_year_metrics.avg_points_per_season" 
                      fill="#8884d8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Top Consistent Performers */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Most Consistent Players (3-Year)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={filteredPlayers
                      .sort((a, b) => (b.three_year_metrics?.consistency_score || 0) - (a.three_year_metrics?.consistency_score || 0))
                      .slice(0, 10)
                      .map(p => ({
                        name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
                        consistency: p.three_year_metrics?.consistency_score || 0,
                        avgPoints: p.three_year_metrics?.avg_points_per_season || 0
                      }))
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="consistency" fill="#82ca9d" name="Consistency Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Value Trend Analysis */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Price Value Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={filteredPlayers
                      .filter(p => p.three_year_metrics?.value_trend !== undefined)
                      .sort((a, b) => (b.three_year_metrics?.value_trend || 0) - (a.three_year_metrics?.value_trend || 0))
                      .slice(0, 15)
                      .map(p => ({
                        name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
                        valueTrend: p.three_year_metrics?.value_trend || 0,
                        currentPrice: p.price
                      }))
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`£${value.toFixed(2)}m`, 'Value Trend']} />
                    <Bar dataKey="valueTrend" fill="#ffc658" name="3-Year Value Trend" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Injury Risk Analysis */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Injury Risk Assessment</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={filteredPlayers
                      .sort((a, b) => (a.three_year_metrics?.injury_risk || 0) - (b.three_year_metrics?.injury_risk || 0))
                      .slice(0, 15)
                      .map(p => ({
                        name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
                        injuryRisk: p.three_year_metrics?.injury_risk || 0,
                        avgGames: p.three_year_metrics?.avg_games_per_season || 0
                      }))
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'injuryRisk' ? `${value} weeks/season` : `${value.toFixed(1)} games`,
                      name === 'injuryRisk' ? 'Injury Risk' : 'Avg Games'
                    ]} />
                    <Bar dataKey="injuryRisk" fill="#ff7300" name="Injury Risk (weeks/season)" />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <option value="5-4-1">5-4-1 (Ultra Defensive)</option>
                  </select>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prioritizeConsistency}
                      onChange={(e) => setPrioritizeConsistency(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Prioritize Consistency</span>
                  </label>
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
                      Cost: £{optimalSquad.total_cost?.toFixed(1)}m
                    </div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                      Predicted: {optimalSquad.predicted_total_points?.toFixed(0)} pts
                    </div>
                    <div className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full">
                      Consistency: {optimalSquad.squad_consistency_score?.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Formation Visual */}
                <div className="bg-green-100 p-8 rounded-lg mb-6">
                  <div className="text-center text-sm text-gray-600 mb-4">Pitch Formation View</div>
                  <div className="space-y-6">
                    {/* Forwards */}
                    {optimalSquad.squad.Forward?.length > 0 && (
                      <div className="flex justify-center gap-4">
                        {optimalSquad.squad.Forward.map((player, idx) => (
                          <div key={idx} className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium min-w-20 text-center">
                            {player.name}
                            <div className="text-xs">£{player.price}m</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Midfielders */}
                    {optimalSquad.squad.Midfielder?.length > 0 && (
                      <div className="flex justify-center gap-4">
                        {optimalSquad.squad.Midfielder.map((player, idx) => (
                          <div key={idx} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium min-w-20 text-center">
                            {player.name}
                            <div className="text-xs">£{player.price}m</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Defenders */}
                    {optimalSquad.squad.Defender?.length > 0 && (
                      <div className="flex justify-center gap-4">
                        {optimalSquad.squad.Defender.map((player, idx) => (
                          <div key={idx} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium min-w-20 text-center">
                            {player.name}
                            <div className="text-xs">£{player.price}m</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Goalkeepers */}
                    {optimalSquad.squad.Goalkeeper?.length > 0 && (
                      <div className="flex justify-center gap-4">
                        {optimalSquad.squad.Goalkeeper.map((player, idx) => (
                          <div key={idx} className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-medium min-w-20 text-center">
                            {player.name}
                            <div className="text-xs">£{player.price}m</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Squad Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Squad Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div>Total Players: {optimalSquad.squad.all_players?.length || 0}</div>
                      <div>Remaining Budget: £{optimalSquad.remaining_budget?.toFixed(1)}m</div>
                      <div>Avg Player Cost: £{(optimalSquad.total_cost / (optimalSquad.squad.all_players?.length || 1)).toFixed(1)}m</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Performance Metrics</h4>
                    <div className="space-y-1 text-sm">
                      <div>Predicted Total Points: {optimalSquad.predicted_total_points?.toFixed(0)}</div>
                      <div>Avg Points per Player: {(optimalSquad.predicted_total_points / (optimalSquad.squad.all_players?.length || 1)).toFixed(1)}</div>
                      <div>Squad Consistency: {optimalSquad.squad_consistency_score?.toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Risk Assessment</h4>
                    <div className="space-y-1 text-sm">
                      <div>Reliable Starters: {optimalSquad.squad.all_players?.filter(p => p.three_year_metrics?.reliable_starter).length || 0}</div>
                      <div>Low Injury Risk: {optimalSquad.squad.all_players?.filter(p => (p.three_year_metrics?.injury_risk || 0) < 2).length || 0}</div>
                      <div>High Consistency: {optimalSquad.squad.all_players?.filter(p => (p.three_year_metrics?.consistency_score || 0) > 70).length || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Player Comparison Tab */}
        {activeTab === 'player-compare' && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Detailed Player Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">3Y Avg Pts</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consistency</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Injury Risk</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value Trend</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reliable</th>
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
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{player.three_year_metrics?.avg_points_per_season?.toFixed(1) || 'N/A'}</td>
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
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            (player.three_year_metrics?.injury_risk || 0) < 1 ? 'bg-green-100 text-green-800' :
                            (player.three_year_metrics?.injury_risk || 0) < 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {player.three_year_metrics?.injury_risk?.toFixed(1) || 0} wks
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            (player.three_year_metrics?.value_trend || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {(player.three_year_metrics?.value_trend || 0) >= 0 ? '+' : ''}£{player.three_year_metrics?.value_trend?.toFixed(2) || 0}m
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {player.three_year_metrics?.reliable_starter ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
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
          <p>3-Year FPL Analysis • Squad Optimization Algorithm • Real Player Data</p>
          <p className="mt-1">Built with React, Python, and Fantasy Premier League API</p>
        </div>
      </div>
    </div>
  );
};

export default Enhanced3YearFPLDashboard;
