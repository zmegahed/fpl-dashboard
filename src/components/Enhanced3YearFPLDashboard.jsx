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
