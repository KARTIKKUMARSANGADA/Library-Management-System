# Library Management System API

Backend API for a Library Management System built with FastAPI, SQLAlchemy, PostgreSQL, and Alembic.

## Features

- JWT-based authentication with access and refresh tokens
- OTP flows for account verification and password reset
- User management endpoints
- Admin-only member profile creation and management
- Fixed member borrow limit (`3`) enforced in API and DB
- Author and book CRUD operations
- Book issue/return workflows and issue history
- Alembic database migrations

## Tech Stack

- FastAPI
- SQLAlchemy
- PostgreSQL (`psycopg2-binary`)
- Alembic
- Pydantic Settings

## Project Structure

```text
Library Management System/
  app/
    main.py
    config.py
    database.py
    models/
    routers/
    schemas/
    utils/
  alembic/
  alembic.ini
  requirements.txt
```

## Prerequisites

- Python 3.10+
- PostgreSQL

## Setup

1. Create and activate a virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Create `.env` in project root:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/library_db
JWT_SECRET_KEY=your_super_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
OTP_EXPIRE_MINUTES=10
RESET_TOKEN_EXPIRE_MINUTES=15
DEFAULT_BORROW_LIMIT=3
DEFAULT_BORROW_DAYS=14
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email_username
MAIL_PASSWORD=your_email_password
MAIL_FROM=no-reply@example.com
MAIL_STARTTLS=true
MAIL_SSL_TLS=false
```

4. Run database migrations:

```powershell
alembic upgrade head
```

5. Start the API server:

```powershell
uvicorn app.main:app --reload
```

## API Docs

After starting the server, open:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Main Route Groups

- `/auth` - register, login, OTP verification, token refresh, password reset
- `/users` - user profile and user administration
- `/authors` - author CRUD
- `/books` - book CRUD and search
- `/members` - admin creates member profiles (`POST /members/`), profile access, borrowing history
- `/issues` - issue/return operations and issue tracking

## Run Notes

- CORS is currently configured to allow all origins in `app/main.py`. Restrict it for production.
- The root health endpoint is available at `/`.
- `borrow_limit` is enforced as `3` in API logic and database constraints.

## License

This project is currently unlicensed.
