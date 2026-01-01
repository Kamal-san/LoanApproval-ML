import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function PredictionHistory() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // useCallback prevents useEffect dependency issues
  const fetchPredictions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await api.get("/predictions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPredictions(res.data);
    } catch (err) {
      console.error(err);
      localStorage.removeItem("token");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  //Delete prediction
  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");

    if (!window.confirm("Delete this prediction?")) return;

    try {
      await api.delete(`/predictions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // refresh list after delete
      setPredictions((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete prediction");
    }
  };

  if (loading) return <p>Loading prediction history...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Prediction History</h2>

      <button onClick={() => navigate("/dashboard")}>
        ⬅ Back to Dashboard
      </button>

      <br /><br />

      {predictions.length === 0 ? (
        <p>No predictions found</p>
      ) : (
        predictions.map((p) => (
          <div
            key={p._id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p><b>Approved:</b> {String(p.result.loan_approved)}</p>
            <p><b>Confidence:</b> {p.result.confidence}</p>
            <p><b>Reason:</b> {p.result.reason}</p>
            <p><b>Date:</b> {p.created_at}</p>

            <button
              style={{ color: "red" }}
              onClick={() => handleDelete(p._id)}
            >
              🗑 Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}
