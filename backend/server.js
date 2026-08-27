const http = require("node:http");
const { randomUUID } = require("node:crypto");

const PORT = Number(process.env.PORT) || 3333;

let tasks = [
  { id: "1", title: "Finalizar apresentacao do projeto", category: "Trabalho", due: "Hoje, 14:00", priority: "Alta", done: false },
  { id: "2", title: "Responder e-mails importantes", category: "Trabalho", due: "Hoje, 16:30", priority: "Media", done: false },
  { id: "3", title: "Comprar ingredientes para o jantar", category: "Pessoal", due: "Hoje, 18:00", priority: "Baixa", done: false },
  { id: "4", title: "Revisar planejamento da semana", category: "Pessoal", due: "Amanha, 09:00", priority: "Media", done: false },
  { id: "5", title: "Agendar consulta medica", category: "Saude", due: "Amanha, 11:00", priority: "Alta", done: true }
];

const priorities = new Set(["Alta", "Media", "Baixa"]);

function send(response, status, data) {
  const origin = response.req.headers.origin;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy();
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("JSON invalido")); }
    });
    request.on("error", reject);
  });
}

function validateTask(data, partial = false) {
  const errors = [];
  if (!partial || data.title !== undefined) {
    if (typeof data.title !== "string" || !data.title.trim()) errors.push("title e obrigatorio");
  }
  if (data.priority !== undefined && !priorities.has(data.priority)) errors.push("priority deve ser Alta, Media ou Baixa");
  if (data.done !== undefined && typeof data.done !== "boolean") errors.push("done deve ser booleano");
  return errors;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const taskId = url.pathname.match(/^\/api\/tasks\/([^/]+)$/)?.[1];

  if (request.method === "OPTIONS") return send(response, 204, null);
  if (request.method === "GET" && url.pathname === "/health") return send(response, 200, { status: "ok" });
  if (request.method === "GET" && url.pathname === "/api/tasks") return send(response, 200, tasks);

  try {
    if (request.method === "POST" && url.pathname === "/api/tasks") {
      const data = await readBody(request);
      const errors = validateTask(data);
      if (errors.length) return send(response, 400, { errors });
      const task = {
        id: randomUUID(), title: data.title.trim(), category: data.category || "Pessoal",
        due: data.due || "Sem prazo", priority: data.priority || "Media", done: false,
        details: data.details || "", estimate: data.estimate || "", reminder: data.reminder || ""
      };
      tasks = [task, ...tasks];
      return send(response, 201, task);
    }

    if (request.method === "PATCH" && taskId) {
      const index = tasks.findIndex((task) => task.id === taskId);
      if (index === -1) return send(response, 404, { error: "Tarefa nao encontrada" });
      const data = await readBody(request);
      const errors = validateTask(data, true);
      if (errors.length) return send(response, 400, { errors });
      const allowed = ["title", "category", "due", "priority", "done", "details", "estimate", "reminder"];
      const updates = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.includes(key)));
      if (updates.title) updates.title = updates.title.trim();
      tasks[index] = { ...tasks[index], ...updates };
      return send(response, 200, tasks[index]);
    }

    if (request.method === "DELETE" && taskId) {
      const initialLength = tasks.length;
      tasks = tasks.filter((task) => task.id !== taskId);
      if (tasks.length === initialLength) return send(response, 404, { error: "Tarefa nao encontrada" });
      return send(response, 204, null);
    }

    return send(response, 404, { error: "Rota nao encontrada" });
  } catch (error) {
    return send(response, 400, { error: error.message || "Requisicao invalida" });
  }
});

server.listen(PORT, () => console.log(`API disponivel em http://localhost:${PORT}`));
