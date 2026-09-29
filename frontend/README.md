# FoodTracker frontend

## Connect to the backend

The Vite app calls the authenticated Express API. By default it uses
`http://localhost:5000/api`. To use a different backend, create a
`frontend/.env` file from `.env.example` and set `VITE_API_URL` to the backend
API base URL (including `/api`). Restart Vite after changing environment
variables.

Start the backend from `backend/` after configuring its `.env` from
`.env.example` and setting `DATABASE_URL`, `JWT_ACCESS_SECRET`, and
`CLIENT_ORIGIN=http://localhost:5173`. Then start the frontend:

```sh
cd frontend
npm ci
npm run dev
```

The backend must be reachable and its database configured. Create an account
through the sign-up form. The app then loads products, storage locations, and
batches from the API; receiving a batch and recording a stock adjustment both
persist to the database.

## Frontend commands

```sh
npm run build
npm run lint
```
