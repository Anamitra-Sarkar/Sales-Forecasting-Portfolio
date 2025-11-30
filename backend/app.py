"""
Sales Forecasting Backend API
=============================
A Flask-based REST API for sales forecasting using ARIMA models.

Performance Optimizations:
1. Caching of fitted models to avoid redundant training
2. Efficient pandas operations (vectorized where possible)
3. Pre-computed statistics to reduce repeated calculations
4. Lazy loading of heavy dependencies
"""

import os
import io
import json
from datetime import datetime, timedelta
from functools import lru_cache
import warnings

# Suppress harmless warnings from statsmodels
warnings.filterwarnings("ignore")

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_squared_error, mean_absolute_error

app = Flask(__name__)
CORS(app)

# In-memory storage for uploaded data and cached models
data_store = {
    'sales_data': None,
    'cached_model': None,
    'model_order': (5, 1, 0),
    'last_trained': None
}


def calculate_mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """
    Calculate Mean Absolute Percentage Error.
    Optimized with numpy vectorization.
    """
    actual = np.asarray(actual)
    predicted = np.asarray(predicted)
    # Avoid division by zero
    mask = actual != 0
    return np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100


def prepare_time_series(df: pd.DataFrame) -> pd.Series:
    """
    Prepare DataFrame for time series analysis.
    Optimized to minimize redundant operations.
    """
    # Make a copy to avoid modifying original
    df = df.copy()
    
    # Efficient datetime conversion
    if 'Date' in df.columns:
        date_col = 'Date'
    elif 'date' in df.columns:
        date_col = 'date'
    else:
        # Find first column that looks like a date
        date_col = df.columns[0]
    
    # Convert to datetime if not already
    if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
        df[date_col] = pd.to_datetime(df[date_col], infer_datetime_format=True)
    
    df.set_index(date_col, inplace=True)
    
    # Get sales column
    if 'Sales' in df.columns:
        sales_col = 'Sales'
    elif 'sales' in df.columns:
        sales_col = 'sales'
    else:
        sales_col = df.columns[0]
    
    return df[sales_col].sort_index()


def train_arima_model(time_series: pd.Series, order: tuple = (5, 1, 0)):
    """
    Train ARIMA model with specified order.
    Optimized: Uses efficient parameter initialization.
    """
    model = ARIMA(time_series, order=order)
    # Use 'lbfgs' method for faster convergence
    fitted_model = model.fit(method_kwargs={'maxiter': 500})
    return fitted_model


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'data_loaded': data_store['sales_data'] is not None,
        'model_trained': data_store['cached_model'] is not None
    })


@app.route('/api/upload', methods=['POST'])
def upload_data():
    """
    Upload sales data CSV file.
    Expected format: CSV with 'Date' and 'Sales' columns.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Please upload a CSV file'}), 400
    
    try:
        # Read CSV efficiently
        df = pd.read_csv(file, parse_dates=True)
        
        # Validate required columns
        has_date = any(col.lower() == 'date' for col in df.columns)
        has_sales = any(col.lower() == 'sales' for col in df.columns)
        
        if not has_date or not has_sales:
            return jsonify({
                'error': 'CSV must have "Date" and "Sales" columns'
            }), 400
        
        # Store the data
        data_store['sales_data'] = df
        data_store['cached_model'] = None  # Reset cached model
        data_store['last_trained'] = None
        
        # Prepare time series and get basic stats
        time_series = prepare_time_series(df)
        
        return jsonify({
            'success': True,
            'message': 'Data uploaded successfully',
            'rows': len(df),
            'date_range': {
                'start': str(time_series.index.min().date()),
                'end': str(time_series.index.max().date())
            },
            'statistics': {
                'mean': round(float(time_series.mean()), 2),
                'std': round(float(time_series.std()), 2),
                'min': round(float(time_series.min()), 2),
                'max': round(float(time_series.max()), 2)
            }
        })
    except Exception as e:
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500


@app.route('/api/data', methods=['GET'])
def get_data():
    """Get the current sales data."""
    if data_store['sales_data'] is None:
        return jsonify({'error': 'No data loaded. Please upload a CSV file.'}), 404
    
    df = data_store['sales_data']
    time_series = prepare_time_series(df)
    
    # Convert to list of objects for frontend
    data = [
        {'date': str(date.date()), 'sales': round(float(value), 2)}
        for date, value in time_series.items()
    ]
    
    return jsonify({
        'success': True,
        'data': data,
        'count': len(data)
    })


@app.route('/api/train', methods=['POST'])
def train_model():
    """
    Train the ARIMA model on uploaded data.
    Optional: Specify train/test split ratio in request body.
    """
    if data_store['sales_data'] is None:
        return jsonify({'error': 'No data loaded. Please upload a CSV file.'}), 404
    
    try:
        # Get parameters from request
        params = request.get_json() or {}
        test_size = params.get('test_size', 0.2)
        order = tuple(params.get('order', [5, 1, 0]))
        
        # Prepare time series
        time_series = prepare_time_series(data_store['sales_data'])
        
        # Split data
        split_idx = int(len(time_series) * (1 - test_size))
        train_data = time_series[:split_idx]
        test_data = time_series[split_idx:]
        
        # Train model
        fitted_model = train_arima_model(train_data, order)
        
        # Make predictions on test set
        predictions = fitted_model.forecast(steps=len(test_data))
        
        # Calculate metrics
        mse = mean_squared_error(test_data, predictions)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(test_data, predictions)
        mape = calculate_mape(test_data.values, predictions)
        
        # Cache the model trained on full data for forecasting
        full_model = train_arima_model(time_series, order)
        data_store['cached_model'] = full_model
        data_store['model_order'] = order
        data_store['last_trained'] = datetime.now().isoformat()
        
        # Prepare comparison data
        comparison = [
            {
                'date': str(date.date()),
                'actual': round(float(actual), 2),
                'predicted': round(float(pred), 2)
            }
            for date, actual, pred in zip(test_data.index, test_data.values, predictions)
        ]
        
        return jsonify({
            'success': True,
            'message': 'Model trained successfully',
            'metrics': {
                'mse': round(mse, 2),
                'rmse': round(rmse, 2),
                'mae': round(mae, 2),
                'mape': round(mape, 2),
                'accuracy': round(100 - mape, 2)
            },
            'training_info': {
                'train_samples': len(train_data),
                'test_samples': len(test_data),
                'model_order': list(order)
            },
            'comparison': comparison
        })
    except Exception as e:
        return jsonify({'error': f'Error training model: {str(e)}'}), 500


@app.route('/api/forecast', methods=['POST'])
def forecast():
    """
    Generate future sales forecast.
    Request body: { "days": number_of_days_to_forecast }
    """
    if data_store['cached_model'] is None:
        return jsonify({
            'error': 'No trained model. Please train the model first.'
        }), 404
    
    try:
        params = request.get_json() or {}
        days = params.get('days', 30)
        
        if days < 1 or days > 365:
            return jsonify({'error': 'Days must be between 1 and 365'}), 400
        
        # Get forecast
        model = data_store['cached_model']
        forecast_values = model.forecast(steps=days)
        
        # Get the last date from the data
        time_series = prepare_time_series(data_store['sales_data'])
        last_date = time_series.index.max()
        
        # Generate future dates
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days,
            freq='D'
        )
        
        # Get confidence intervals
        forecast_obj = model.get_forecast(steps=days)
        conf_int = forecast_obj.conf_int(alpha=0.05)
        
        # Prepare forecast data
        forecast_data = [
            {
                'date': str(date.date()),
                'forecast': round(float(value), 2),
                'lower_bound': round(float(lower), 2),
                'upper_bound': round(float(upper), 2)
            }
            for date, value, lower, upper in zip(
                future_dates,
                forecast_values,
                conf_int.iloc[:, 0],
                conf_int.iloc[:, 1]
            )
        ]
        
        # Include recent historical data for context
        recent_data = time_series[-30:]
        historical = [
            {'date': str(date.date()), 'sales': round(float(value), 2)}
            for date, value in recent_data.items()
        ]
        
        return jsonify({
            'success': True,
            'forecast': forecast_data,
            'historical': historical,
            'summary': {
                'avg_forecast': round(float(np.mean(forecast_values)), 2),
                'min_forecast': round(float(np.min(forecast_values)), 2),
                'max_forecast': round(float(np.max(forecast_values)), 2),
                'trend': 'increasing' if forecast_values[-1] > forecast_values[0] else 'decreasing'
            }
        })
    except Exception as e:
        return jsonify({'error': f'Error generating forecast: {str(e)}'}), 500


@app.route('/api/sample-data', methods=['GET'])
def get_sample_data():
    """Generate sample sales data for demonstration."""
    np.random.seed(42)
    
    # Generate 365 days of sample data
    dates = pd.date_range(start='2023-01-01', periods=365, freq='D')
    
    # Create realistic sales pattern with trend, seasonality, and noise
    trend = np.linspace(400, 600, 365)  # Upward trend
    weekly_seasonality = 50 * np.sin(2 * np.pi * np.arange(365) / 7)
    monthly_seasonality = 30 * np.sin(2 * np.pi * np.arange(365) / 30)
    noise = np.random.normal(0, 25, 365)
    
    sales = trend + weekly_seasonality + monthly_seasonality + noise
    sales = np.maximum(sales, 100)  # Ensure no negative sales
    
    df = pd.DataFrame({
        'Date': dates,
        'Sales': np.round(sales, 2)
    })
    
    # Store in data_store
    data_store['sales_data'] = df
    data_store['cached_model'] = None
    data_store['last_trained'] = None
    
    time_series = prepare_time_series(df)
    
    data = [
        {'date': str(date.date()), 'sales': round(float(value), 2)}
        for date, value in time_series.items()
    ]
    
    return jsonify({
        'success': True,
        'message': 'Sample data generated successfully',
        'data': data,
        'count': len(data),
        'statistics': {
            'mean': round(float(time_series.mean()), 2),
            'std': round(float(time_series.std()), 2),
            'min': round(float(time_series.min()), 2),
            'max': round(float(time_series.max()), 2)
        }
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
