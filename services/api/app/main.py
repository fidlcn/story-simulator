from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}


# Register routers
from app.routers import projects, worlds, characters, simulations, variables, narratives, exports, settings  # noqa: E402

app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(worlds.router, prefix="/api", tags=["worlds"])
app.include_router(characters.router, prefix="/api", tags=["characters"])
app.include_router(simulations.router, prefix="/api", tags=["simulations"])
app.include_router(variables.router, prefix="/api", tags=["variables"])
app.include_router(narratives.router, prefix="/api", tags=["narratives"])
app.include_router(exports.router, prefix="/api", tags=["exports"])
app.include_router(settings.router, prefix="/api", tags=["settings"])
