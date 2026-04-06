# Rivet

Rivet is a visual workflow automation tool with:

- a Next.js frontend in `frontend/`
- a Python backend in `backend/`

## Backend

The backend uses FastAPI and Pydantic with Python-friendly package naming:

- `backend/app/main.py` for the ASGI entrypoint
- `backend/app/api/routes/` for route modules
- `backend/app/models/` for request and domain schemas
- `backend/app/services/` for validation and execution logic

### Run the backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will start on `http://127.0.0.1:8000`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```
