import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

from fastapi import FastAPI, Depends, Request, HTTPException

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm

from pydantic import BaseModel

import joblib
import pandas as pd
import shap
import logging
import numpy as np

from auth import authenticate_user, create_access_token, get_current_user
from database import predictions_collection

from datetime import datetime
import pytz

from bson import ObjectId

from fastapi.middleware.cors import CORSMiddleware


# Rate Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Loan Approval API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://loan-approval-ml-eight.vercel.app",
        "https://loan-approval-7hcq23vxm-kamaleshwarans-projects-3187a12c.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    lambda request, exc: JSONResponse(
        status_code=429,
        content={"detail": "Too many requests!!, try after a miniute."},
    ),
)

# Load model safely
try:
    model = joblib.load("loan_model.pkl")
    model_columns = joblib.load("model_columns.pkl")
except Exception as e:
    raise RuntimeError(f"Model loading failed: {e}")

# Lazy SHAP explainer
explainer = None

def get_explainer():
    global explainer
    if explainer is None:
        explainer = shap.TreeExplainer(model)
    return explainer

# Request schema
class LoanInput(BaseModel):
    dependents: int
    education: str
    self_employed: str
    annual_income: float
    loan_amount: float
    loan_term: float
    credit_score: int
    residential_av: float
    commercial_av: float
    luxury_av: float
    bank_av: float


# Root
@app.get("/")
def root():
    return {"status": "API running"}


# /login
@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user["username"]})
    return {"access_token": token, "token_type": "bearer"}

# /Predict
@app.post("/predict")
@limiter.limit("5/minute")
def predict(
    request: Request,
    data: LoanInput,
    current_user: dict = Depends(get_current_user),
):
    # Prepare data
    df = pd.DataFrame([data.dict()])

    df["income_to_loan_ratio"] = df["annual_income"] / df["loan_amount"].clip(lower=1)
    df["bank_assets_ratio"] = df["bank_av"] / (
        df["residential_av"] + df["commercial_av"] + df["luxury_av"] + 1
    )

    df = pd.get_dummies(df)

    for col in model_columns:
        if col not in df.columns:
            df[col] = 0

    df = df[model_columns]
    
    if df.isnull().values.any():
        raise HTTPException(
            status_code=400,
            detail="Invalid input: contains null values")

    if not np.isfinite(df.values).all():
        raise HTTPException(
            status_code=400,
            detail="Invalid input: contains infinite or NaN values")
        
    # Prediction
    proba = model.predict_proba(df)[0]
    approved_label = next(
    (i for i, c in enumerate(model.classes_) if c.strip() == "Approved"),0)
    
    approved_index = approved_label

    approval_probability = float(proba[approved_index])

    loan_approved = approval_probability >= 0.5
    confidence = (
        "HIGH" if approval_probability >= 0.7
        else "MEDIUM" if approval_probability >= 0.5
        else "LOW"
    )
    # SHAP performance safeguard
    skip_shap = confidence == "HIGH"


    # SHAP 
    top_factors_dict = {}
    if not skip_shap:

        try:
            explainer = get_explainer()
            shap_values = explainer.shap_values(df)

            if isinstance(shap_values, list):
                shap_vals = shap_values[approved_index][0]

            elif isinstance(shap_values, np.ndarray):
                if shap_values.ndim == 3:
                    shap_vals = shap_values[0, :, approved_index]
                else:
                    shap_vals = shap_values[0]

            else:
                shap_vals = None

            if shap_vals is not None:
                shap_series = pd.Series(shap_vals, index=df.columns)
                top_factors = shap_series.abs().nlargest(5)
                top_factors_dict = {k: float(shap_series[k]) for k in top_factors.index}

        except Exception as e:
            logging.warning(f"SHAP skipped: {e}")

    
    # Reason

    reason = "Balanced profile, likely to be approved"
    if "credit_score" in top_factors_dict and top_factors_dict["credit_score"] < 0:
        reason = "Low credit score reduced approval chances"
    elif not loan_approved:
        reason = "Overall risk factors(Income to Loan amount ratio, Asset values) reduced approval chances"

    # Save to MongoDB
    
    ist = pytz.timezone("Asia/Kolkata")
    prediction_doc = {
        "username": current_user["username"],
        "input": data.dict(),
        "result": {
            "loan_approved": loan_approved,
            "approval_probability": round(approval_probability, 2),
            "confidence": confidence,
            "reason": reason,
        },
        "top_factors": top_factors_dict,
        "created_at": datetime.now(ist).strftime("%d:%m:%Y %I:%M:%S %p"),
    }

    try:
        predictions_collection.insert_one(prediction_doc)
    except Exception as e:
        print("MongoDB insert failed:", str(e))

    # Response
    
    return {
        "loan_approved": loan_approved,
        "approval_probability": round(approval_probability, 2),
        "confidence": confidence,
        "reason": reason,
        "top_factors": top_factors_dict,
    }


# History

@app.get("/predictions")
def get_predictions(current_user: dict = Depends(get_current_user)):
    predictions = list(
        predictions_collection.find(
            {"username": current_user["username"]}
        )
    )

    # convert ObjectId to string
    for p in predictions:
        p["_id"] = str(p["_id"])

    return predictions

# deletee predictions predictions/object_id(Mongodb)
@app.delete("/predictions/{prediction_id}")
def delete_prediction(
    prediction_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = predictions_collection.delete_one({
        "_id": ObjectId(prediction_id),
        "username": current_user["username"]
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Prediction not found or not authorized"
        )

    return {"message": "Prediction deleted successfully"}

@app.get("/health")
def health_check():
    checks = {
        "api": "ok",
        "model_loaded": model is not None,
        "columns_loaded": model_columns is not None,
    }
    ist = pytz.timezone("Asia/Kolkata")

    try:
        # MongoDB ping (safe & fast)
        predictions_collection.database.command("ping")
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    status = "ok" if all(v in ["ok", True] for v in checks.values()) else "degraded"

    return {
        "status": status,
        "checks": checks,
        "timestamp": datetime.now(ist).strftime("%d:%m:%Y %I:%M:%S %p"),
    }
