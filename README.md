# Orientation App

This application helps students analyze Parcoursup data to make better orientation choices.

## Prerequisites

-   **Python 3.8+**
-   **Node.js 16+**
-   **PostgreSQL** (if running with a local database, though currently using SQLite by default/for dev)

## Project Structure

-   `backend/`: FastAPI application (Python)
-   `frontend/`: React application (Vite + TypeScript)
-   `ingestion/`: Data processing scripts (TypeScript)

## How to Run

### 1. Start the Backend

The backend serves the API at `http://localhost:8000`.

Open a terminal in the root directory and run:

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
pip install -r requirements.txt

# Start the server (from the project root to ensure imports work)
cd ..
python -m uvicorn backend.main:app --reload
```

*Note: The API documentation is available at `http://localhost:8000/docs`.*

### 2. Start the Frontend

The frontend is served at `http://localhost:5173`.

Open a **new** terminal window and run:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

## Features

-   **Search**: Filter formations by city, department, category, and more.
-   **Visualization**: View detailed stats including admission rates, selectivity, and mention distribution graphs.
-   **Pagination**: Browse through thousands of formations efficiently.

## Troubleshooting

### PowerShell: "running scripts is disabled on this system"

If you see this error when running `npm`, it's due to Windows PowerShell execution policies.

**Option 1: Run in Command Prompt (cmd.exe)**
Use `cmd` instead of PowerShell.

**Option 2: Bypass policy temporarily**
Run this command in PowerShell before starting the app:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

**Option 3: Use cmd /c**
Run:
```powershell
cmd /c "npm run dev"
```

## Database Access

The application uses **SQLite**. The database file is located at:
`ingestion/prisma/dev.db`


**Best Option: Prisma Studio**

The project includes Prisma, which comes with a built-in GUI for the database.
1. Open a terminal in the `ingestion` directory.
2. Run:
   ```bash
   npx prisma studio
   # OR if you get a PowerShell error:
   cmd /c "npx prisma studio"
   ```
3. Open your browser at [http://localhost:5555](http://localhost:5555).

**Other Clients:**
1.  **DB Browser for SQLite**: A high-quality, visual, open-source tool.
    *   [Download Here](https://sqlitebrowser.org/)
2.  **DBeaver**: Universal Database Tool.
    *   [Download Here](https://dbeaver.io/)

