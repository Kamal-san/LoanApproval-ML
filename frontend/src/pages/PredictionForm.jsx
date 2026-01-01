import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

import ShapExplanations from "../components/ShapExplanations";

import './PredictionForm.css';

export default function PredictionForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    dependents: "",
    education: "Graduate",
    self_employed: "No",
    annual_income: "",
    loan_amount: "",
    loan_term: "",
    credit_score: "",
    residential_av: "",
    commercial_av: "",
    luxury_av: "",
    bank_av: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validateForm = () => {
    const errors = {};

    if (Number(form.dependents) < 0)
      errors.dependents = "Dependents cannot be negative";

    if (!form.annual_income || Number(form.annual_income) <= 0)
      errors.annual_income = "Annual income must be greater than 0";

    if (!form.loan_amount || Number(form.loan_amount) <= 0)
      errors.loan_amount = "Loan amount must be greater than 0";

    if (!form.loan_term || Number(form.loan_term) < 12 || Number(form.loan_term) > 480)
      errors.loan_term = "Loan term must be between 12–480 months";

    if (!form.credit_score || Number(form.credit_score) < 250 || Number(form.credit_score) > 1000)
      errors.credit_score = "Credit score must be between 250–1000";

    ["residential_av", "commercial_av", "luxury_av", "bank_av"].forEach((f) => {
      if (Number(form[f]) < 0) errors[f] = "Value cannot be negative";
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const payload = {
        ...form,
        dependents: Number(form.dependents),
        annual_income: Number(form.annual_income),
        loan_amount: Number(form.loan_amount),
        loan_term: Number(form.loan_term),
        credit_score: Number(form.credit_score),
        residential_av: Number(form.residential_av || 0),
        commercial_av: Number(form.commercial_av || 0),
        luxury_av: Number(form.luxury_av || 0),
        bank_av: Number(form.bank_av || 0),
      };

      const res = await api.post("/predict", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setResult(res.data);
    } catch (err) {
      setError("Prediction Failed due to session expired - Please login again.");
      console.error(err);
      localStorage.removeItem("token");
      setLoading(true);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const renderError = (name) =>
    fieldErrors[name] && <span className="error">{fieldErrors[name]}</span>;

  return (
    <div className="page-container">
      <div className="header-row">
        <h2>Loan Prediction</h2>
        <button className="secondary-btn" onClick={() => navigate("/dashboard")}>
          ⬅ Dashboard
        </button>
      </div>

      <form className="card form-grid" onSubmit={handleSubmit} noValidate>
        <h3>Applicant Details</h3>

        <input name="dependents" type="number" placeholder="Dependents" onChange={handleChange} />
        {renderError("dependents")}

        <select name="education" value={form.education} onChange={handleChange}>
          <option value="Graduate">Graduate</option>
          <option value="Not Graduate">Not Graduate</option>
        </select>

        <select name="self_employed" value={form.self_employed} onChange={handleChange}>
          <option value="No">Not Self Employed</option>
          <option value="Yes">Self Employed</option>
        </select>

        <h3>Financial Information</h3>

        <input name="annual_income" type="number" placeholder="Annual Income" onChange={handleChange} />
        {renderError("annual_income")}

        <input name="loan_amount" type="number" placeholder="Loan Amount" onChange={handleChange} />
        {renderError("loan_amount")}

        <input name="loan_term" type="number" placeholder="Loan Term (months)" onChange={handleChange} />
        {renderError("loan_term")}

        <input name="credit_score" type="number" placeholder="CIBIL Score" onChange={handleChange} />
        {renderError("credit_score")}

        <h3>Assets (Optional)</h3>

        <input name="residential_av" type="number" placeholder="Residential Asset Value" onChange={handleChange} />
        {renderError("residential_av")}

        <input name="commercial_av" type="number" placeholder="Commercial Asset Value" onChange={handleChange} />
        {renderError("commercial_av")}

        <input name="luxury_av" type="number" placeholder="Luxury Asset Value" onChange={handleChange} />
        {renderError("luxury_av")}

        <input name="bank_av" type="number" placeholder="Bank Balance" onChange={handleChange} />
        {renderError("bank_av")}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Predicting..." : "Predict Loan Approval"}
        </button>
      </form>

      {error && <p className="error center">{error}</p>}

      {result && (
        <div className="card result-card">
          <h3>Prediction Result</h3>
          <p><strong>Approved:</strong> {String(result.loan_approved)}</p>
          <p><strong>Confidence:</strong> {result.confidence}</p>
          <p><strong>Reason:</strong> {result.reason}</p>
          <ShapExplanations factors={result.top_factors} />
          
        </div>
      )}
    </div>
  );
}
