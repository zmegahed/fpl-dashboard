import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         ScatterChart, Scatter, BarChart, Bar, PieChart, Pie, Cell, Legend,
         RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, DollarSign, Users, Award, Target, Star, 
         Filter, Search, RefreshCw, BarChart3, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

const FPLDashboard = () => {
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [maxPrice, setMaxPrice] = useState(15);
  const [minPoints, setMinPoints] = useState(0);
  const [minSeasons, setMinSeasons] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataRange, setDataRange] = useState('');

  // API base URL
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? '' // Use relative URLs in production (same domain)
    : 'http://localhost:5000';

  // Fetch 3-year FPL data from Python API
  const fetchFPLData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching 3-year FPL data from Python API...');
      
      // Fetch players data with current filters
      const playersParams = new URLSearchParams({
        position: selectedPosition === 'All' ? 'all' : selectedPosition.toLowerCase(),
        minSeasons: minSeasons.toString()
      });
      
      const playersResponse = await fetch(`${API_BASE_URL}/api/players?${playersParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!playersResponse.ok) {
        const errorData = await playersResponse.json();
        throw new Error(errorData.error || `Players API error! status: ${playersResponse.status}`);
      }
      
      const playersData = await playersResponse.json();
      console.log(`Fetched ${playersData.players.length} players with 3-year data from Python API`);
      
      // Fetch summary stats
      const statsResponse = await fetch(`${API_BASE_URL}/api/stats`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json();
        throw new Error(errorData.error || `Stats API error! status: ${statsResponse.status}`);
      }
      
      const statsData = await statsResponse.json();
      
      setPlayers(playersData.players);
      setStats(statsData);
      setLastUpdated(playersData.lastUpdated);
      setDataRange(playersData.dataRange || '3 years');
      
    } catch (err) {
      console.error('Error fetching 3-year FPL data:', err);
      setError(`Failed to fetch 3-year FPL data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data manually
  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/refresh`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh data');
      }
      
      const result = await response.json();
      console.log('Data refresh result:', result);
      
      // Fetch updated data
      await fetchFPLData();
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(`Failed to refresh data: ${err.message}`);
      setLoading(false);
    }
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchFPLData();
  }, [selectedPosition, minSeasons]);

  // Filter players based on current filters (client-side filtering for performance)
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesPrice = player.price <= maxPrice;
      const matchesPoints = player.totalPoints >= minPoints;
      const matchesSearch = searchTerm === '' || 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesPrice && matchesPoints && matchesSearch;
    });
  }, [players, maxPrice, minPoints, searchTerm]);

  // Calculate insights from filtered data
  const insights = useMemo(() => {
    if (filteredPlayers.length === 0) return stats;
    
    const totalPlayers = filteredPlayers.length;
    const avgPoints = filteredPlayers.reduce((sum, p) => sum + p.totalPoints, 0) / totalPlayers;
    const avgPrice = filteredPlayers.reduce((sum, p) => sum + p.price, 0) / totalPlayers;
    const topScorer = filteredPlayers.reduce((max, p) => p.totalPoints > max.totalPoints ? p : max);
    const bestValue = filteredPlayers.reduce((max, p) => p.pointsPerMillion > max.pointsPerMillion ? p : max);
    const mostConsistent = filteredPlayers.reduce((max, p) => p.overallScore > max.overallScore ? p : max);
    
    return {
      totalPlayers,
      avgPoints: avgPoints.toFixed(1),
      avgPrice: avgPrice.toFixed(1),
      topScorer: { name: topScorer.name, points: topScorer.totalPoints, totalPoints: topScorer.totalPoints },
      bestValue: { name: bestValue.name, pointsPerMillion: bestValue.pointsPerMillion.toFixed(1) },
      mostConsistent: { name: mostConsistent.name, overallScore: mostConsistent.overallScore.toFixed(1) },
      dataRange: dataRange
    };
  }, [filteredPlayers, stats, dataRange]);

  // Prepare chart data
  const priceVsPointsData = filteredPlayers.map(player => ({
    name: player.name,
    price: player.price,
    points: player.totalPoints,
    position: player.position,
    team: player.team,
    pointsPerMillion: player.pointsPerMillion,
    overallScore: player.overallScore,
    seasonsPlayed: player.seasonsPlayed
  }));

  const topPlayersByPoints = filteredPlayers
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 15)
    .map(player => ({
      name: player.name.length > 12 ? player.name.substring(0, 12) + '...' : player.name,
      points: player.totalPoints,
      avgPerSeason: player.avgPointsPerSeason,
      team: player.team,
      position: player.position,
      seasons: player.seasonsPlayed
    }));

  const valuePlayersData = filteredPlayers
    .sort((a, b) => b.pointsPerMillion - a.pointsPerMillion)
    .slice(0, 15)
    .map(player => ({
      name: player.name.length > 12 ? player.name.substring(0, 12) + '...' : player.name,
      pointsPerMillion: parseFloat(player.pointsPerMillion.toFixed(1)),
      price: player.price,
      points: player.totalPoints,
      overallScore: player.overallScore
    }));

  const consistencyData = filteredPlayers
    .filter(p => p.seasonsPlayed >= 2) // Only players with 2+ seasons
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 15)
    .map(player => ({
      name: player.name.length > 12 ? player.name.substring(0, 12) + '...' : player.name,
      overallScore: player.overallScore,
      consistencyScore: player.consistencyScore,
      availabilityScore: player.availabilityScore,
      seasonsPlayed: player.seasonsPlayed
    }));

  // Position breakdown
  const positionCounts = filteredPlayers.reduce((acc, player) => {
    acc[player.position] = (acc[player.position] || 0) + 1;
    return acc;
  }, {});

  const positionData = Object.entries(positionCounts).map(([position, count]) => ({
    position,
    count,
    avgPoints: Math.round(filteredPlayers
      .filter(p => p.position === position)
      .reduce((sum, p) => sum + p.totalPoints, 0) / count),
    avgOverallScore: Math.round(filteredPlayers
      .filter(p => p.position === position)
      .reduce((sum, p) => sum + p.overallScore, 0) / count)
  }));

  // Seasons played distribution
  const seasonsData = filteredPlayers.reduce((acc, player) => {
    const seasons = `${player.seasonsPlayed} season${player.seasonsPlayed > 1 ? 's' : ''}`;
    acc[seasons] = (acc[seasons] || 0) + 1;
    return acc;
  }, {});

  const seasonsDistribution = Object.entries(seasonsData).map(([seasons, count]) => ({
    seasons,
    count,
    percentage: Math.round((count / filteredPlayers.length) * 100)
  }));

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#ff0080'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 animate-spin text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading 3-Year FPL Data</h2>
            <p className="text-gray-600 mb-2">
              Fetching and processing historical player data from the last 3 seasons...
            </p>
            <p className="text-sm text-gray-500">
              This may take a moment as we analyze comprehensive historical performance data.
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Failed to Load 3-Year Data</h2>
            <p className="text-gray-600 mb-4 max-w-2xl mx-auto">{error}</p>
            <div className="space-x-4">
              <button
                onClick={fetchFPLData}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={refreshData}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Data
              </button>
            </div>
            <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200 max-w-2xl mx-auto">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This dashboard only uses real FPL data from the last 3 years. 
                No sample data is provided. If you're seeing this error, the FPL API may be temporarily unavailable.
              </p>
            </div>
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
                ⚽ FPL 3-Year Analysis Dashboard
              </h1>
              <p className="text-gray-600">
                Comprehensive 3-year Fantasy Premier League analysis with real historical data
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4 mr-1" />
                  {dataRange}
                </div>
                <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <Zap className="w-4 h-4 mr-1" />
                  Real Data Only
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <div className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Updated: {new Date(lastUpdated).toLocaleString()}
                </div>
              )}
              <button
                onClick={refreshData}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Players</p>
                <p className="text-3xl font-bold text-gray-800">{insights.totalPlayers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Avg 3-Year Points</p>
                <p className="text-3xl font-bold text-gray-800">{insights.avgPoints || '0'}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Average Price</p>
                <p className="text-3xl font-bold text-gray-800">£{insights.avgPrice || '0'}m</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">3-Year Top Scorer</p>
                <p className="text-lg font-bold text-gray-800">{insights.topScorer?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">{insights.topScorer?.points || 0} pts</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Most Consistent</p>
                <p className="text-lg font-bold text-gray-800">{insights.mostConsistent?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">Score: {insights.mostConsistent?.overallScore || 0}</p>
              </div>
              <Star className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            3-Year Data Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                Min 3-Year Points: {minPoints}
              </label>
              <input
                type="range"
                min="0"
                max="800"
                step="25"
                value={minPoints}
                onChange={(e) => setMinPoints(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Seasons: {minSeasons}
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="1"
                value={minSeasons}
                onChange={(e) => setMinSeasons(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Player</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Player or team name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Price vs 3-Year Points Scatter */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Price vs 3-Year Total Points</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={priceVsPointsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="price" name="Price (£m)" />
                <YAxis dataKey="points" name="3-Year Points" />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'price' ? 'Price (£m)' : '3-Year Points']}
                  labelFormatter={(label) => {
                    const player = priceVsPointsData.find(d => d.price === label);
                    return player ? `${player.name} (${player.seasonsPlayed} seasons)` : '';
                  }}
                />
                <Scatter dataKey="points" fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Top Players by 3-Year Points */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Top 15 Players by 3-Year Points</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPlayersByPoints} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'points' ? '3-Year Points' : 'Avg/Season']}
                  labelFormatter={(name) => {
                    const player = topPlayersByPoints.find(p => p.name === name);
                    return player ? `${name} (${player.seasons} seasons)` : name;
                  }}
                />
                <Bar dataKey="points" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Best Value Players */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Best Value Players (3-Year Points per £m)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={valuePlayersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, 'Points per £m']}
                  labelFormatter={(name) => {
                    const player = valuePlayersData.find(p => p.name === name);
                    return player ? `${name} (${player.points} pts, £${player.price}m)` : name;
                  }}
                />
                <Bar dataKey="pointsPerMillion" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Most Consistent Players */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Most Consistent Players (2+ Seasons)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consistencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, 'Overall Score']}
                  labelFormatter={(name) => {
                    const player = consistencyData.find(p => p.name === name);
                    return player ? `${name} (${player.seasonsPlayed} seasons)` : name;
                  }}
                />
                <Bar dataKey="overallScore" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Position Distribution and Seasons Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Position Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Players by Position</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={positionData}
                  dataKey="count"
                  nameKey="position"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.position}: ${entry.count} (${entry.avgPoints} avg pts)`}
                >
                  {positionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Seasons Played Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Experience Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={seasonsDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="seasons" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'count' ? 'Players' : 'Percentage']}
                />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Player Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">
              3-Year Player Analysis ({filteredPlayers.length} players)
              {filteredPlayers.length !== players.length && (
                <span className="text-sm text-gray-500 ml-2">
                  (filtered from {players.length} total)
                </span>
              )}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">3Y Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg/Season</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PP£M</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seasons</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consistency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlayers.slice(0, 50).map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{player.name}</div>
                      <div className="text-sm text-gray-500">{player.fullName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.team}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        player.position === 'Forward' ? 'bg-red-100 text-red-800' :
                        player.position === 'Midfielder' ? 'bg-blue-100 text-blue-800' :
                        player.position === 'Defender' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">£{player.price}m</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.totalPoints}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.avgPointsPerSeason}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.pointsPerMillion.toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {player.seasonsPlayed}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.availabilityScore}%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{width: `${Math.min(player.overallScore || 0, 100)}%`}}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-600">{(player.overallScore || 0).toFixed(0)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Data sourced from Fantasy Premier League Official API • 3-Year Historical Analysis</p>
          <p className="mt-2">
          <p className="mt-2">
            Frontend: React + Recharts • Backend: Python + Flask + pandas • Deployed on Vercel
          </p>
          <p className="mt-1">
            <strong>Real Data Only:</strong> No sample data used • Comprehensive 3-year player analysis
          </p>
        </div>
      </div>
    </div>
  );
};

export default FPLDashboard;