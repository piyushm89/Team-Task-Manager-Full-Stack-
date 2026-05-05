# Team Task Manager

Small full-stack app where a team can spin up projects, hand out tasks, and keep an eye on what's overdue. Built for the Ethara.AI take-home.

Live: marvelous-tenderness-production-eeef.up.railway.app

## Features

- Email + password signup and login (JWT)
- Two roles
  - **Admin** — creates projects, adds members, creates and assigns tasks
  - **Member** — works on their tasks and updates status
- Projects with a list of members
- Tasks: title, description, priority, due date, assignee, status (todo / in progress / done)
- Dashboard with task counts and an "overdue" tile
- Kanban-ish task board with status filters

The first user to sign up is automatically promoted to admin so you don't have to seed one.

## Tech

- Backend: Node, Express, MongoDB (Mongoose), JWT, bcrypt
- Frontend: React (Vite), Tailwind, React Router, Axios

## Local setup

You'll need Node 18+ and a MongoDB connection string (Atlas free tier is fine).

```bash
# backend
cd backend
cp .env.example .env       # fill MONGO_URI + JWT_SECRET
npm install
npm run dev                # http://localhost:5000
```

```bash
# frontend (new terminal)
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:5000
npm install
npm run dev                # http://localhost:5173
```

## Folders

```
backend/
  src/
    models/        User / Project / Task
    routes/        auth, projects, tasks, users
    middleware/    auth + role check
    config/        db connection
    app.js
  server.js

frontend/
  src/
    pages/         Login, Signup, Dashboard, Projects, ProjectDetail, Tasks, People
    components/    Layout, Modal, badges
    context/       AuthContext
    api/           axios client
```

## Deploying to Railway

This repo has two services — the backend and the frontend — both pointing at the same repo.

1. Push the repo to GitHub.
2. On Railway, create a new project and add **two services** from the repo:

   **Backend**
   - Root: `/backend`
   - Start: `npm start`
   - Env vars: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN` (optional, default 7d), `CLIENT_URL`, `PORT`

   **Frontend**
   - Root: `/frontend`
   - Build: `npm run build`
   - Start: `npm run preview -- --host 0.0.0.0 --port $PORT`
   - Env var: `VITE_API_URL` = the public URL of the backend service

3. After both go live, set `CLIENT_URL` on the backend to the frontend URL (this gets the CORS origin right) and redeploy the backend.

There are `railway.json` files in each service folder so Nixpacks builds them with the right commands.

## API quick reference

```
POST   /api/auth/signup        { name, email, password }
POST   /api/auth/login         { email, password }
GET    /api/auth/me

GET    /api/projects
POST   /api/projects                              admin
GET    /api/projects/:id
PATCH  /api/projects/:id                          admin
DELETE /api/projects/:id                          admin
POST   /api/projects/:id/members                  admin
DELETE /api/projects/:id/members/:userId          admin

GET    /api/tasks              ?project=&assignee=&status=&overdue=true&mine=true
POST   /api/tasks                                 admin
GET    /api/tasks/:id
PATCH  /api/tasks/:id                             admin (any field) / member (status only, own task)
DELETE /api/tasks/:id                             admin

GET    /api/users
PATCH  /api/users/:id/role                        admin
```

## Notes / things I'd improve given more time

- Tokens live in localStorage. For production I'd move them to httpOnly cookies and add a CSRF token on mutating routes.
- No automated tests in this build — just manual checking against the UI and Postman.
- The dashboard counts are computed on the client. Once the workspace grows past a few hundred tasks I'd push that aggregation into a `/api/stats` endpoint.
- Member project access is computed by re-reading the projects list for each request. A small cache or denormalised `projectIds` on the User would save round-trips.
