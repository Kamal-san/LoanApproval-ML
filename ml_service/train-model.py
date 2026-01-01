import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier

# 1. Load data
df = pd.read_csv("loan_approval_dataset.csv")

# 2. Clean column names
df.columns = (
    df.columns
    .str.replace(r'\s+', ' ', regex=True)
    .str.strip()
)

print("COLUMNS:")
for col in df.columns:
    print(repr(col))

# 3. Drop ID column
df.drop("loan_id", axis=1, inplace=True)

# 4. Rename columns (MATCHES dataset exactly)
df.columns = [
    'dependents',
    'education',
    'self_employed',
    'annual_income',
    'loan_amount',
    'loan_term',
    'credit_score',
    'residential_av',
    'commercial_av',
    'luxury_av',
    'bank_av',
    'loan_status'
]

# 5. Separate target variable
y = df['loan_status']
X = df.drop('loan_status', axis=1)

# 6. Feature engineering
X['income_to_loan_ratio'] = X['annual_income'] / X['loan_amount']
X['bank_assets_ratio'] = X['bank_av'] / (
    X['residential_av'] +
    X['commercial_av'] +
    X['luxury_av']
)

# 7. One-hot encoding
X = pd.get_dummies(X, drop_first=True)

print("X shape:", X.shape)
print("y shape:", y.shape)

# 8. Train model
model = RandomForestClassifier(
    n_estimators=100,
    class_weight='balanced',
    random_state=42
)

model.fit(X, y)

# 9. Save model and feature list
joblib.dump(model, "loan_model.pkl")
joblib.dump(X.columns.tolist(), "model_columns.pkl")

print("Model and columns saved successfully")
