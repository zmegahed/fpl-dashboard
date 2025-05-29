import React, { useState, useEffect, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, Users, Award, Target, Star, 
         Filter, Search, RefreshCw, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

const FPLDashboard = () => {
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [maxPrice, setMaxPrice] = useState(15);
  const [minPoints, setMinPoints] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch FPL data from API endpoints
  const fetchFPLData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching FPL data from API...');
      
      // Fetch players data
      const playersResponse = await fetch('/api/players');
      if (!playersResponse.ok) {
        throw new Error(`Players API error! status: ${playersResponse.status}`);
      }
      
      const playersData = await playersResponse.json();
      console.log(`Fetched ${playersData.players?.length || 0} players from API`);
      
      // Fetch summary stats
      const statsResponse = await fetch('/api/stats');
      if (!statsResponse.ok) {
        throw new Error(`Stats API error! status: ${statsResponse.status}`);
      }
      
      const statsData = await statsResponse.json();
      
      setPlayers(playersData.players || []);
      setStats(statsData);
      setLastUpdated(playersData.lastUpdated || new Date().toISOString());
      
    } catch (err) {
      console.error('Error fetching FPL data:', err);
      setError(`Failed to fetch FPL data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchFPLData();
  }, []);

  // Filter players based on current filters
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesPosition = selectedPosition === 'All' || player.position === selectedPosition;
      const matchesPrice = player.price <= maxPrice;
      const matchesPoints = player.totalPoints >= minPoints;
      const matchesSearch = searchTerm === '' || 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.fullName && player.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesPosition && matchesPrice && matchesPoints && matchesSearch;
    });
  }, [players, selectedPosition, maxPrice, minPoints, searchTerm]);

  // Calculate insights from filtered data
  const insights = useMemo(() => {
    if (filteredPlayers.length === 0) return stats;
    
    const totalPlayers = filteredPlayers.length;
    const avgPoints = filteredPlayers.reduce((sum, p) => sum + (p.totalPoints || 0), 0) / totalPlayers;
    const avgPrice = filteredPlayers.reduce((sum, p) => sum + (p.price || 0), 0) / totalPlayers;
    const topScorer = filteredPlayers.reduce((max, p) => (p.totalPoints || 0) > (max.totalPoints || 0) ? p : max, filteredPlayers[0] || {});
    const bestValue = filteredPlayers.reduce((max, p) => (p.pointsPerMillion || 0) > (max.pointsPerMillion || 0) ? p : max, filteredPlayers[0] || {});
    
    return {
      totalPlayers,
      avgPoints: avgPoints.toFixed(1),
      avgPrice: avgPrice.toFixed(1),
      topScorer: { 
        name: topScorer.name || 'N/A', 
        points: topScorer.totalPoints || 0,
        totalPoints: topScorer.totalPoints || 0
      },
      bestValue: { 
        name: bestValue.name || 'N/A', 
        pointsPerMillion: (bestValue.pointsPerMillion || 0).toFixed(1) 
      }
    };
  }, [filteredPlayers, stats]);

  // Prepare chart data
  const priceVsPointsData = filteredPlayers.slice(0, 100).map(player => ({
    name: player.name,
    price: player.price || 0,
    points: player.totalPoints || 0,
    position: player.position,
    team: player.team,
    pointsPerMillion: player.pointsPerMillion || 0
  }));

  const topPlayersByPoints = filteredPlayers
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .slice(0, 15)
    .map(player => ({
      name: player.name && player.name.length > 12 ? player.name.substring(0, 12) + '...' : player.name || 'Unknown',
      points: player.totalPoints || 0,
      team: player.team,
      position: player.position
    }));

  const valuePlayersData = filteredPlayers
    .sort((a, b) => (b.pointsPerMillion || 0) - (a.pointsPerMillion || 0))
    .slice(0, 15)
    .map(player => ({
      name: player.name && player.name.length > 12 ? player.name.substring(0, 12) + '...' : player.name || 'Unknown',
      pointsPerMillion: parseFloat((player.pointsPerMillion || 0).toFixed(1)),
      price: player.price || 0,
      points: player.totalPoints || 0
    }));

  // Position breakdown
  const positionCounts = filteredPlayers.reduce((acc, player) => {
    const position = player.position || 'Unknown';
    acc[position] = (acc[position] || 0) + 1;
    return acc;
  }, {});

  const positionData = Object.entries(positionCounts).map(([position, count]) => ({
    position,
    count,
    avgPoints: Math.round(filteredPlayers
      .filter(p => p.position === position)
      .reduce((sum, p) => sum + (p.totalPoints || 0), 0) / count)
  }));

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#ff0080'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 animate-spin text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading FPL Data</h2>
            <p className="text-gray-600 mb-2">
              Fetching real Fantasy Premier League data from API...
            </p>
            <p className="text-sm text-gray-500">
              This may take a moment as we process live player data.
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Failed to Load Data</h2>
            <p className="text-gray-600 mb-4 max-w-2xl mx-auto">{error}</p>
            <div className="space-x-4">
              <button
                onClick={fetchFPLData}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
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
                ⚽ FPL Analysis Dashboard
              </h1>
              <p className="text-gray-600">
                Fantasy Premier League analysis with real-time data
              </p>
              <div className="flex items-center gap-4 mt-2">
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
                onClick={fetchFPLData}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <p className="text-gray-500 text-sm">Average Points</p>
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
                <p className="text-gray-500 text-sm">Top Scorer</p>
                <p className="text-lg font-bold text-gray-800">{insights.topScorer?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">{insights.topScorer?.points || 0} pts</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                Min Points: {minPoints}
              </label>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={minPoints}
                onChange={(e) => setMinPoints(parseInt(e.target.value))}
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
          {/* Price vs Points Scatter */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Price vs Total Points</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={priceVsPointsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="price" name="Price (£m)" />
                <YAxis dataKey="points" name="Points" />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'price' ? 'Price (£m)' : 'Points']}
                  labelFormatter={(label) => {
                    const player = priceVsPointsData.find(d => d.price === label);
                    return player ? player.name : '';
                  }}
                />
                <Scatter dataKey="points" fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Top Players by Points */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Top 15 Players by Points</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPlayersByPoints} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="points" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Best Value Players */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Best Value Players (Points per £m)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={valuePlayersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="pointsPerMillion" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>

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
                  label={(entry) => `${entry.position}: ${entry.count}`}
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
        </div>

        {/* Player Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">
              Player Details ({filteredPlayers.length} players)
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PPG</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PP£M</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Own%</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlayers.slice(0, 50).map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{player.name || 'Unknown'}</div>
                      {player.fullName && (
                        <div className="text-sm text-gray-500">{player.fullName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.team || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        player.position === 'Forward' ? 'bg-red-100 text-red-800' :
                        player.position === 'Midfielder' ? 'bg-blue-100 text-blue-800' :
                        player.position === 'Defender' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {player.position || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">£{(player.price || 0).toFixed(1)}m</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.totalPoints || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(player.ppg || 0).toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(player.pointsPerMillion || 0).toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(player.form || 0).toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(player.ownership || 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Data sourced from Fantasy Premier League Official API • Real-time Analysis</p>
          <p className="mt-2">
            Frontend: React + Recharts • Backend: Python Serverless Functions • Deployed on Vercel
          </p>
          <p className="mt-1">
            <strong>Real Data Only:</strong> No sample data used • Live FPL player analysis
          </p>
        </div>
      </div>
    </div>
  );
};

export default FPLDashboard;