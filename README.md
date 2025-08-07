# E-commerce Sales Forecasting Project

This repository contains a complete machine learning project that forecasts e-commerce sales using a time-series model. This project was built as a portfolio piece to demonstrate skills in data analysis, model building, and evaluation.

## 📈 The Problem

Businesses, especially in e-commerce, need to accurately predict future sales to manage inventory, plan marketing budgets, and ensure healthy cash flow. This project solves that problem by providing a data-driven forecast.

## 🛠️ How It Works

1.  **Data Preparation:** The script loads historical sales data, cleans it, and prepares it for time-series analysis.
2.  **Model Training:** An ARIMA (AutoRegressive Integrated Moving Average) model is trained on 80% of the historical data to learn its underlying trends and seasonal patterns.
3.  **Evaluation:** The model's performance is tested on the remaining 20% of the data.

## 📊 Results

The model performed very well on the test data, achieving the following results:

* **Mean Absolute Percentage Error (MAPE):** 11.01% (Meaning the forecast is approximately **90% accurate**)
* **Mean Absolute Error (MAE):** $54.18 (The forecast is, on average, off by about $54)

### Forecast vs. Actual Sales
![Sales Forecast vs. Actual Data](URL_to_your_plot_image) 
*(Note: To get this image, you can screenshot the plot from your notebook and upload it to the repository, then copy its URL here.)*

## 🚀 Future Forecast

The final model, trained on all available data, was used to forecast sales for the next 30 days.

![Future Forecast](URL_to_your_future_forecast_image)

## 🔧 Technologies Used

* Python
* Pandas (for data manipulation)
* Statsmodels (for the ARIMA model)
* Scikit-learn (for evaluation metrics)
* Matplotlib (for plotting)
