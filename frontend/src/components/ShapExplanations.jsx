import './ShapExplanation.css'
export default function ShapExplanations({ factors }) {
  if (!factors || Object.keys(factors).length === 0) {
    return <p>Consider this Profile For Loan Approval</p>;
  }

  return (
    <div className="shap-card">
      <h3>Why this decision was made</h3>

      {Object.entries(factors).map(([key, value]) => {
        const isPositive = value >= 0;
        const width = Math.min(Math.abs(value) * 100, 100);

        return (
          <div key={key} className="shap-row">
            <span className="shap-label">{key.replace(/_/g, " ")}</span>

            <div className="shap-bar-wrapper">
              <div
                className={`shap-bar ${isPositive ? "positive" : "negative"}`}
                style={{ width: `${width}%` }}
              />
            </div>

            <span className="shap-value">
              {value > 0 ? "+" : ""}
              {value.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
