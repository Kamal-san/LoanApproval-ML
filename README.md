# Loan Approval ML Backend

A FastAPI-based backend for loan approval prediction using Machine Learning.

## Features
- JWT Authentication
- Loan approval prediction
- SHAP-based explainability (safe & optimized)
- MongoDB prediction history
- Rate limiting
- Production-safe input validation

## Tech Stack
- FastAPI
- Scikit-learn
- SHAP
- MongoDB
- Python

## Run locally
```bash
pip install -r requirements.txt
uvicorn main:app --reload