# TET Holiday Nx Monorepo

Nx monorepo với NestJS backend và React frontend.

## Cấu trúc dự án

```
├── apps/
│   ├── backend-api/      # NestJS API
│   └── frontend-react/    # React app với Vite
├── libs/
│   └── shared-models/     # Shared models và types
└── docker-compose.yml     # Docker deployment
```

## Development

```bash
npm install

nx serve backend-api
nx serve frontend-react
```

## Build

```bash
nx build backend-api
nx build frontend-react
```

## Docker

```bash
docker-compose up --build
```

Backend: http://localhost:3000/api
Frontend: http://localhost:80
