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
                    : 'text-gray-600 hover:bg
