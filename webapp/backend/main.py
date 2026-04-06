"""
NHS PROMs Knee Replacement Prediction — FastAPI Backend
Run with: uvicorn main:app --reload --port 8000
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.model_loader import load_all_models
from routers import metrics, predict, explain


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load all models once into memory
    print("[startup] Loading ML models...")
    models = load_all_models()
    print(f"[startup] Loaded {len(models)} model(s): {list(models.keys())}")
    yield
    # Shutdown: nothing to clean up
    print("[shutdown] Server stopping.")


app = FastAPI(
    title="NHS PROMs Knee Replacement Prediction API",
    description=(
        "Predicts whether a patient is likely to achieve meaningful improvement "
        "after knee replacement surgery, using NHS PROMs data (2016–2019). "
        "For research and decision-support only — not a clinical diagnosis tool."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the React development server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://eaisi-group-project-nhs.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics.router)
app.include_router(predict.router)
app.include_router(explain.router)


@app.get("/")
def root():
    return {
        "message": "NHS PROMs Prediction API",
        "docs": "/docs",
        "redoc": "/redoc",
    }
