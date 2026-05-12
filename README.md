# InsightStream

> **Transform raw data into actionable intelligence.**  
> A full‑stack data analysis platform with automated cleaning, visual exploration, and real‑time audit logging.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135-green)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)

---

## 🚀 Overview

InsightStream is a **self‑service analytics laboratory** that lets users upload datasets, automatically clean and profile them, explore distributions / proportions / relationships, apply AI‑recommended fixes, and export polished reports—all in a modern dark‑themed UI.

Built with a **separation of concerns** in mind: a FastAPI backend powers the data engine, React delivers the interactive frontend, PostgreSQL stores everything, and the whole stack is containerised for painless deployment.

---

## ✨ Features

- **📤 Drag‑and‑drop upload** – supports CSV, Excel (xlsx/xls), JSON, and log files.
- **🧹 Data Laundry** – one‑click cleaning (duplicates, missing values, outliers).
- **📊 Visual Analysis** – paginated distribution charts, categorical breakdowns, correlation matrix.
- **🤖 AI Recommendations** – detects skew, outliers, and low variance; suggests and applies fixes.
- **📈 Data Quality Score** – live score from 0‑100 with configurable penalties.
- **📄 Export Reports** – capture full EDA view as multi‑page PDF.
- **📜 Logs Terminal** – real‑time audit trail via WebSocket; filter by INFO/WARNING/ERROR.
- **🔐 Authentication & RBAC** – JWT‑based login, users see only their own data.
- **👤 User Profile** – editable display name, profile picture upload.
- **🐳 Dockerised** – multi‑container setup (React+Nginx, FastAPI, PostgreSQL) ready for local dev and cloud.

---

## 🏗️ Architecture

```
                   ┌─────────────────────────────────────┐
                   │           Docker Compose              │
                   │                                       │
  Browser ─────────┤                                         │
                   │  ┌──────────┐  ┌──────────┐  ┌─────┐ │
                   │  │ frontend │  │ backend  │  │ db  │ │
                   │  │ (nginx)  │  │(uvicorn) │  │(pg) │ │
                   │  │  :80     │  │  :8000   │  │:5432│ │
                   │  └──────────┘  └──────────┘  └─────┘ │
                   │       │              │          │      │
                   │       │    proxied   │          │      │
                   │       └──────────────┘          │      │
                   │                     │            │      │
                   │                     └────────────┘      │
                   │                         SQL              │
                   └─────────────────────────────────────┘
```

- **Frontend** – React (Vite) built as static files, served by Nginx. Nginx also acts as a reverse proxy for API and WebSocket calls.
- **Backend** – FastAPI with SQLAlchemy ORM, Pandas/Numpy analysis engine, real‑time logging via WebSockets.
- **Database** – PostgreSQL 16 storing user accounts, dataset metadata, and activity logs.

---

## 💻 Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, Recharts, jsPDF, Sonner |
| Backend     | Python 3.12, FastAPI, SQLAlchemy, Pandas, NumPy, Pydantic |
| Database    | PostgreSQL 16 (SQLAlchemy + Alembic migrations)     |
| Auth        | JWT (python‑jose, passlib/bcrypt)                   |
| Real‑time   | WebSockets (Starlette)                              |
| DevOps      | Docker, Docker Compose, Nginx, Alembic              |
| Testing     | Pytest (planned)                                    |

---

## 🚦 Getting Started

### Prerequisites
- Docker & Docker Compose (v3.8+)
- (Optional) Python 3.12 + Node 22 for local development without Docker

### Quick Start (Docker)

1. **Clone the repository**
   ```bash
   git clone https://github.com/khalifa-4619/InsightStream.git
   cd InsightStream
   ```

2. **Set up environment variables**
   - Copy the example file:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` with your own secrets (strong `SECRET_KEY`, database password, etc.)

3. **Start the stack**
   ```bash
   docker compose up --build
   ```

4. **Access the app**
   - Frontend: [http://localhost](http://localhost)
   - Backend API (direct): [http://localhost:8000](http://localhost:8000)
   - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)

### Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Configuration

All settings live in environment variables. See `.env.example` for required keys:

| Variable                  | Description                              |
|---------------------------|------------------------------------------|
| `SECRET_KEY`              | JWT signing secret (use a strong value)  |
| `ALGORITHM`               | JWT algorithm (HS256)                    |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifespan in minutes            |
| `POSTGRES_USER`           | Database username                        |
| `POSTGRES_PASSWORD`       | Database password                        |
| `POSTGRES_SERVER`         | Database host (`db` in Docker)           |
| `POSTGRES_PORT`           | Database port (5432)                     |
| `POSTGRES_DB`             | Database name                            |

---

## 📁 Project Structure

```
InsightStream/
├── .env                       # Docker environment (git‑ignored)
├── .env.example               # template for Docker env
├── docker-compose.yml         # service orchestration
├── Dockerfile.backend         # multi‑stage FastAPI image
├── Dockerfile.frontend        # multi‑stage React + Nginx image
├── nginx.conf                 # SPA routing & reverse proxy
├── docker-entrypoint.sh       # DB wait + migrations + start
├── backend/
│   ├── .env                   # local dev env (git‑ignored)
│   ├── .env.example           # template
│   ├── requirements.txt
│   ├── alembic.ini
│   └── app/
│       ├── main.py            # FastAPI app entrypoint
│       ├── api/               # route handlers
│       ├── crud/              # data access layer
│       ├── db/                # session & base
│       ├── models/            # SQLAlchemy models
│       ├── schemas/           # Pydantic schemas
│       ├── services/          # analytics engine, logger, file analyzer
│       └── core/              # config, security
└── frontend/
    ├── package.json
    ├── src/
    │   ├── pages/             # Dashboard, Analytics, DataSources, Logs, Profile
    │   └── components/        # Sidebar, Charts, Cards, Skeletons, EmptyState
    └── public/
```

---

## 📡 API Documentation

Once the backend is running, interactive Swagger docs are available at:

> `http://localhost:8000/docs`

Key endpoints:
- `POST /signup`, `POST /login`
- `POST /datasets/upload`
- `GET /datasets/`, `DELETE /datasets/{id}`
- `POST /api/process/{id}?task=clean|univariate|bivariate|apply_recommendations`
- `WS /ws/logs` (WebSocket for real‑time logs)
- `GET /logs/` (historical logs)

---

## 🧪 Running Tests (future)

Test suite will be added soon using `pytest` and `React Testing Library`.

---

## ☁️ Deployment on AWS (Blueprint)

The Docker setup is a **direct blueprint** for cloud deployment:

- **Frontend** → S3 bucket + CloudFront CDN
- **Backend** → ECS Fargate (or EC2) using `Dockerfile.backend`
- **Database** → RDS PostgreSQL
- **File storage** → S3 for uploads
- **Logs** → CloudWatch

CI/CD can be implemented with GitHub Actions + Terraform/CDK.

---

## 👤 Author

**Khalifa** – [GitHub @khalifa-4619](https://github.com/khalifa-4619)

---

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
```
