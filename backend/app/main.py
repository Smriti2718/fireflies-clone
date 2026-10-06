"""FastAPI application entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import action_items, ask, exports, meetings, misc
from .seed import seed_if_empty

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    if settings.seed_on_startup:
        with SessionLocal() as db:
            seed_if_empty(db)
    yield


app = FastAPI(
    title="Fireflies Clone API",
    version="1.0.0",
    description="Meetings, transcripts, AI notes and action items.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

for r in (misc.router, meetings.router, action_items.router, ask.router, exports.router):
    app.include_router(r)


@app.get("/", include_in_schema=False)
def root():
    return {"name": "Fireflies Clone API", "docs": "/docs"}
