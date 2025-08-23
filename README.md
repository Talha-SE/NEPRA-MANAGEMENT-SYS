# NEPRA EMS (3-tier)

Modern, responsive role-based app with React + Node.js + MongoDB Atlas.

- Presentation: `frontend/` (Vite + React + TS + Tailwind)
- Application: `backend/` (Express + TS, JWT HttpOnly cookie)
- Data: MongoDB Atlas (Mongoose)

## Features
- Role chooser: HR or Employee
- Registration/Login per role
- JWT auth in HttpOnly cookies
- Role-protected dashboards
- View Profile tab: first/middle/last name, email, role

## Quick Start

1) Backend
- Copy `backend/.env.example` to `backend/.env` and fill:
```
PORT=4000
MONGODB_URI=YOUR_ATLAS_URI
JWT_SECRET=replace_with_strong_random_secret
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:5173
```
- Install and run:
```
# in backend/
npm install
npm run dev
```
Server: http://localhost:4000, Health: GET /api/health

2) Frontend
- Copy `frontend/.env.example` to `frontend/.env` (adjust API base if needed):
```
VITE_API_BASE_URL=http://localhost:4000
```
- Install and run:
```
# in frontend/
npm install
npm run dev
```
App: http://localhost:5173

## API Summary
- POST `/api/auth/register` { role, firstName, middleName?, lastName, email, password }
- POST `/api/auth/login` { role, email, password }
- POST `/api/auth/logout`
- GET `/api/me` (cookie)

## Notes
- Cookies: HttpOnly, SameSite=Lax, Secure in production
- Passwords: bcrypt hashed
- Validation: zod on frontend; basic checks on backend

## Scripts
Backend:
- dev: ts-node-dev server hot reload
- build: tsc
- start: node dist/index.js

Frontend:
- dev: vite
- build: tsc -b && vite build
- preview: vite preview
