# 📈 Sales Forecasting App

A modern, full-stack sales forecasting application that uses ARIMA time-series analysis to predict future sales. Built with React, Flask, and Python.

![Sales Forecaster Dashboard](docs/screenshot.png)

## ✨ Features

- **Interactive Dashboard**: Modern, responsive UI with real-time data visualization
- **Data Upload**: Upload your own CSV sales data or use sample data
- **ARIMA Forecasting**: Train machine learning models to predict future sales
- **Performance Metrics**: View model accuracy, MAPE, MAE, and RMSE
- **Confidence Intervals**: Visualize prediction uncertainty with upper/lower bounds
- **Beautiful Charts**: Interactive charts built with Recharts

## 🚀 Quick Start

### Prerequisites

- Python 3.8+ 
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

The API will be available at `http://localhost:5000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
Sales-Forecasting-Portfolio/
├── backend/
│   ├── app.py              # Flask API with ARIMA model
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── App.css         # Styling
│   │   └── index.css       # Global styles
│   ├── public/
│   └── package.json
├── Sales_Forecasting_Model_with_ARIMA.ipynb  # Original Jupyter notebook
└── README.md
```

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check and status |
| `/api/upload` | POST | Upload CSV sales data |
| `/api/data` | GET | Get current sales data |
| `/api/sample-data` | GET | Load sample demo data |
| `/api/train` | POST | Train ARIMA model |
| `/api/forecast` | POST | Generate future forecast |

## 📊 Data Format

The CSV file should have two columns:
- `Date`: Date in any standard format (YYYY-MM-DD, MM/DD/YYYY, etc.)
- `Sales`: Numeric sales values

Example:
```csv
Date,Sales
2023-01-01,450.25
2023-01-02,520.00
2023-01-03,480.75
```

## 🎨 UI Features

- **Clean, Professional Design**: Warm orange color palette with subtle shadows
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Interactive Charts**: Hover for details, smooth animations
- **Real-time Feedback**: Loading states, success/error notifications
- **Tab Navigation**: Organized overview, forecast, and data views

## 🔬 Technical Details

### Performance Optimizations

1. **Vectorized Calculations**: NumPy operations for fast metric computation
2. **Efficient Data Processing**: Pandas optimizations for time series prep
3. **Model Caching**: Trained models are cached to avoid redundant training
4. **Lazy Loading**: Heavy dependencies loaded only when needed

### ARIMA Model

The app uses ARIMA(5,1,0) by default:
- **p=5**: 5 autoregressive terms
- **d=1**: 1 differencing step for stationarity
- **q=0**: No moving average terms

## 🛠️ Technologies Used

### Backend
- **Flask**: Lightweight Python web framework
- **Pandas**: Data manipulation and analysis
- **Statsmodels**: ARIMA time series modeling
- **NumPy**: Numerical computing
- **Scikit-learn**: Evaluation metrics

### Frontend
- **React 19**: Modern UI framework
- **Vite**: Fast build tool
- **Recharts**: Composable chart library
- **Lucide React**: Beautiful icons

## 📈 Example Results

The model achieves:
- **Accuracy**: ~89% (100% - MAPE)
- **MAPE**: ~11% Mean Absolute Percentage Error
- **MAE**: ~$54 Mean Absolute Error

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Original ARIMA implementation based on the Jupyter notebook
- UI design inspired by modern dashboard patterns
- Icons from Lucide
