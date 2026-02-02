from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import search

app = FastAPI(title="Orientation API")

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

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/routes")
def get_routes():
    routes_list = []
    for route in app.routes:
        methods = list(route.methods) if hasattr(route, "methods") else None
        routes_list.append({
            "path": route.path,
            "name": route.name,
            "methods": methods
        })
    return routes_list

@app.on_event("startup")
async def startup_event():
    print("Registered Routes:")
    for route in app.routes:
        print(f" - {route.path} [{route.name}]")
