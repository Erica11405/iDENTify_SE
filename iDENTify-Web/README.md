# iDENTify-App

This is a dental clinic management application.

## Getting Started

To get the application running, you will need to run both the frontend and backend servers.

### Prerequisites

-   Node.js and npm installed.
-   A MySQL database server.

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment:**
    -   Copy `backend/.env.example` to `backend/.env`.
    -   Set DB credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) or `DATABASE_URL`.
    -   If `DATABASE_URL` is present but you want local DB config instead, set `DB_FORCE_INDIVIDUAL=1`.
    -   Set mailer values (`MAILER_USER`, `MAILER_PASS`, `MAILER_FROM`) so OTP and approval decision emails can be sent.

4.  **Set up and migrate the database:**
    -   Make sure you have a MySQL server running.
    -   Create a database named `identify_app`.
    -   Run migrations:
      ```bash
      npm run migrate
      ```
    -   Optional: view migration state:
      ```bash
      npm run migrate:status
      ```

    The superadmin approval workflow migration seeds a globaladmin account:
    -   Email: `ericaaquino01145@gmail.com`
    -   Password: `erica0114`

5.  **Run the backend server:**
    ```bash
    npm start
    ```
    The backend server will be running on `http://localhost:4000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the frontend server:**
    ```bash
    npm run dev
    ```
    The frontend development server will be running on `http://localhost:5173` (or another port if 5173 is in use).

Now you can open your browser and navigate to the frontend URL to use the application.
