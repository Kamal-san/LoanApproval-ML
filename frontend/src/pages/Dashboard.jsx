import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const fullText = "Decision Making Process for Loan Approvals!!";
  const [typedTitle, setTypedTitle] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedTitle((prev) => prev + fullText[index]);
        setIndex(index + 1);
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [index]);


  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="card glass">
        <h1 className="title">{typedTitle}</h1>

        <h2 className="subtitle">
          Making loan decisions transparent, explainable, and data-driven
        </h2>

        <p className="description">
          This system applies machine-learning models to evaluate loan approval
          probability by analysing applicant financial profiles such as income,
          credit score, employment status, and asset holdings.
        </p>

        <p className="description">
          To ensure responsible AI usage, the platform provides confidence
          levels and interpretable explanations highlighting the most influential
          decision factors behind each prediction.
        </p>
      </div>

      <div className="button-group">
        <button className="primary-btn" onClick={() => navigate("/predict")}>
          Make Prediction
        </button>

        <button className="secondary-btn" onClick={() => navigate("/history")}>
          View Prediction History
        </button>

        <button className="danger-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
