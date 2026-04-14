from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.ai import router as ai_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.properties import router as properties_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.tenants import router as tenants_router
from app.api.v1.technicians import router as technicians_router
from app.api.v1.units import router as units_router
from app.config import settings
from app.infrastructure.database import init_database
from app.infrastructure.seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    seed_demo_data()
    yield

app = FastAPI(
    title="Smart Property Maintenance System",
    version="1.0.0",
    description="Enterprise-style maintenance ticketing system for property management.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    properties_router,
    prefix=f"{settings.api_prefix}/properties",
    tags=["properties"],
)
app.include_router(
    units_router,
    prefix=f"{settings.api_prefix}/units",
    tags=["units"],
)
app.include_router(
    tenants_router,
    prefix=f"{settings.api_prefix}/tenants",
    tags=["tenants"],
)
app.include_router(
    technicians_router,
    prefix=f"{settings.api_prefix}/technicians",
    tags=["technicians"],
)
app.include_router(
    tickets_router,
    prefix=f"{settings.api_prefix}/tickets",
    tags=["tickets"],
)
app.include_router(
    invoices_router,
    prefix=f"{settings.api_prefix}/invoices",
    tags=["invoices"],
)
app.include_router(
    analytics_router,
    prefix=f"{settings.api_prefix}/analytics",
    tags=["analytics"],
)
app.include_router(
    ai_router,
    prefix=f"{settings.api_prefix}/ai",
    tags=["ai"],
)
