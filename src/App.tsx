import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  Thermometer, 
  Clock, 
  Target, 
  Save, 
  Trash2,
  History,
  Weight,
  MapPin,
  TrendingUp,
  Zap,
  Timer,
  CheckCircle,
  Plus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';

interface RoastData {
  id: string;
  date: string;
  greenWeight: number;
  roastedWeight: number;
  ambientTemp: number;
  chargeTemp: number;
  roastType: string;
  beanOrigin: string;
  totalTime: number;
  firstCrackTime: number;
  developmentPercent: number;
  weightLoss: number;
  notes: string;
  temperatureReadings: TemperatureReading[];
}

interface TemperatureReading {
  time: number;
  temperature: number;
}

type RoastPhase = 'drying' | 'maillard' | 'development';
type AppState = 'setup' | 'roasting' | 'completion' | 'summary' | 'history';

function App() {
  const [appState, setAppState] = useState<AppState>('setup');
  const [roastTimer, setRoastTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [firstCrackTime, setFirstCrackTime] = useState<number | null>(null);
  const [temperatureReadings, setTemperatureReadings] = useState<TemperatureReading[]>([]);
  const [currentTemp, setCurrentTemp] = useState('');
  const [roastHistory, setRoastHistory] = useState<RoastData[]>([]);
  
  // Setup form state
  const [greenWeight, setGreenWeight] = useState('');
  const [ambientTemp, setAmbientTemp] = useState('');
  const [chargeTemp, setChargeTemp] = useState('');
  const [roastType, setRoastType] = useState('Medium');
  const [beanOrigin, setBeanOrigin] = useState('');
  
  // Completion state
  const [roastedWeight, setRoastedWeight] = useState('');
  const [roastNotes, setRoastNotes] = useState('');

  // Load roast history from localStorage
  useEffect(() => {
    const savedRoasts = localStorage.getItem('roastHistory');
    if (savedRoasts) {
      setRoastHistory(JSON.parse(savedRoasts));
    }
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setRoastTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPredictions = () => {
    const weight = parseFloat(greenWeight) || 0;
    const charge = parseFloat(chargeTemp) || 0;
    
    // Simple predictions based on common roasting patterns
    const baseTime = weight > 500 ? 720 : 660; // 12:00 or 11:00 base
    const tempAdjustment = (charge - 200) * 0.5; // Adjust for charge temp
    
    const estimatedFirstCrack = baseTime * 0.8 + tempAdjustment;
    const estimatedTotal = baseTime + tempAdjustment;
    const suggestedDevelopment = roastType === 'Light' ? 15 : roastType === 'Medium' ? 18 : 22;
    
    return {
      firstCrack: Math.max(estimatedFirstCrack, 480), // At least 8 minutes
      totalTime: Math.max(estimatedTotal, 600), // At least 10 minutes
      development: suggestedDevelopment
    };
  };

  const getCurrentPhase = (): RoastPhase => {
    if (!firstCrackTime) return 'drying';
    if (roastTimer < firstCrackTime) return 'maillard';
    return 'development';
  };

  const getDevelopmentPercent = () => {
    if (!firstCrackTime) return 0;
    const developmentTime = roastTimer - firstCrackTime;
    return Math.round((developmentTime / roastTimer) * 100);
  };

  const getRateOfRise = () => {
    if (temperatureReadings.length < 2) return 0;
    const lastTwo = temperatureReadings.slice(-2);
    const timeDiff = lastTwo[1].time - lastTwo[0].time;
    const tempDiff = lastTwo[1].temperature - lastTwo[0].temperature;
    return Math.round((tempDiff / timeDiff) * 60); // Per minute
  };

  const startRoast = () => {
    setIsTimerRunning(true);
    setAppState('roasting');
    // Add initial temperature reading
    if (chargeTemp) {
      setTemperatureReadings([{
        time: 0,
        temperature: parseFloat(chargeTemp)
      }]);
    }
  };

  const stopRoast = () => {
    setIsTimerRunning(false);
  };

  const resetRoast = () => {
    setIsTimerRunning(false);
    setRoastTimer(0);
    setFirstCrackTime(null);
    setTemperatureReadings([]);
    setCurrentTemp('');
    setAppState('setup');
  };

  const markFirstCrack = () => {
    setFirstCrackTime(roastTimer);
  };

  const addTemperatureReading = () => {
    if (currentTemp && !isNaN(parseFloat(currentTemp))) {
      setTemperatureReadings(prev => [...prev, {
        time: roastTimer,
        temperature: parseFloat(currentTemp)
      }]);
      setCurrentTemp('');
    }
  };

  const finishRoast = () => {
    setIsTimerRunning(false);
    setAppState('completion');
  };

  const proceedToSummary = () => {
    setAppState('summary');
  };

  const saveRoast = () => {
    const weightLoss = ((parseFloat(greenWeight) - parseFloat(roastedWeight)) / parseFloat(greenWeight)) * 100;
    
    const roastData: RoastData = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      greenWeight: parseFloat(greenWeight),
      roastedWeight: parseFloat(roastedWeight),
      ambientTemp: parseFloat(ambientTemp),
      chargeTemp: parseFloat(chargeTemp),
      roastType,
      beanOrigin,
      totalTime: roastTimer,
      firstCrackTime: firstCrackTime || 0,
      developmentPercent: getDevelopmentPercent(),
      weightLoss,
      notes: roastNotes,
      temperatureReadings
    };

    const updatedHistory = [...roastHistory, roastData];
    setRoastHistory(updatedHistory);
    localStorage.setItem('roastHistory', JSON.stringify(updatedHistory));
    
    // Reset for next roast
    resetRoast();
  };

  const deleteRoast = (id: string) => {
    const updatedHistory = roastHistory.filter(roast => roast.id !== id);
    setRoastHistory(updatedHistory);
    localStorage.setItem('roastHistory', JSON.stringify(updatedHistory));
  };

  const clearAllRoasts = () => {
    setRoastHistory([]);
    localStorage.removeItem('roastHistory');
  };

  const predictions = getPredictions();
  const currentPhase = getCurrentPhase();

  const getPhaseColor = (phase: RoastPhase) => {
    switch (phase) {
      case 'drying': return 'bg-blue-500';
      case 'maillard': return 'bg-orange-500';
      case 'development': return 'bg-red-500';
    }
  };

  const getPhaseIcon = (phase: RoastPhase) => {
    switch (phase) {
      case 'drying': return <Thermometer className="w-5 h-5 text-blue-400" />;
      case 'maillard': return <Zap className="w-5 h-5 text-orange-400" />;
      case 'development': return <TrendingUp className="w-5 h-5 text-red-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#9E6F3D] leading-tight mb-2">
            Zena Roasting Assistant
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">Professional Coffee Roasting Assistant</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-8 p-1 bg-white rounded-2xl border border-gray-300 shadow-lg">
          {[
            { key: 'setup', label: 'Setup', icon: Target, color: 'bg-gray-100 hover:bg-gray-200' },
            { key: 'roasting', label: 'Roast', icon: Play, disabled: !greenWeight || !chargeTemp, color: 'bg-gray-100 hover:bg-gray-200' },
            { key: 'history', label: 'History', icon: History, color: 'bg-gray-100 hover:bg-gray-200' }
          ].map(({ key, label, icon: Icon, disabled, color }) => (
            <button
              key={key}
              onClick={() => setAppState(key as AppState)}
              disabled={disabled}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                appState === key 
                  ? 'bg-black text-white shadow-lg' 
                  : 'text-gray-700 hover:text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Setup Panel */}
        {appState === 'setup' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-300 shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500 rounded-xl">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-black">Roast Configuration</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-black">
                    <Weight className="w-4 h-4 text-yellow-500" />
                    Green Bean Weight (g)
                  </label>
                  <input
                    type="number"
                    value={greenWeight}
                    onChange={(e) => setGreenWeight(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="400"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-black">
                    <Thermometer className="w-4 h-4 text-cyan-500" />
                    Ambient Temperature (°C)
                  </label>
                  <input
                    type="number"
                    value={ambientTemp}
                    onChange={(e) => setAmbientTemp(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="22"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-black">
                    <Thermometer className="w-4 h-4 text-red-500" />
                    Charge Temperature (°C)
                  </label>
                  <input
                    type="number"
                    value={chargeTemp}
                    onChange={(e) => setChargeTemp(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    placeholder="200"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-black">
                    <Coffee className="w-4 h-4 text-amber-500" />
                    Roast Profile
                  </label>
                  <select
                    value={roastType}
                    onChange={(e) => setRoastType(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  >
                    <option value="Light">Light Roast</option>
                    <option value="Medium">Medium Roast</option>
                    <option value="Dark">Dark Roast</option>
                  </select>
                </div>
                
                <div className="md:col-span-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-black">
                    <MapPin className="w-4 h-4 text-green-500" />
                    Bean Origin (Optional)
                  </label>
                  <input
                    type="text"
                    value={beanOrigin}
                    onChange={(e) => setBeanOrigin(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="e.g., Ethiopia Yirgacheffe"
                  />
                </div>
              </div>
            </div>

            {/* Prediction Card */}
            {greenWeight && chargeTemp && (
              <div className="bg-white rounded-3xl border border-gray-300 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-500 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-black">AI Roast Predictions</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-2xl border border-gray-300">
                    <div className="text-3xl font-bold text-orange-500 mb-1">{formatTime(predictions.firstCrack)}</div>
                    <div className="text-gray-600 text-sm">First Crack</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-2xl border border-gray-300">
                    <div className="text-3xl font-bold text-green-500 mb-1">{formatTime(predictions.totalTime)}</div>
                    <div className="text-gray-600 text-sm">Total Time</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-2xl border border-gray-300">
                    <div className="text-3xl font-bold text-blue-500 mb-1">{predictions.development}%</div>
                    <div className="text-gray-600 text-sm">Development</div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={startRoast}
              disabled={!greenWeight || !chargeTemp}
              className="w-full bg-green-500 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg transition-all duration-200"
            >
              <Play className="w-6 h-6" />
              Begin Roasting Session
            </button>
          </div>
        )}

        {/* Roasting Control */}
        {appState === 'roasting' && (
          <div className="space-y-6">
            {/* Timer and Phase Display */}
            <div className="bg-white rounded-3xl border border-gray-300 shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="text-7xl font-bold text-black mb-4 font-mono tracking-tight">
                  {formatTime(roastTimer)}
                </div>
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl ${getPhaseColor(currentPhase)} text-white font-semibold shadow-lg`}>
                  {getPhaseIcon(currentPhase)}
                  <span className="capitalize">{currentPhase} Phase</span>
                </div>
                {firstCrackTime && (
                  <div className="mt-4 text-gray-700">
                    <span className="text-orange-500 font-semibold">First Crack:</span> {formatTime(firstCrackTime)} • 
                    <span className="text-blue-500 font-semibold"> Development:</span> {getDevelopmentPercent()}%
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <button
                  onClick={isTimerRunning ? stopRoast : () => setIsTimerRunning(true)}
                  className={`py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg text-white ${
                    isTimerRunning 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span className="hidden sm:inline">{isTimerRunning ? 'Pause' : 'Start'}</span>
                </button>
                
                <button
                  onClick={markFirstCrack}
                  disabled={!isTimerRunning || firstCrackTime !== null}
                  className="py-4 px-6 rounded-2xl font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200"
                >
                  <Zap className="w-5 h-5 mx-auto sm:hidden" />
                  <span className="hidden sm:inline">1st Crack</span>
                </button>
                
                <button
                  onClick={resetRoast}
                  className="py-4 px-6 rounded-2xl font-bold bg-gray-600 text-white hover:bg-gray-700 flex items-center justify-center gap-2 shadow-lg transition-all duration-200"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>

              {/* Temperature Entry */}
              <div className="bg-white rounded-2xl p-6 border border-gray-300">
                <div className="flex gap-3 mb-4">
                  <input
                    type="number"
                    value={currentTemp}
                    onChange={(e) => setCurrentTemp(e.target.value)}
                    placeholder="Enter temperature (°C)"
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={addTemperatureReading}
                    disabled={!currentTemp || isNaN(parseFloat(currentTemp))}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2 shadow-lg transition-all duration-200"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Log Temp</span>
                  </button>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    <TrendingUp className="w-4 h-4 inline mr-1 text-yellow-500" />
                    RoR: <span className="text-yellow-600 font-semibold">{getRateOfRise()}°C/min</span>
                  </span>
                  <span className="text-gray-600">
                    Readings: <span className="text-cyan-600 font-semibold">{temperatureReadings.length}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Live Chart */}
            <div className="bg-white rounded-3xl border border-gray-300 shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black">Live Roast Curve</h3>
              </div>
              <div className="w-full overflow-x-auto">
                <div className="min-w-[600px] h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={temperatureReadings}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                      <XAxis 
                        dataKey="time" 
                        type="number"
                        scale="linear"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => formatTime(value)}
                        stroke="#374151"
                      />
                      <YAxis domain={['dataMin - 10', 'dataMax + 10']} stroke="#374151" />
                      <Tooltip 
                        labelFormatter={(value) => `Time: ${formatTime(value as number)}`}
                        formatter={(value) => [`${value}°C`, 'Temperature']}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '12px',
                          color: '#000000'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="temperature"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="url(#tempGradient)"
                      />
                      {firstCrackTime && (
                        <ReferenceLine 
                          x={firstCrackTime} 
                          stroke="#f59e0b" 
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{ value: "First Crack", position: "top" }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <button
              onClick={finishRoast}
              className="w-full bg-red-500 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:bg-red-600 flex items-center justify-center gap-3 shadow-lg transition-all duration-200"
            >
              <CheckCircle className="w-6 h-6" />
              Complete Roast
            </button>
          </div>
        )}

        {/* Completion Flow */}
        {appState === 'completion' && (
          <div className="bg-white rounded-3xl border border-gray-300 shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="p-4 bg-green-500 rounded-full w-20 h-20 mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-black mb-2">Roast Complete!</h2>
              <p className="text-gray-600 text-lg">Remove beans and weigh them for final analysis</p>
            </div>
            
            <div className="space-y-2 mb-8">
              <label className="flex items-center gap-2 text-sm font-medium text-black">
                <Weight className="w-4 h-4 text-yellow-500" />
                Final Roasted Weight (g)
              </label>
              <input
                type="number"
                value={roastedWeight}
                onChange={(e) => setRoastedWeight(e.target.value)}
                className="w-full px-4 py-4 bg-white border border-gray-300 rounded-xl text-black text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="340"
              />
            </div>

            <button
              onClick={proceedToSummary}
              disabled={!roastedWeight}
              className="w-full bg-blue-500 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200"
            >
              Generate Summary
            </button>
          </div>
        )}

        {/* Summary */}
        {appState === 'summary' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-300 shadow-lg p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-500 rounded-xl">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-black">Roast Analysis</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-gray-300">
                  <div className="text-gray-600 text-sm mb-1">Total Roast Time</div>
                  <div className="text-4xl font-bold text-cyan-500">{formatTime(roastTimer)}</div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-gray-300">
                  <div className="text-gray-600 text-sm mb-1">Development Ratio</div>
                  <div className="text-4xl font-bold text-pink-500">{getDevelopmentPercent()}%</div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-gray-300">
                  <div className="text-gray-600 text-sm mb-1">Weight Loss</div>
                  <div className="text-4xl font-bold text-orange-500">
                    {Math.round(((parseFloat(greenWeight) - parseFloat(roastedWeight)) / parseFloat(greenWeight)) * 100)}%
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-gray-300">
                  <div className="text-gray-600 text-sm mb-1">First Crack Time</div>
                  <div className="text-4xl font-bold text-green-500">
                    {firstCrackTime ? formatTime(firstCrackTime) : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
                  <div>
                    <span className="text-gray-600">Roast Profile:</span> 
                    <span className="font-semibold text-amber-600 ml-2">{roastType}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Bean Origin:</span> 
                    <span className="font-semibold text-green-600 ml-2">{beanOrigin || 'Not specified'}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-black">Roast Notes & Observations</label>
                  <textarea
                    value={roastNotes}
                    onChange={(e) => setRoastNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Record your observations about the roast process, aroma, color changes, or any adjustments made..."
                  />
                </div>
              </div>
            </div>

            <button
              onClick={saveRoast}
              className="w-full bg-green-500 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:bg-green-600 flex items-center justify-center gap-3 shadow-lg transition-all duration-200"
            >
              <Save className="w-6 h-6" />
              Save Roast Profile
            </button>
          </div>
        )}

        {/* History */}
        {appState === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-300 shadow-lg p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-xl">
                    <History className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-black">Roast History</h2>
                </div>
                {roastHistory.length > 0 && (
                  <button
                    onClick={clearAllRoasts}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              {roastHistory.length === 0 ? (
                <div className="text-center py-16">
                  <div className="p-4 bg-amber-500 rounded-full w-20 h-20 mx-auto mb-6">
                    <Coffee className="w-12 h-12 text-white mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-2">No Roasts Yet</h3>
                  <p className="text-gray-600">Start your first roasting session to build your history</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roastHistory.map((roast) => (
                    <div key={roast.id} className="bg-white border border-gray-300 rounded-2xl p-6 hover:bg-gray-50 transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-bold text-black text-lg mb-1">
                            {roast.roastType} - {roast.beanOrigin || 'Unknown Origin'}
                          </div>
                          <div className="text-gray-600 text-sm">
                            {new Date(roast.date).toLocaleDateString()} at {new Date(roast.date).toLocaleTimeString()}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteRoast(roast.id)}
                          className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-300">
                          <div className="text-gray-600 text-xs mb-1">Duration</div>
                          <div className="font-bold text-blue-500">{formatTime(roast.totalTime)}</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-300">
                          <div className="text-gray-600 text-xs mb-1">Development</div>
                          <div className="font-bold text-purple-500">{roast.developmentPercent}%</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-300">
                          <div className="text-gray-600 text-xs mb-1">Weight Loss</div>
                          <div className="font-bold text-orange-500">{Math.round(roast.weightLoss)}%</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-300">
                          <div className="text-gray-600 text-xs mb-1">First Crack</div>
                          <div className="font-bold text-green-500">{formatTime(roast.firstCrackTime)}</div>
                        </div>
                      </div>
                      
                      {roast.notes && (
                        <div className="pt-4 border-t border-gray-300">
                          <div className="text-gray-700 text-sm leading-relaxed">{roast.notes}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;