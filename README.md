## Backend Setup (Local Development)

### 1. Navigate to the backend directory

```powershell
cd backend
```

### 2. Create a virtual environment

```powershell
python -m venv venv
```

### 3. Activate the virtual environment

```powershell
venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```powershell
pip install -r requirements.txt
```

### 5. Configure environment variables

Create a `.env` file inside the `backend` directory:

```env
GOOGLE_API_KEY=your_google_api_key
POKEWALLET_API_KEY=your_pokewallet_api_key

DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
```

Replace the placeholder values with your own credentials.

### 6. Run database migrations

Check the Django project configuration:

```powershell
python manage.py check
```

Create migrations for the cards application:

```powershell
python manage.py makemigrations cards
```

Apply database migrations:

```powershell
python manage.py migrate
```

### 7. Start the Django development server

```powershell
python manage.py runserver
```

The backend will be available at:

`http://localhost:8000`

---

## Running with Docker

Docker Compose allows you to start both the frontend and backend without manually installing their dependencies.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- PostgreSQL 15 running on your machine
- Backend environment variables configured in `backend/.env`

### 1. Navigate to the project root

```powershell
cd tcg
```

### 2. Build Docker images

```powershell
docker compose build
```

### 3. Start the application

```powershell
docker compose up
```

The application will be available at:

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:8000` |

### 4. Stop the application

Press `Ctrl + C`, then run:

```powershell
docker compose down
```

### 5. Run database migrations inside Docker

If migrations have not yet been applied, open another PowerShell terminal at the project root and run:

```powershell
docker compose exec backend python manage.py migrate
```

**Note:** When running through Docker Compose, the backend connects to PostgreSQL on the Windows host using `host.docker.internal`. The Compose configuration overrides `DB_HOST` for this purpose.

---

## Environment Variables

The backend requires the following environment variables:

| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | Google Gemini API key |
| `POKEWALLET_API_KEY` | PokéWallet API key |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |

**Important:** Never commit your `.env` file or expose