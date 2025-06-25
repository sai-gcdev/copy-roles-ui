import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import genesysLogo from "./assets/genesys-logo.png"; // adjust path if needed

const REGION_MAP = {
  "ap-south-1": "Asia Pacific (Mumbai)",
  "ap-northeast-3": "Asia Pacific (Osaka)",
  "ap-northeast-2": "Asia Pacific (Seoul)",
  "ap-southeast-2": "Asia Pacific (Sydney)",
  "ap-northeast-1": "Asia Pacific (Tokyo)",
  "ca-central-1": "Americas (Canada)",
  "eu-central-1": "Europe (Frankfurt)",
  "eu-west-1": "Europe (Ireland)",
  "eu-west-2": "Europe (London)",
  "eu-central-2": "Europe (Zurich)",
  "me-central-1": "Middle East (UAE)",
  "sa-east-1": "Americas (São Paulo)",
  "us-east-1": "Americas (US East)",
  "us-east-2": "Americas (US East 2)",
  "us-west-2": "Americas (US West)",
};

// --- Searchable Dropdown Component ---
function UserDropdown({ users, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === value);

  return (
    <div className="gc-user-dropdown" ref={ref}>
      <div
        className={`gc-user-dropdown-control${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
        onBlur={() => setOpen(false)}
      >
        {selectedUser ? (
          <span>
            {selectedUser.name}
            <span className="gc-user-dropdown-email">
              {" "}
              ({selectedUser.email})
            </span>
          </span>
        ) : (
          <span className="gc-user-dropdown-placeholder">{placeholder}</span>
        )}
        <span className="gc-user-dropdown-arrow">&#9662;</span>
      </div>
      {open && (
        <div className="gc-user-dropdown-menu">
          <input
            className="gc-user-dropdown-search"
            placeholder="Search user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="gc-user-dropdown-list">
            {filtered.length === 0 && (
              <div className="gc-user-dropdown-item gc-user-dropdown-empty">
                No users found
              </div>
            )}
            {filtered.map((user) => (
              <div
                key={user.id}
                className={`gc-user-dropdown-item${
                  value === user.id ? " selected" : ""
                }`}
                onClick={() => {
                  onChange(user.id);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <span>{user.name}</span>
                <span className="gc-user-dropdown-email">
                  {" "}
                  ({user.email})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [region, setRegion] = useState("us-west-2");
  const [credsConfigured, setCredsConfigured] = useState(false);

  const [users, setUsers] = useState([]);
  const [sourceUserID, setSourceUserID] = useState("");
  const [targetUserID, setTargetUserID] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch users on mount or when creds are configured
  useEffect(() => {
    if (!credsConfigured) return;
    setUsers([]);
    setSourceUserID("");
    setTargetUserID("");
    fetch("https://copy-roles-api.onrender.com/api/user")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => setUsers([]));
  }, [credsConfigured]);

  const normalizeRegion = (region) => region.replace(/-/g, "_");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        "https://copy-roles-api.onrender.com/api/copy-roles",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceUserID,
            targetUserID,
            credentials: {
              clientId,
              clientSecret,
              region: normalizeRegion(region),
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Request failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = () => {
    if (clientId && clientSecret && region) {
      setCredsConfigured(true);
      setModalOpen(false);
    }
  };

  const handleResetCredentials = () => {
    setClientId("");
    setClientSecret("");
    setRegion("us-west-2");
    setCredsConfigured(false);
    setSourceUserID("");
    setTargetUserID("");
    setResult(null);
    setError(null);
    setModalOpen(false);
    setUsers([]);
  };

  return (
    <div className="gc-bg">
      <div className="gc-header">
        <img src={genesysLogo} alt="Genesys Cloud" className="gc-logo" />
      </div>

      <div className="gc-center-outer">
        <div className="gc-login-card">
          <div className="gc-login-left">
            <form className="gc-form" onSubmit={handleSubmit} autoComplete="off">
              <div className="gc-form-group">
                <UserDropdown
                  users={users}
                  value={sourceUserID}
                  onChange={setSourceUserID}
                  placeholder="Select Source User"
                />
              </div>
              <div className="gc-form-group">
                <UserDropdown
                  users={users}
                  value={targetUserID}
                  onChange={setTargetUserID}
                  placeholder="Select Target User"
                />
              </div>
              <div className="gc-form-group gc-region-row">
                <span className="gc-region-label">
                  {REGION_MAP[region]}
                </span>
                <button
                  type="button"
                  className="gc-change-btn"
                  onClick={() => setModalOpen(true)}
                >
                  [change]
                </button>
              </div>
              <button
                type="submit"
                className="gc-login-btn"
                disabled={
                  !credsConfigured ||
                  loading ||
                  !sourceUserID ||
                  !targetUserID
                }
              >
                {loading ? "Copying..." : "Copy Roles"}
              </button>
              {!credsConfigured && (
                <div className="gc-info-msg">
                  Please <b>configure credentials</b> to enable role copying.
                </div>
              )}
              {result && <div className="gc-success">{result.message}</div>}
              {error && <div className="gc-error">{error}</div>}
            </form>
          </div>
          <div className="gc-login-right">
            <div className="gc-help-title">How to use</div>
            <ol className="gc-help-list">
              <li>
                Click <b>[change]</b> and enter your Genesys Cloud credentials.
              </li>
              <li>
                Select <b>Source User</b>.
              </li>
              <li>
                Select <b>Target User</b>.
              </li>
              <li>
                Click <b>Copy Roles</b> to copy roles from source to target user.
              </li>
            </ol>
            <div className="gc-help-footer">
              Credentials are never stored.<br />
              They are cleared on browser refresh or reset.
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="gc-modal-overlay">
          <div className="gc-modal gc-modal-glow">
            <div className="gc-modal-header">
              <span>Configure Genesys Cloud Credentials</span>
              <button
                className="gc-modal-close"
                onClick={() => setModalOpen(false)}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="gc-modal-body">
              <div className="gc-form-group">
                <label>Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="gc-form-group">
                <label>Client Secret</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                />
              </div>
              <div className="gc-form-group">
                <label>Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  {Object.entries(REGION_MAP).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="gc-modal-actions">
                <button className="gc-login-btn" onClick={handleSaveCredentials}>
                  Save
                </button>
                <button className="gc-reset-btn" onClick={handleResetCredentials}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;