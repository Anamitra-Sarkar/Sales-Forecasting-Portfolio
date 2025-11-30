import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar
} from 'recharts'
import {
  TrendingUp, Upload, Database, Activity, DollarSign,
  AlertCircle, CheckCircle, BarChart3, Calendar, Target,
  RefreshCw, Play, FileText
} from 'lucide-react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function App() {
  // State management
  const [salesData, setSalesData] = useState([])
  const [forecastData, setForecastData] = useState(null)
  const [modelMetrics, setModelMetrics] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [forecastDays, setForecastDays] = useState(30)
  const [activeTab, setActiveTab] = useState('overview')
  const [dragOver, setDragOver] = useState(false)
  
  const fileInputRef = useRef(null)

  // Check API connection
  useEffect(() => {
    checkConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      if (response.ok) {
        setIsConnected(true)
        const data = await response.json()
        if (data.data_loaded) {
          fetchData()
        }
      }
    } catch {
      setIsConnected(false)
    }
  }

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/data`)
      const result = await response.json()
      if (result.success) {
        setSalesData(result.data)
        calculateStats(result.data)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    }
  }

  const calculateStats = (data) => {
    if (!data || data.length === 0) return
    const sales = data.map(d => d.sales)
    setStatistics({
      mean: (sales.reduce((a, b) => a + b, 0) / sales.length).toFixed(2),
      min: Math.min(...sales).toFixed(2),
      max: Math.max(...sales).toFixed(2),
      count: data.length
    })
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      })
      const result = await response.json()
      
      if (response.ok) {
        setSuccess(`Data uploaded successfully! ${result.rows} records loaded.`)
        setSalesData([])
        setForecastData(null)
        setModelMetrics(null)
        fetchData()
      } else {
        setError(result.error || 'Failed to upload file')
      }
    } catch {
      setError('Failed to connect to server. Please ensure the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSampleData = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`${API_BASE_URL}/sample-data`)
      const result = await response.json()
      
      if (response.ok) {
        setSuccess('Sample data loaded successfully!')
        setSalesData(result.data)
        setStatistics({
          mean: result.statistics.mean,
          min: result.statistics.min,
          max: result.statistics.max,
          count: result.count
        })
        setForecastData(null)
        setModelMetrics(null)
      } else {
        setError(result.error || 'Failed to load sample data')
      }
    } catch {
      setError('Failed to connect to server. Please ensure the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  const trainModel = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`${API_BASE_URL}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_size: 0.2, order: [5, 1, 0] })
      })
      const result = await response.json()
      
      if (response.ok) {
        setSuccess(`Model trained! Accuracy: ${result.metrics.accuracy}%`)
        setModelMetrics(result.metrics)
      } else {
        setError(result.error || 'Failed to train model')
      }
    } catch {
      setError('Failed to connect to server. Please ensure the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  const generateForecast = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: forecastDays })
      })
      const result = await response.json()
      
      if (response.ok) {
        setForecastData(result)
        setActiveTab('forecast')
      } else {
        setError(result.error || 'Failed to generate forecast')
      }
    } catch {
      setError('Failed to connect to server. Please ensure the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'text/csv') {
      handleFileUpload(file)
    } else {
      setError('Please upload a CSV file')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Prepare chart data
  const chartData = salesData.slice(-90).map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }))

  const forecastChartData = forecastData ? [
    ...forecastData.historical.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: item.sales
    })),
    ...forecastData.forecast.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      forecast: item.forecast,
      upper: item.upper_bound,
      lower: item.lower_bound
    }))
  ] : []

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <TrendingUp size={24} />
            </div>
            <h1>Sales Forecaster</h1>
          </div>
          <div className="header-status">
            <span className={`status-dot ${isConnected ? '' : 'disconnected'}`}></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            Forecast
          </button>
          <button 
            className={`tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            Data
          </button>
        </div>

        {/* Stats Cards */}
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Total Records</span>
              <div className="stat-card-icon primary">
                <Database size={20} />
              </div>
            </div>
            <div className="stat-card-value">{statistics?.count || 0}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Average Sales</span>
              <div className="stat-card-icon success">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="stat-card-value">
              {statistics ? formatCurrency(statistics.mean) : '$0'}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Model Accuracy</span>
              <div className="stat-card-icon warning">
                <Target size={20} />
              </div>
            </div>
            <div className="stat-card-value">
              {modelMetrics ? `${modelMetrics.accuracy}%` : '-'}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Forecast Trend</span>
              <div className="stat-card-icon info">
                <Activity size={20} />
              </div>
            </div>
            <div className="stat-card-value">
              {forecastData?.summary?.trend || '-'}
            </div>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div className="charts-section">
              {/* Main Sales Chart */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">
                    <BarChart3 size={20} />
                    Sales Overview
                  </h2>
                </div>
                <div className="card-body">
                  {chartData.length > 0 ? (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ee6b1e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ee6b1e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12, fill: '#71717a' }}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#71717a' }}
                            tickLine={false}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            contentStyle={{
                              background: 'white',
                              border: '1px solid #e4e4e7',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            formatter={(value) => [`$${value}`, 'Sales']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#ee6b1e" 
                            strokeWidth={2}
                            fill="url(#salesGradient)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <BarChart3 size={48} />
                      </div>
                      <h3 className="empty-state-title">No Data Available</h3>
                      <p className="empty-state-text">
                        Upload a CSV file or load sample data to visualize sales trends.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Model Metrics */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">
                    <Target size={20} />
                    Model Performance
                  </h2>
                </div>
                <div className="card-body">
                  {modelMetrics ? (
                    <div className="metrics-grid">
                      <div className="metric-item">
                        <div className="metric-value">{modelMetrics.accuracy}%</div>
                        <div className="metric-label">Accuracy</div>
                      </div>
                      <div className="metric-item">
                        <div className="metric-value">{modelMetrics.mape}%</div>
                        <div className="metric-label">MAPE</div>
                      </div>
                      <div className="metric-item">
                        <div className="metric-value">${modelMetrics.mae}</div>
                        <div className="metric-label">MAE</div>
                      </div>
                      <div className="metric-item">
                        <div className="metric-value">${modelMetrics.rmse}</div>
                        <div className="metric-label">RMSE</div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Activity size={48} />
                      </div>
                      <h3 className="empty-state-title">No Model Trained</h3>
                      <p className="empty-state-text">
                        Train a model to see performance metrics.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="controls-section">
              {/* Upload Section */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">
                    <Upload size={20} />
                    Upload Data
                  </h2>
                </div>
                <div className="card-body">
                  <div 
                    className={`file-upload ${dragOver ? 'dragover' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                    />
                    <div className="file-upload-icon">
                      <FileText size={48} />
                    </div>
                    <p className="file-upload-text">
                      <strong>Click to upload</strong> or drag and drop
                    </p>
                    <p className="file-upload-hint">CSV file with Date and Sales columns</p>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={loadSampleData}
                      disabled={isLoading}
                      style={{ width: '100%' }}
                    >
                      <Database size={18} />
                      Load Sample Data
                    </button>
                  </div>
                </div>
              </div>

              {/* Model Training */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">
                    <Play size={20} />
                    Train & Forecast
                  </h2>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Forecast Days</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={forecastDays}
                      onChange={(e) => setForecastDays(Math.min(365, Math.max(1, parseInt(e.target.value) || 30)))}
                      min="1"
                      max="365"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                    <button 
                      className="btn btn-primary"
                      onClick={trainModel}
                      disabled={isLoading || salesData.length === 0}
                    >
                      {isLoading ? <span className="loading-spinner"></span> : <RefreshCw size={18} />}
                      Train Model
                    </button>
                    <button 
                      className="btn btn-success"
                      onClick={generateForecast}
                      disabled={isLoading || !modelMetrics}
                    >
                      {isLoading ? <span className="loading-spinner"></span> : <TrendingUp size={18} />}
                      Generate Forecast
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <TrendingUp size={20} />
                Sales Forecast
              </h2>
              {forecastData && (
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                  {forecastDays} day forecast • {forecastData.summary.trend} trend
                </div>
              )}
            </div>
            <div className="card-body">
              {forecastData ? (
                <>
                  <div className="chart-container" style={{ height: '450px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecastChartData}>
                        <defs>
                          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12, fill: '#71717a' }}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#71717a' }}
                          tickLine={false}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip 
                          contentStyle={{
                            background: 'white',
                            border: '1px solid #e4e4e7',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          formatter={(value, name) => [
                            `$${value}`,
                            name === 'actual' ? 'Actual' : 
                            name === 'forecast' ? 'Forecast' :
                            name === 'upper' ? 'Upper Bound' : 'Lower Bound'
                          ]}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="upper" 
                          stroke="none"
                          fill="#dcfce7" 
                          name="Confidence Interval"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="lower" 
                          stroke="none"
                          fill="white" 
                          name="lower"
                          legendType="none"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="actual" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={false}
                          name="Historical"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="forecast" 
                          stroke="#22c55e" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Forecast"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Forecast Summary */}
                  <div className="metrics-grid" style={{ marginTop: '1.5rem' }}>
                    <div className="metric-item">
                      <div className="metric-value">{formatCurrency(forecastData.summary.avg_forecast)}</div>
                      <div className="metric-label">Average Forecast</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-value">{formatCurrency(forecastData.summary.min_forecast)}</div>
                      <div className="metric-label">Min Forecast</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-value">{formatCurrency(forecastData.summary.max_forecast)}</div>
                      <div className="metric-label">Max Forecast</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-value" style={{ textTransform: 'capitalize' }}>
                        {forecastData.summary.trend}
                      </div>
                      <div className="metric-label">Trend Direction</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <TrendingUp size={48} />
                  </div>
                  <h3 className="empty-state-title">No Forecast Generated</h3>
                  <p className="empty-state-text">
                    Train a model and generate a forecast to see predictions here.
                  </p>
                  <button 
                    className="btn btn-primary" 
                    style={{ marginTop: '1rem' }}
                    onClick={() => setActiveTab('overview')}
                  >
                    Go to Overview
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Database size={20} />
                Sales Data
              </h2>
              <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                Showing last 100 records
              </span>
            </div>
            <div className="card-body">
              {salesData.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.slice(-100).reverse().map((row, index) => (
                        <tr key={index}>
                          <td>{new Date(row.date).toLocaleDateString()}</td>
                          <td>{formatCurrency(row.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Database size={48} />
                  </div>
                  <h3 className="empty-state-title">No Data Available</h3>
                  <p className="empty-state-text">
                    Upload a CSV file or load sample data to see records here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          Sales Forecasting App • Built with React & Python • 
          <a href="https://github.com/Anamitra-Sarkar/Sales-Forecasting-Portfolio" target="_blank" rel="noopener noreferrer">
            {' '}View on GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
