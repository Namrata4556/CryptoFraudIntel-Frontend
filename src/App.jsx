import { useState } from "react";

import {
  ShieldCheck,
  Search,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Building2,
  Network,
  Brain,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import "./App.css";

const API_URL = "https://cryptofraudintel.onrender.com";

function App() {
  const [blockchain, setBlockchain] = useState("ethereum");

  const [wallet, setWallet] = useState(
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  );

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);

  // ============================================================
  // ANALYZE WALLET
  // ============================================================

  const analyzeWallet = async () => {
    const walletAddress = wallet.trim();

    if (!walletAddress) {
  setError(
    `Please enter a ${blockchain === "ethereum" ? "Ethereum" : "Bitcoin"} wallet address.`
  );
  return;
}

if (blockchain === "ethereum" && !isAddress(walletAddress)) {
  setError("Please enter a valid Ethereum wallet address.");
  return;
}

if (
  blockchain === "bitcoin" &&
  !/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{11,87}$/i.test(
    walletAddress
  )
) {
  setError("Please enter a valid Bitcoin wallet address.");
  return;
}

    setLoading(true);
    setError("");
    setResult(null);
    setShowTechnical(false);

    try {
      console.log("========================================");
      console.log("Analyzing wallet:", walletAddress);
      console.log("========================================");

      const response = await fetch(
        `${API_URL}/analyze-wallet?wallet_address=${encodeURIComponent(
          walletAddress
        )}&blockchain=${encodeURIComponent(blockchain)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      console.log("Backend status:", response.status);
      console.log("Backend response:", data);

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Wallet analysis failed."
        );
      }

      setResult(data);
    } catch (err) {
      console.error("Frontend error:", err);

      setError(
        err?.message ||
          "Unable to connect to backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // BASIC RESULT DATA
  // ============================================================

  const walletAddress = result?.wallet_address || wallet;

  // ============================================================
  // TRANSACTIONS
  // ============================================================

  const transactions = Array.isArray(result?.transactions)
    ? result.transactions
    : [];

  const totalTransactions =
    Number(
      result?.transaction_count ??
        result?.transactions_analyzed ??
        transactions.length
    ) || transactions.length;

  // ============================================================
  // TRANSACTION SUMMARY
  // ============================================================

  const backendSummary = result?.transaction_summary || {};

  const receivedCount =
    Number(backendSummary?.received_transactions) ||
    getReceivedCount(transactions, walletAddress);

  const sentCount =
    Number(backendSummary?.sent_transactions) ||
    getSentCount(transactions, walletAddress);

    // ============================================================
  // BLOCKCHAIN TOTALS
  // ============================================================

  const isBitcoin = blockchain === "bitcoin";

  let totalReceived = 0;
  let totalSent = 0;

  if (isBitcoin) {

    totalReceived = Number(
      backendSummary?.total_bitcoin_received
    );

    totalSent = Number(
      backendSummary?.total_bitcoin_sent
    );

    if (
      !Number.isFinite(totalReceived) ||
      totalReceived === 0
    ) {
      totalReceived = calculateBtcReceived(
        transactions,
        walletAddress
      );
    }

    if (
      !Number.isFinite(totalSent) ||
      totalSent === 0
    ) {
      totalSent = calculateBtcSent(
        transactions,
        walletAddress
      );
    }

  } else {

    totalReceived = Number(
      backendSummary?.total_eth_received
    );

    totalSent = Number(
      backendSummary?.total_eth_sent
    );

    if (
      !Number.isFinite(totalReceived) ||
      totalReceived === 0
    ) {
      totalReceived = calculateEthReceived(
        transactions,
        walletAddress
      );
    }

    if (
      !Number.isFinite(totalSent) ||
      totalSent === 0
    ) {
      totalSent = calculateEthSent(
        transactions,
        walletAddress
      );
    }
  }

  const totalBalance =
    totalReceived - totalSent;

  // Prevent unused-variable warning if configured
  void totalBalance;

  // ============================================================

  // ============================================================
  // RANDOM FOREST
  // ============================================================

  const randomForest =
    result?.ml_prediction ||
    result?.random_forest_prediction ||
    null;

  // ============================================================
  // XGBOOST
  // ============================================================

  const xgboost =
    result?.xgboost_prediction ||
    result?.xgb_prediction ||
    null;

  // ============================================================
  // COMBINED RISK
  // ============================================================

  const modelComparison =
    result?.model_comparison ||
    result?.modelComparison ||
    null;

  const combinedRisk = modelComparison || null;

  // ============================================================
  // RANDOM FOREST DISPLAY
  // ============================================================

  const rfPercentage = getModelPercentage(randomForest);

  const rfRisk =
    randomForest?.risk_level ||
    randomForest?.riskLevel ||
    "UNKNOWN";

  const rfLabel =
    randomForest?.label ??
    randomForest?.prediction ??
    "UNKNOWN";

  // ============================================================
  // XGBOOST DISPLAY
  // ============================================================

  const xgbPercentage = getModelPercentage(xgboost);

  const xgbRisk =
    xgboost?.risk_level ||
    xgboost?.riskLevel ||
    "UNKNOWN";

  const xgbLabel =
    xgboost?.label ??
    xgboost?.prediction ??
    "UNKNOWN";

  // ============================================================
  // FINAL FRAUD SCORE
  // ============================================================

  let combinedPercentage = getCombinedPercentage(
    combinedRisk
  );

  const hasBackendCombinedScore =
    combinedRisk &&
    (
      combinedRisk.combined_fraud_percentage !== undefined ||
      combinedRisk.combinedFraudPercentage !== undefined ||
      combinedRisk.combined_fraud_probability !== undefined ||
      combinedRisk.combinedFraudProbability !== undefined
    );

  if (
    !hasBackendCombinedScore &&
    (rfPercentage > 0 || xgbPercentage > 0)
  ) {
    const available = [];

    if (rfPercentage > 0) {
      available.push(rfPercentage);
    }

    if (xgbPercentage > 0) {
      available.push(xgbPercentage);
    }

    if (available.length > 0) {
      combinedPercentage =
        available.reduce(
          (sum, value) => sum + value,
          0
        ) / available.length;
    }
  }

  let combinedRiskLevel =
    combinedRisk?.combined_risk_level ||
    combinedRisk?.combinedRiskLevel ||
    combinedRisk?.risk_level ||
    result?.risk_level ||
    "UNKNOWN";

  if (
    !combinedRiskLevel ||
    combinedRiskLevel === "UNKNOWN"
  ) {
    combinedRiskLevel =
      calculateRiskLevel(combinedPercentage);
  }

  // ============================================================
  // EXCHANGE ANALYSIS
  // ============================================================

  const exchangeAnalysis =
    result?.exchange_analysis ||
    result?.exchangeAnalysis ||
    {};

  const directAnalysis =
    exchangeAnalysis?.direct_analysis ||
    exchangeAnalysis?.directAnalysis ||
    {};

  const directExchanges =
    Array.isArray(directAnalysis?.exchanges)
      ? directAnalysis.exchanges
      : [];

  const exchangeList =
    Array.isArray(exchangeAnalysis?.exchanges)
      ? exchangeAnalysis.exchanges
      : [];

  const identifiedExchanges = normalizeExchanges(
    exchangeList.length > 0
      ? exchangeList
      : directExchanges
  );

  const exchangeInteractions =
    Array.isArray(exchangeAnalysis?.interactions)
      ? exchangeAnalysis.interactions
      : Array.isArray(directAnalysis?.interactions)
      ? directAnalysis.interactions
      : [];

  const exchangesWithCounts =
    addInteractionCounts(
      identifiedExchanges,
      exchangeInteractions
    );

  const exchangeFound =
    Boolean(exchangeAnalysis?.exchange_found) ||
    Boolean(directAnalysis?.exchange_found) ||
    exchangesWithCounts.length > 0;

    const fraudLinkedExchangeEvidence =
    Array.isArray(
      exchangeAnalysis?.fraud_linked_exchange_evidence
    )
      ? exchangeAnalysis.fraud_linked_exchange_evidence
      : [];

  // ============================================================
  // GRAPH
  // ============================================================

  const graphData =
    result?.wallet_graph ||
    result?.walletGraph ||
    result?.graph ||
    null;

  // Use the REAL backend multi-hop graph first
  let graphNodes = getGraphNodes(
    graphData,
    result,
    walletAddress,
    transactions
  );

  let graphEdges = getGraphEdges(
    graphData,
    result,
    walletAddress,
    transactions
  );

  // ------------------------------------------------------------
  // IMPORTANT:
  // Do NOT replace the backend graph when it has multiple nodes.
  // Fallback is only for old responses with no graph.
  // ------------------------------------------------------------

  if (
    graphNodes.length === 0 &&
    graphEdges.length === 0 &&
    transactions.length > 0
  ) {
    graphNodes = buildTransactionNodes(
      transactions,
      walletAddress
    );

    graphEdges = buildTransactionEdges(
      transactions,
      walletAddress
    );
  }

  // ============================================================
  // CLEAN / FOCUSED TRANSACTION TRACE
  // ============================================================
  // Backend full graph remains untouched.
  // Frontend shows the most relevant wallets by hop distance.

  const maxHops =
    graphData?.max_hops ??
    graphData?.maxHops ??
    result?.max_hops ??
    result?.maxHops ??
    3;

  const MAX_VISIBLE_NODES = 15;
  const MAX_VISIBLE_EDGES = 20;

  const mainWalletLower = String(
    walletAddress || ""
  ).toLowerCase().trim();

  const normalizedEdges = graphEdges.map((edge) => ({
    source: String(edge.source || "").trim(),
    target: String(edge.target || "").trim(),
  }));

  // ------------------------------------------------------------
  // Find hop distance from the main wallet
  // ------------------------------------------------------------

  const distanceMap = new Map();

  distanceMap.set(
    mainWalletLower,
    0
  );

  let currentLevel = [
    mainWalletLower
  ];

  for (
    let hop = 1;
    hop <= maxHops;
    hop++
  ) {
    const nextLevel = [];

    currentLevel.forEach(
      (currentNode) => {

        normalizedEdges.forEach(
          (edge) => {

            const source =
              edge.source.toLowerCase();

            const target =
              edge.target.toLowerCase();

            let nextNode = null;

            if (source === currentNode) {
              nextNode = edge.target;
            }

            if (target === currentNode) {
              nextNode = edge.source;
            }

            if (!nextNode) {
              return;
            }

            const key =
              nextNode.toLowerCase();

            if (!distanceMap.has(key)) {

              distanceMap.set(
                key,
                hop
              );

              nextLevel.push(
                nextNode
              );

            }

          }
        );

      }
    );

    currentLevel = nextLevel;

    if (
      distanceMap.size >=
      MAX_VISIBLE_NODES
    ) {
      break;
    }
  }

  // ------------------------------------------------------------
  // Select wallets closest to the main wallet
  // ------------------------------------------------------------

  const visibleGraphNodes =
    graphNodes
      .filter((node) =>
        distanceMap.has(
          String(node).toLowerCase()
        )
      )
      .sort((a, b) => {

        const distanceA =
          distanceMap.get(
            String(a).toLowerCase()
          ) ?? 999;

        const distanceB =
          distanceMap.get(
            String(b).toLowerCase()
          ) ?? 999;

        return distanceA - distanceB;

      })
      .slice(
        0,
        MAX_VISIBLE_NODES
      );

  // ------------------------------------------------------------
  // Keep only connections between visible wallets
  // ------------------------------------------------------------

  const visibleNodeIds =
    new Set(
      visibleGraphNodes.map(
        (node) =>
          String(node).toLowerCase()
      )
    );

  const visibleGraphEdges =
    normalizedEdges
      .filter((edge) => {

        const source =
          edge.source.toLowerCase();

        const target =
          edge.target.toLowerCase();

        return (
          visibleNodeIds.has(source) &&
          visibleNodeIds.has(target)
        );

      })
      .slice(
        0,
        MAX_VISIBLE_EDGES
      );

  // ------------------------------------------------------------
  // Position wallets according to hop level
  // ------------------------------------------------------------

  const nodePositions =
    visibleGraphNodes.map(
      (node) => {

        const hop =
          distanceMap.get(
            String(node).toLowerCase()
          ) ?? 0;

        const nodesAtSameHop =
          visibleGraphNodes.filter(
            (item) =>
              (
                distanceMap.get(
                  String(item).toLowerCase()
                ) ?? 0
              ) === hop
          );

        const index =
          nodesAtSameHop.findIndex(
            (item) =>
              String(item).toLowerCase() ===
              String(node).toLowerCase()
          );

        return {
          node,
          ...getLayeredNodePosition(
            hop,
            index,
            nodesAtSameHop.length
          ),
        };

      }
    );

  // ============================================================
  // FEATURE COUNT
  // ============================================================

  const featureCount = getFeatureCount(result);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="header">

        <div className="brand">

          <div className="logo">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h1>
              Crypto Fraud Intelligence
            </h1>

            <p>
              Blockchain Wallet Risk Analysis
            </p>
          </div>

        </div>

        <div className="status">
          <span className="status-dot"></span>
          Backend Connected
        </div>

      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="container">

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="hero">

          <p className="eyebrow">
            BLOCKCHAIN FRAUD INTELLIGENCE
          </p>

          <h2>
            Identify suspicious
            <br />
            crypto wallets.
          </h2>

          <p className="hero-text">
            Analyze wallet activity,
            detect fraud patterns, trace
            transactions and identify potential
            exchange connections.
          </p>

        </section>

        {/* ====================================================
            SEARCH
        ==================================================== */}

        <section className="search-card">

          <div className="search-row">

  <select
    value={blockchain}
    onChange={(e) => {
      const selectedBlockchain = e.target.value;

      setBlockchain(selectedBlockchain);
      setResult(null);
      setError("");

      if (selectedBlockchain === "ethereum") {
        setWallet(
          "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        );
      } else {
        setWallet(
          "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        );
      }
    }}
  >
    <option value="ethereum">
      Ethereum
    </option>

    <option value="bitcoin">
      Bitcoin
    </option>
  </select>

  <input
    type="text"
    value={wallet}
    onChange={(e) =>
      setWallet(e.target.value)
    }
    placeholder={
      blockchain === "ethereum"
        ? "0x..."
        : "Bitcoin wallet address"
    }
  />

            <button
              onClick={analyzeWallet}
              disabled={loading}
            >

              {loading ? (
                <>
                  <Loader2
                    className="spin"
                    size={19}
                  />

                  Analyzing...
                </>
              ) : (
                <>
                  <Search size={19} />

                  Analyze Wallet
                </>
              )}

            </button>

          </div>

          {error && (
            <div className="error">

              <AlertTriangle size={18} />

              <span>{error}</span>

            </div>
          )}

        </section>

        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading && (

          <div className="loading-box">

            <Loader2
              className="spin"
              size={28}
            />

            <div>

              <strong>
                Analyzing wallet...
              </strong>

              <p>
                Fetching blockchain transactions,
                tracing wallet activity and running
                fraud detection.
              </p>

            </div>

          </div>

        )}

        {/* ====================================================
            RESULTS
        ==================================================== */}

        {result && (

          <div className="results">

            {/* ==================================================
                RISK ASSESSMENT
            ================================================== */}

            <section className="risk-section">

              <div className="risk-header">

                <div>

                  <p className="eyebrow">
                    ANALYSIS RESULT
                  </p>

                  <h2>
                    Wallet Risk Assessment
                  </h2>

                </div>

                <div
                  className={`risk-badge ${String(
                    combinedRiskLevel
                  ).toLowerCase()}`}
                >
                  {combinedRiskLevel}
                </div>

              </div>

              <div className="risk-score">

                <div className="score-left">

                  <span>
                    Combined ML Risk Score
                  </span>

                  <strong>
                    {combinedPercentage.toFixed(2)}
                    %
                  </strong>

                  <p>
                    Final risk assessment based
                    on machine-learning analysis.
                  </p>

                </div>

                <div className="score-right">

                  <div className="progress">

                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            combinedPercentage
                          )
                        )}%`,
                      }}
                    ></div>

                  </div>

                  <div className="score-labels">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>

                </div>

              </div>

            </section>

            {/* ==================================================
                KEY METRICS
            ================================================== */}

            <section className="metrics">

              <div className="metric-card">

                <div className="metric-icon">
                  <Activity size={21} />
                </div>

                <div>

                  <span>
                    Transactions
                  </span>

                  <strong>
                    {totalTransactions}
                  </strong>

                </div>

              </div>

                            <div className="metric-card">

                <div className="metric-icon received-icon">
                  <ArrowDownLeft size={21} />
                </div>

                <div>

                  <span>
                    {blockchain === "bitcoin"
                      ? "BTC Received"
                      : "ETH Received"}
                  </span>

                  <strong>
                    {formatNumber(
                      totalReceived
                    )}{" "}
                    {blockchain === "bitcoin"
                      ? "BTC"
                      : "ETH"}
                  </strong>

                </div>

              </div>

              <div className="metric-card">

                <div className="metric-icon sent-icon">
                  <ArrowUpRight size={21} />
                </div>

                <div>

                  <span>
                    {blockchain === "bitcoin"
                      ? "BTC Sent"
                      : "ETH Sent"}
                  </span>

                  <strong>
                    {formatNumber(
                      totalSent
                    )}{" "}
                    {blockchain === "bitcoin"
                      ? "BTC"
                      : "ETH"}
                  </strong>

                </div>

              </div>

            </section>

            {/* ==================================================
                WALLET INFORMATION
            ================================================== */}

            <section className="panel">

              <div className="panel-title">

                <div>

                  <h3>
                    Wallet Information
                  </h3>

                  <span>
                    Analyzed blockchain account
                  </span>

                </div>

                <span className="network-badge">
                  {blockchain === "bitcoin"
                    ? "Bitcoin Network"
                    : "Ethereum Mainnet"}
                </span>

              </div>

              <div className="wallet-address">
                {walletAddress}
              </div>

            </section>

            {/* ==================================================
                EXCHANGE IDENTIFICATION
            ================================================== */}

            <section className="panel">

              <div className="panel-title">

                <div>

                  <h3>

                    <Building2
                      size={20}
                      className="title-icon"
                    />

                    Exchange Identification

                  </h3>

                  <span>
                    Detect known cryptocurrency
                    exchange interactions
                  </span>

                </div>

                <span
                  className={`exchange-status ${
                    exchangeFound
                      ? "found"
                      : "not-found"
                  }`}
                >
                  {exchangeFound
                    ? "EXCHANGE FOUND"
                    : "NO EXCHANGE FOUND"}
                </span>

              </div>

              {exchangesWithCounts.length > 0 ? (

                <div className="exchange-results">

                  {exchangesWithCounts.map(
                    (
                      exchange,
                      index
                    ) => (

                      <div
                        className="exchange-card"
                        key={`exchange-${index}`}
                      >

                        <div className="exchange-icon">

                          <Building2
                            size={22}
                          />

                        </div>

                        <div className="exchange-main">

                          <strong>
                            {exchange.exchange ||
                              "Unknown Exchange"}
                          </strong>

                          <span>
                            {exchange.interactions ||
                              0}{" "}
                            interaction(s)
                          </span>

                        </div>

                        <div className="confidence">

                          {exchange.confidence ||
                            "MATCH"}

                        </div>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="empty">

                  <Building2 size={21} />

                  <span>
                    No known exchange interaction
                    detected for this wallet.
                  </span>

                </div>

              )}

                            {fraudLinkedExchangeEvidence.length > 0 && (

                <div className="fraud-exchange-evidence">

                  <div className="evidence-title">
                    Exchange Connection Evidence
                  </div>

                  {fraudLinkedExchangeEvidence.map(
                    (evidence, index) => (

                      <div
                        className="evidence-card"
                        key={`evidence-${index}`}
                      >

                        <div>
                          <strong>
                            {evidence.exchange ||
                              "No known exchange"}
                          </strong>

                          <span>
                            {evidence.exchange_connection
                              ? "Known exchange connection detected"
                              : "No known exchange connection detected"}
                          </span>
                        </div>

                        <div className="evidence-details">

                          <span>
                            Transactions analyzed:{" "}
                            {evidence.transaction_count || 0}
                          </span>

                          <span>
                            Trace:{" "}
                            {evidence.trace_hops || 0} hops
                          </span>

                          <span>
                            Direct matches:{" "}
                            {evidence.direct_match_count || 0}
                          </span>

                          <span>
                            Graph matches:{" "}
                            {evidence.graph_match_count || 0}
                          </span>

                          <p>
                            {evidence.message}
                          </p>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>

            {/* ==================================================
                WALLET TRANSACTION GRAPH
            ================================================== */}

            <section className="panel">

              <div className="panel-title">

                <div>

                  <h3>

                    <Network
                      size={20}
                      className="title-icon"
                    />

                    Wallet Transaction Graph

                  </h3>

                  <span>
                    Multi-hop blockchain tracing
                  </span>

                </div>

                <span>
                  {visibleGraphNodes.length} nodes ·{" "}
                  {visibleGraphEdges.length} connections
                </span>

              </div>

              {graphNodes.length > 0 ? (

                <div className="graph-container">

                  <div className="graph-visual">

                    {/* CONNECTION LINES */}

                    <svg
                      className="graph-lines"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >

                      <defs>

                        <marker
                          id="graph-arrow"
                          markerWidth="5"
                          markerHeight="5"
                          refX="4"
                          refY="2.5"
                          orient="auto"
                        >

                          <path
                            d="M0,0 L5,2.5 L0,5 Z"
                            fill="currentColor"
                          />

                        </marker>

                      </defs>

                      {visibleGraphEdges.map(
                        (
                          edge,
                          index
                        ) => {

                          const source =
                            nodePositions.find(
                              ({
                                node,
                              }) =>
                                String(
                                  node
                                ).toLowerCase() ===
                                String(
                                  edge.source
                                ).toLowerCase()
                            );

                          const target =
                            nodePositions.find(
                              ({
                                node,
                              }) =>
                                String(
                                  node
                                ).toLowerCase() ===
                                String(
                                  edge.target
                                ).toLowerCase()
                            );

                          if (
                            !source ||
                            !target
                          ) {
                            return null;
                          }

                          return (
                            <line
                              key={`graph-edge-${index}`}
                              x1={source.x}
                              y1={source.y}
                              x2={target.x}
                              y2={target.y}
                              markerEnd="url(#graph-arrow)"
                            />
                          );

                        }
                      )}

                    </svg>

                    {/* GRAPH NODES */}

                    {nodePositions.map(
                      ({
                        node,
                        x,
                        y,
                      }, index) => {

                        const isMain =
                          String(
                            node
                          ).toLowerCase() ===
                          String(
                            walletAddress
                          ).toLowerCase();

                        return (
                          <div
                            key={`${node}-${index}`}
                            className={`graph-node ${
                              isMain
                                ? "main-node"
                                : ""
                            }`}
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                            }}
                            title={node}
                          >

                            <div className="node-circle">

                              {isMain ? (

                                <ShieldCheck
                                  size={18}
                                />

                              ) : (

                                <Network
                                  size={16}
                                />

                              )}

                            </div>

                            <span>

                              {isMain
                                ? "Main Wallet"
                                : shortAddress(
                                    node
                                  )}

                            </span>

                          </div>
                        );

                      }
                    )}

                  </div>

                  {/* GRAPH STATS */}

                  <div className="graph-stats">

                    <div>

                      <strong>
                        {graphNodes.length}
                      </strong>

                      <span>
                        Nodes
                      </span>

                    </div>

                    <div>

                      <strong>
                        {visibleGraphEdges.length}
                      </strong>

                      <span>
                        Connections
                      </span>

                    </div>

                    <div>

                      <strong>
                        {maxHops}
                      </strong>

                      <span>
                        Max Hops
                      </span>

                    </div>

                  </div>

                </div>

              ) : (

                <div className="graph-empty">

                  <Network size={30} />

                  <strong>
                    No graph data available
                  </strong>

                  <span>
                    Transaction tracing data was
                    not returned by the backend.
                  </span>

                </div>

              )}

            </section>

            {/* ==================================================
                TRANSACTION SUMMARY
            ================================================== */}

            <section className="panel">

              <div className="panel-title">

                <div>

                  <h3>
                    Transaction Summary
                  </h3>

                  <span>
                    Wallet activity overview
                  </span>

                </div>

                <span>
                  {totalTransactions} records
                </span>

              </div>

              <div className="transaction-summary">

                <div className="transaction-item">

                  <div className="transaction-icon received">

                    <ArrowDownLeft
                      size={21}
                    />

                  </div>

                  <span>
                    Received
                  </span>

                  <strong>
                    {receivedCount}
                  </strong>

                </div>

                <div className="transaction-item">

                  <div className="transaction-icon sent">

                    <ArrowUpRight
                      size={21}
                    />

                  </div>

                  <span>
                    Sent
                  </span>

                  <strong>
                    {sentCount}
                  </strong>

                </div>

                <div className="transaction-item">

                  <div className="transaction-icon">

                    <Activity
                      size={21}
                    />

                  </div>

                  <span>
                    Total
                  </span>

                  <strong>
                    {totalTransactions}
                  </strong>

                </div>

              </div>

            </section>

            {/* ==================================================
                RECENT TRANSACTIONS
            ================================================== */}

            <section className="panel">

              <div className="panel-title">

                <div>

                  <h3>
                    Recent Transactions
                  </h3>

                  <span>
                    Latest blockchain activity
                  </span>

                </div>

                <span>
                  Showing{" "}
                  {Math.min(
                    10,
                    transactions.length
                  )}
                </span>

              </div>

              {transactions.length === 0 ? (

                <div className="empty">
                  No transactions returned.
                </div>

              ) : (

                <div className="table-wrapper">

                  <table>

                    <thead>

                      <tr>

                        <th>
                          Transaction
                        </th>

                        <th>
                          From
                        </th>

                        <th>
                          To
                        </th>

                        <th>
                          Value
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {transactions
                        .slice(-10)
                        .reverse()
                        .map((tx, index) => (
                          <tr
                            key={
                              tx?.hash ||
                              tx?.transaction_hash ||
                              index
                            }
                          >

                            <td>
                              {shortAddress(
                                tx?.hash ||
                                  tx?.transaction_hash
                              )}
                            </td>

                            <td>
                              {shortAddress(
                                tx?.from ||
                                  tx?.from_address
                              )}
                            </td>

                            <td>
                              {shortAddress(
                                tx?.to ||
                                  tx?.to_address
                              )}
                            </td>

                            <td>
                              {formatTransactionValue(
                                tx,
                                blockchain
                              )}
                            </td>

                          </tr>
                        ))}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

            {/* ==================================================
                TECHNICAL ML DETAILS
            ================================================== */}

            <section className="panel technical-panel">

              <button
                className="technical-toggle"
                onClick={() =>
                  setShowTechnical(
                    !showTechnical
                  )
                }
                aria-expanded={showTechnical}
              >

                <div className="technical-title">

                  <div className="technical-icon">

                    <Brain
                      size={20}
                    />

                  </div>

                  <div>

                    <strong>
                      Technical ML Details
                    </strong>

                    <span>
                      Model information for technical evaluation
                    </span>

                  </div>

                </div>

                {showTechnical ? (

                  <ChevronUp size={21} />

                ) : (

                  <ChevronDown size={21} />

                )}

              </button>


              {showTechnical && (

                <div className="technical-content">

                  <div className="technical-intro">

                    <strong>
                      Fraud Detection Pipeline
                    </strong>

                    <p>
                      Machine-learning models analyze
                      blockchain wallet activity and
                      generate the final fraud risk.
                    </p>

                  </div>


                  <div className="technical-grid">

                    {/* MODELS */}

                    <div className="technical-card">

                      <div className="technical-card-top">

                        <Brain size={18} />

                        <strong>
                          Models
                        </strong>

                      </div>

                      <div className="technical-value">

                        Random Forest
                        <br />
                        +
                        <br />
                        XGBoost

                      </div>

                      <span>
                        Machine-learning models
                      </span>

                    </div>


                    {/* FEATURES */}

                    <div className="technical-card">

                      <div className="technical-card-top">

                        <Activity size={18} />

                        <strong>
                          Features Analyzed
                        </strong>

                      </div>

                      <div className="technical-value">

                        {featureCount}

                      </div>

                      <span>
                        Engineered blockchain activity
                        features
                      </span>

                    </div>


                    {/* FINAL OUTPUT */}

                    <div className="technical-card combined">

                      <div className="technical-card-top">

                        <CheckCircle
                          size={18}
                        />

                        <strong>
                          Final Output
                        </strong>

                      </div>

                      <div className="technical-value">

                        {combinedPercentage.toFixed(2)}%

                      </div>

                      <span>
                        Combined fraud probability
                      </span>


                      <div className="technical-row">

                        <span>
                          Risk Level
                        </span>

                        <strong>
                          {combinedRiskLevel}
                        </strong>

                      </div>

                    </div>

                  </div>

                </div>

              )}

            </section>

          </div>

        )}

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <footer>
          Crypto Fraud Intelligence System
        </footer>

      </main>

    </div>
  );
}

// ============================================================
// ETHEREUM ADDRESS VALIDATION
// ============================================================

function isAddress(value) {
  if (!value) {
    return false;
  }

  return /^0x[a-fA-F0-9]{40}$/.test(
    String(value).trim()
  );
}

// ============================================================
// SHORT ADDRESS
// ============================================================

function shortAddress(value) {
  if (!value) {
    return "-";
  }

  const text = String(value);

  if (text.length <= 18) {
    return text;
  }

  return `${text.slice(
    0,
    10
  )}...${text.slice(-8)}`;
}

// ============================================================
// FORMAT NUMBER
// ============================================================

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 4,
    }
  );
}

// ============================================================
// GET TRANSACTION ETH VALUE
// ============================================================

function getTransactionEth(tx) {
  if (!tx) {
    return 0;
  }

  // Prefer backend-calculated ETH value
  if (
    tx.value_eth !== null &&
    tx.value_eth !== undefined &&
    tx.value_eth !== ""
  ) {
    const valueEth = Number(tx.value_eth);

    if (Number.isFinite(valueEth)) {
      return valueEth;
    }
  }

  // Etherscan/backend value is normally Wei.
  // Use BigInt first so large Wei values do not lose precision.
  if (
    tx.value !== null &&
    tx.value !== undefined &&
    tx.value !== ""
  ) {
    const rawValue = String(tx.value).trim();

    try {
      if (/^\d+$/.test(rawValue)) {
        const wei = BigInt(rawValue);

        const wholeEth =
          wei / 1000000000000000000n;

        const remainder =
          wei % 1000000000000000000n;

        const decimalPart =
          remainder
            .toString()
            .padStart(18, "0")
            .replace(/0+$/, "");

        return Number(
          decimalPart
            ? `${wholeEth}.${decimalPart}`
            : `${wholeEth}`
        );
      }

      const valueNumber = Number(rawValue);

      if (Number.isFinite(valueNumber)) {
        return valueNumber / 1e18;
      }
    } catch (error) {
      console.warn(
        "Unable to parse transaction value:",
        tx.value
      );
    }
  }

  return 0;
}

// ============================================================
// FORMAT TRANSACTION VALUE
// ============================================================


function formatTransactionValue(tx, blockchain) {
  const isBitcoin = blockchain === "bitcoin";
  const symbol = isBitcoin ? "BTC" : "ETH";

  let value = 0;

  if (isBitcoin) {
    value = Number(tx.value_btc);

    if (!Number.isFinite(value)) {
      value = Number(tx.value);
    }
  } else {
    value = getTransactionEth(tx);
  }

  if (!Number.isFinite(value)) {
    return `0 ${symbol}`;
  }

  if (value === 0) {
    return `0 ${symbol}`;
  }

  if (value < 0.000001) {
    return `${value.toFixed(12)} ${symbol}`;
  }

  if (value < 0.0001) {
    return `${value.toFixed(10)} ${symbol}`;
  }

  return `${value.toFixed(4)} ${symbol}`;
}



// ============================================================
// RECEIVED COUNT
// ============================================================

function getReceivedCount(
  transactions,
  wallet
) {
  if (!Array.isArray(transactions)) {
    return 0;
  }

  const target =
    String(wallet || "").toLowerCase();

  return transactions.filter((tx) => {
    const to =
      tx?.to ||
      tx?.to_address ||
      tx?.toAddress ||
      "";

    return (
      String(to).toLowerCase() === target
    );
  }).length;
}

// ============================================================
// SENT COUNT
// ============================================================

function getSentCount(
  transactions,
  wallet
) {
  if (!Array.isArray(transactions)) {
    return 0;
  }

  const source =
    String(wallet || "").toLowerCase();

  return transactions.filter((tx) => {
    const from =
      tx?.from ||
      tx?.from_address ||
      tx?.fromAddress ||
      "";

    return (
      String(from).toLowerCase() === source
    );
  }).length;
}

// ============================================================
// CALCULATE ETH RECEIVED
// ============================================================

function calculateEthReceived(
  transactions,
  wallet
) {
  const target =
    String(wallet || "").toLowerCase();

  return transactions.reduce(
    (total, tx) => {
      const to =
        tx?.to ||
        tx?.to_address ||
        tx?.toAddress ||
        "";

      if (
        String(to).toLowerCase() !== target
      ) {
        return total;
      }

      return (
        total +
        getTransactionEth(tx)
      );
    },
    0
  );
}

// ============================================================
// CALCULATE ETH SENT
// ============================================================

function calculateEthSent(
  transactions,
  wallet
) {
  const source =
    String(wallet || "").toLowerCase();

  return transactions.reduce(
    (total, tx) => {
      const from =
        tx?.from ||
        tx?.from_address ||
        tx?.fromAddress ||
        "";

      if (
        String(from).toLowerCase() !== source
      ) {
        return total;
      }

      return (
        total +
        getTransactionEth(tx)
      );
    },
    0
  );
}

// ============================================================
// MODEL PERCENTAGE
// ============================================================

function getModelPercentage(
  prediction
) {
  if (!prediction) {
    return 0;
  }

  const percentageFields = [
    "fraud_percentage",
    "fraudPercentage",
    "percentage",
  ];

  for (const field of percentageFields) {
    const value =
      Number(prediction[field]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  const probabilityFields = [
    "fraud_probability",
    "fraudProbability",
    "probability",
  ];

  for (const field of probabilityFields) {
    const value =
      Number(prediction[field]);

    if (Number.isFinite(value)) {
      return value <= 1
        ? value * 100
        : value;
    }
  }

  return 0;
}

// ============================================================
// COMBINED PERCENTAGE
// ============================================================

function getCombinedPercentage(
  combined
) {
  if (!combined) {
    return 0;
  }

  const percentageFields = [
    "combined_fraud_percentage",
    "combinedFraudPercentage",
    "fraud_percentage",
    "fraudPercentage",
    "percentage",
  ];

  for (const field of percentageFields) {
    const value =
      Number(combined[field]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  const probabilityFields = [
    "combined_fraud_probability",
    "combinedFraudProbability",
    "fraud_probability",
    "fraudProbability",
    "probability",
  ];

  for (const field of probabilityFields) {
    const value =
      Number(combined[field]);

    if (Number.isFinite(value)) {
      return value <= 1
        ? value * 100
        : value;
    }
  }

  return 0;
}

// ============================================================
// CALCULATE RISK LEVEL
// ============================================================

function calculateRiskLevel(
  percentage
) {
  if (percentage >= 80) {
    return "CRITICAL";
  }

  if (percentage >= 60) {
    return "HIGH";
  }

  if (percentage >= 30) {
    return "MEDIUM";
  }

  return "LOW";
}

// ============================================================
// NORMALIZE EXCHANGES
// ============================================================

function normalizeExchanges(
  exchanges
) {
  if (!Array.isArray(exchanges)) {
    return [];
  }

  return exchanges
    .map((exchange) => {

      if (typeof exchange === "string") {
        return {
          exchange,
          interactions: 0,
          confidence: "MATCH",
        };
      }

      if (
        !exchange ||
        typeof exchange !== "object"
      ) {
        return null;
      }

      return {
        ...exchange,

        exchange:
          exchange.exchange ||
          exchange.exchange_name ||
          exchange.exchangeName ||
          exchange.name ||
          exchange.label ||
          "Unknown Exchange",

        interactions:
          Number(
            exchange.interactions ??
              exchange.interaction_count ??
              exchange.interactionCount ??
              exchange.transaction_count ??
              exchange.transactionCount ??
              0
          ),

        confidence:
          exchange.confidence ||
          exchange.confidence_level ||
          exchange.confidenceLevel ||
          "MATCH",
      };
    })
    .filter(Boolean);
}

// ============================================================
// ADD INTERACTION COUNTS
// ============================================================

function addInteractionCounts(
  exchanges,
  interactions
) {
  if (!Array.isArray(exchanges)) {
    return [];
  }

  if (!Array.isArray(interactions)) {
    return exchanges;
  }

  return exchanges.map(
    (exchange) => {
      const name =
        String(
          exchange.exchange || ""
        ).toLowerCase();

      const matching =
        interactions.filter(
          (interaction) => {
            const interactionName =
              String(
                interaction?.exchange ||
                  interaction?.exchange_name ||
                  interaction?.exchangeName ||
                  interaction?.name ||
                  ""
              ).toLowerCase();

            return (
              interactionName === name
            );
          }
        );

      return {
        ...exchange,

        interactions:
          exchange.interactions > 0
            ? exchange.interactions
            : matching.length,
      };
    }
  );
}

// ============================================================
// GRAPH NODES
// ============================================================

function getGraphNodes(
  graphData,
  result,
  walletAddress,
  transactions
) {
  const nodes = [];

  const addNode = (value) => {
    if (!value) {
      return;
    }

    let address = value;

    if (typeof value === "object") {
      address =
        value.address ||
        value.id ||
        value.wallet_address ||
        value.walletAddress ||
        value.node_address ||
        value.nodeAddress;
    }

    if (
        address &&
        isValidBlockchainAddress(
          String(address).trim()
        )
      ) {
      nodes.push(
        String(address).trim()
      );
    }
  };

  // Main wallet
  addNode(walletAddress);

  // REAL backend graph
  if (Array.isArray(graphData?.nodes)) {
    graphData.nodes.forEach(addNode);
  }

  if (Array.isArray(result?.graph_nodes)) {
    result.graph_nodes.forEach(addNode);
  }

  if (Array.isArray(result?.graphNodes)) {
    result.graphNodes.forEach(addNode);
  }

  // If backend graph has no nodes,
  // derive from transactions
  if (
    nodes.length === 1 &&
    Array.isArray(transactions)
  ) {
    transactions.forEach((tx) => {
      addNode(
        tx?.from ||
          tx?.from_address ||
          tx?.fromAddress
      );

      addNode(
        tx?.to ||
          tx?.to_address ||
          tx?.toAddress
      );
    });
  }

  // Remove duplicates
  const uniqueGraphNodes =
    new Map();

  nodes.forEach((node) => {
    const key =
      node.toLowerCase();

    if (!uniqueGraphNodes.has(key)) {
      uniqueGraphNodes.set(
        key,
        node
      );
    }
  });

  return Array.from(
    uniqueGraphNodes.values()
  );
}

// ============================================================
// GET GRAPH EDGES
// ============================================================

function getGraphEdges(
  graphData,
  result,
  walletAddress,
  transactions
) {
  const edges = [];

  const addEdge = (value) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const source =
      value.source ||
      value.from ||
      value.from_address ||
      value.fromAddress;

    const target =
      value.target ||
      value.to ||
      value.to_address ||
      value.toAddress;

    if (
        source &&
        target &&
        isValidBlockchainAddress(
          String(source).trim()
        ) &&
        isValidBlockchainAddress(
          String(target).trim()
        )
      ) {
      edges.push({
        source: String(source).trim(),
        target: String(target).trim(),
      });
    }
  };

  // REAL backend graph edges
  if (Array.isArray(graphData?.edges)) {
    graphData.edges.forEach(addEdge);
  }

  if (Array.isArray(result?.graph_edges)) {
    result.graph_edges.forEach(addEdge);
  }

  if (Array.isArray(result?.graphEdges)) {
    result.graphEdges.forEach(addEdge);
  }

  // If backend did not provide edges,
  // build them from transactions.
  if (
    edges.length === 0 &&
    Array.isArray(transactions)
  ) {
    return buildTransactionEdges(
      transactions,
      walletAddress
    );
  }

  // Remove duplicate edges
  const uniqueEdges = new Map();

  edges.forEach((edge) => {
    const key =
      `${edge.source.toLowerCase()}->${edge.target.toLowerCase()}`;

    if (!uniqueEdges.has(key)) {
      uniqueEdges.set(
        key,
        edge
      );
    }
  });

  return Array.from(
    uniqueEdges.values()
  );
}

// ============================================================
// BUILD TRANSACTION NODES
// ============================================================

function buildTransactionNodes(
  transactions,
  walletAddress
) {
  const nodes = [];

  if (walletAddress) {
    nodes.push(
      String(walletAddress).trim()
    );
  }

  if (!Array.isArray(transactions)) {
    return nodes;
  }

  transactions.forEach((tx) => {
    const from =
      tx?.from ||
      tx?.from_address ||
      tx?.fromAddress ||
      "";

    const to =
      tx?.to ||
      tx?.to_address ||
      tx?.toAddress ||
      "";

    if (isAddress(String(from).trim())) {
      nodes.push(
        String(from).trim()
      );
    }

    if (isAddress(String(to).trim())) {
      nodes.push(
        String(to).trim()
      );
    }
  });

  const uniqueNodes = new Map();

  nodes.forEach((node) => {
    const key =
      String(node).toLowerCase();

    if (!uniqueNodes.has(key)) {
      uniqueNodes.set(
        key,
        node
      );
    }
  });

  return Array.from(
    uniqueNodes.values()
  );
}

// ============================================================
// BUILD TRANSACTION EDGES
// ============================================================

function buildTransactionEdges(
  transactions,
  walletAddress
) {
  const edges = [];

  if (!Array.isArray(transactions)) {
    return edges;
  }

  transactions.forEach((tx) => {
    const source =
      tx?.from ||
      tx?.from_address ||
      tx?.fromAddress ||
      "";

    const target =
      tx?.to ||
      tx?.to_address ||
      tx?.toAddress ||
      "";

    if (
      !isAddress(String(source).trim()) ||
      !isAddress(String(target).trim())
    ) {
      return;
    }

    edges.push({
      source: String(source).trim(),
      target: String(target).trim(),
    });
  });

  // Remove duplicate edges
  const uniqueEdges = new Map();

  edges.forEach((edge) => {
    const key =
      `${edge.source.toLowerCase()}->${edge.target.toLowerCase()}`;

    if (!uniqueEdges.has(key)) {
      uniqueEdges.set(
        key,
        edge
      );
    }
  });

  return Array.from(
    uniqueEdges.values()
  );
}

// ============================================================
// GRAPH NODE POSITION
// ============================================================

function getLayeredNodePosition(
  hop,
  index,
  total
) {
  if (hop === 0) {
    return {
      x: 50,
      y: 15,
    };
  }

  const minX = 12;
  const maxX = 88;

  let x = 50;

  if (total === 1) {
    x = 50;
  } else {
    x =
      minX +
      (index / (total - 1)) *
        (maxX - minX);
  }

  const y =
    Math.min(
      15 + hop * 25,
      85
    );

  return {
    x,
    y,
  };
}

// ============================================================
// FEATURE COUNT
// ============================================================

function getFeatureCount(
  result
) {
  const values = [
    result?.feature_count,
    result?.featureCount,
    result?.features_count,
    result?.featuresCount,
    result?.model_features_count,
    result?.modelFeaturesCount,
    result?.ml_prediction?.feature_count,
    result?.ml_prediction?.featureCount,
  ];

  for (const value of values) {
    const number =
      Number(value);

    if (
      Number.isFinite(number) &&
      number > 0
    ) {
      return number;
    }
  }

  return 46;
}


function calculateBtcReceived(
  transactions,
  walletAddress
) {
  const wallet = String(walletAddress).toLowerCase();

  if (!Array.isArray(transactions)) {
    return 0;
  }

  return transactions.reduce(
    (total, tx) => {
      const receivers = tx.receivers || [];

      const received = receivers.some(
        (address) =>
          String(address).toLowerCase() === wallet
      );

      if (!received) {
        return total;
      }

      const value = Number(tx.value_btc);

      if (!Number.isFinite(value)) {
        return total;
      }

      return total + value;
    },
    0
  );
}


function calculateBtcSent(
  transactions,
  walletAddress
) {
  const wallet = String(walletAddress).toLowerCase();

  if (!Array.isArray(transactions)) {
    return 0;
  }

  return transactions.reduce(
    (total, tx) => {
      const senders = tx.senders || [];

      const sent = senders.some(
        (address) =>
          String(address).toLowerCase() === wallet
      );

      if (!sent) {
        return total;
      }

      const value = Number(tx.value_btc);

      if (!Number.isFinite(value)) {
        return total;
      }

      return total + value;
    },
    0
  );
}



export default App;

function isValidBlockchainAddress(address) {
  const value = String(address || "").trim();

  if (!value) {
    return false;
  }

  // Ethereum
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return true;
  }

  // Bitcoin legacy addresses
  if (
    /^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(
      value
    )
  ) {
    return true;
  }

  // Bitcoin Bech32 addresses
  if (
    /^bc1[a-zA-HJ-NP-Z0-9]{11,87}$/i.test(
      value
    )
  ) {
    return true;
  }

  return false;
}
