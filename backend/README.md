# Backend TodoLIST

API REST sem banco de dados. As tarefas ficam somente na memoria e voltam ao estado inicial quando o servidor e reiniciado.

## Executar

```bash
cd backend
npm run dev
```

A API inicia em `http://localhost:3333`.

## Rotas

- `GET /health`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
