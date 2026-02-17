from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import search, licences, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Registered Routes:")
    for route in app.routes:
        print(f" - {route.path} [{route.name}]")
    yield

app = FastAPI(title="Orientation API", lifespan=lifespan)

# Configure CORS for React frontend
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(search.school_router)
app.include_router(search.specialty_router)
app.include_router(licences.router)
app.include_router(users.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
