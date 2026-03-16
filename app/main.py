from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth
from app.routers import users
from app.routers import author
from app.routers import book
from app.routers import member
from app.routers import issues


app = FastAPI(
    title="Library Management System API",
    description="Backend API for managing users, members, books, and borrowing system.",
    version="1.0.0"
)


# -------------------------------
# CORS Configuration
# -------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------
# Include Routers
# -------------------------------
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(author.router)
app.include_router(book.router)
app.include_router(member.router)
app.include_router(issues.router)


# -------------------------------
# Root Endpoint
# -------------------------------
@app.get("/", tags=["Welcome"])
def root():
    return {
        "message": "Library Management System API is running 🚀"
    }
