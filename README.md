NIFTYIQ
AI-Powered Financial Intelligence & Industry Analytics System

---

Overview
NIFTYIQ is an end-to-end financial intelligence system that automates company analysis at scale. It combines AI-driven qualitative insights with deterministic quantitative metrics to evaluate companies, sectors, and industries.

The system mimics the workflow of a fundamental equity analyst — analyzing annual reports, computing financial metrics, benchmarking peers, and ranking industries — all in an automated, scalable pipeline.

—
Website is live at: https://niftyiq.vercel.app/

To run the project on your system, follow these steps:
root: 
pip install requirements.txt
python pipeline.py
python api.py
cd frontend 
npm i
npm run dev 

To run the mcp server:
refer to mcp_server/run_mcp.md


 Key Features

-  Automated annual report scraping and processing  
-  AI-based qualitative analysis using LLMs  
-  Deterministic financial metric computation  
-  Hybrid scoring system (AI + mathematical engine)  
-  Peer comparison across companies  
-  Industry-level aggregation and ranking  
-  Structured JSON outputs for downstream usage  
-  Fault-tolerant and resumable pipeline  

---

System Architecture

1. Data Ingestion Layer
- Scrapes and downloads annual reports (PDFs)
- Cleans and preprocesses files for analysis

2. Quantitative Layer
- Fetches financial metrics via APIs
- Ensures deterministic and reliable data pipeline
- Handles fallback mechanisms for missing data

3. AI Extraction Layer
- Extracts structured insights from reports
- Outputs strict JSON format
- Evaluates:
  - Business Quality (BQ)
  - Return Profile (RP)
  - Cyclicality (CY)
  - Governance (BG)

4. Data Integration Layer
- Merges qualitative + quantitative data
- Maintains a unified company profile

5. Peer Evaluation Engine
- Fully mathematical (non-AI)
- Computes:
  - Composite scores
  - Growth indicators
  - Risk signals
- Ensures interpretability and zero hallucination

6. Industry Evaluation Engine
- Groups companies dynamically by sector
- Performs normalization and ranking
- Computes weighted industry scores

7. Storage Layer
- Outputs stored as structured JSON:
  - Company-level
  - Peer-level
  - Industry-level
- Integrated with database (MongoDB Atlas)

8. State Management
- Tracks pipeline progress using flags
- Enables resumable execution

9. Execution Modes
- Batch Mode (e.g., NIFTY 100)
- On-Demand Mode (custom ticker analysis)

---

 Output Structure

The system produces:

-  Individual Company Analysis (JSON)
- Peer Comparison Data (JSON)
-  Industry Rankings (JSON)

Each company includes:
- Financial metrics
- AI-generated insights
- Scores with explanations

---

Dashboards

- Company Dashboard  
- Industry Dashboard  
- Global Index View  
- Detailed Company Insights  

---

Tech Stack

- *Backend:* Python  
- *AI Models:* Gemini API  
- *Data Fetching:* yfinance  
- *Storage:* MongoDB Atlas  
- *Processing:* JSON pipelines, modular architecture  

---

How It Works

1. Scrape annual reports  
2. Extract insights using AI  
3. Fetch financial metrics  
4. Merge and structure data  
5. Run peer evaluation (math-based)  
6. Aggregate industry insights  
7. Store and visualize results  

---

Future Scope

-  Predictive modeling using ML  
-  Real-time anomaly detection  
-  Personalized alerts and insights  
-  Year-over-year report comparison using AI  

---

References

- Yahoo Finance API (yfinance)  
- Google Gemini API  
- Financial metrics frameworks (ROE, ROCE, OPM, etc.)  
- Python standard libraries  

---

Vision

NIFTYIQ aims to become a fully automated financial research engine — enabling scalable, consistent, and explainable investment analysis without human bias or inefficiency.

---

Author
Developed as a financial intelligence system combining AI and quantitative analysis for real-world investment insights.