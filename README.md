# 📊 InsightStream

**InsightStream** is a professional-grade Data Analysis SaaS platform. It allows users to upload structured data (CSV, Excel, Text), perform instant SQL-based filtering using an in-memory engine, and generate high-level visualizations and ML insights.

---

## 🚀 Key Features
- **Smart Upload:** Supports CSV, Excel, and Text files.
- **SQL Workbench:** Run SQL queries directly on your files via a "no-code" button interface.
- **Basic Analytics:** Instant descriptive statistics (Mean, Median, Distributions).
- **Premium Tier:** - Advanced ML features (TF-IDF Text Analysis, Clustering).
  - Geospatial mapping with Folium.
  - Interactive Plotly dashboards.
- **Secure Auth:** JWT-based authentication with PostgreSQL user management.

---

## 🛠 Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Plotly.js
- **Backend:** FastAPI (Python), Pandas, DuckDB, Scikit-learn
- **Database:** PostgreSQL (User accounts & Metadata)
- **DevOps:** WSL2, Docker, Alembic (Migrations)

---

## 📂 Project Structure
```text
InsightStream/
├── backend/            # FastAPI, Pandas, ML Logic
│   ├── app/            # Main application logic
│   ├── alembic/        # DB Migrations
│   ├── tests/          # Pytest suite
│   └── .env            # Environment variables (Local only)
├── frontend/           # React (Vite) + Tailwind
└── docker-compose.yml  # Container orchestration