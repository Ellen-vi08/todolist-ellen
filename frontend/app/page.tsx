"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Priority = "Alta" | "Media" | "Baixa";
type Task = { id: string; title: string; category: string; due: string; priority: Priority; done: boolean; details?: string; estimate?: string; reminder?: string };
type Toast = { message: string; tone: "success" | "neutral" | "danger" };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";

const priorityClass: Record<Priority, string> = {
  Alta: "task-priority task-priority-high",
  Media: "task-priority task-priority-medium",
  Baixa: "task-priority task-priority-low",
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState("Hoje");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/tasks`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: Task[]) => setTasks(data))
      .catch(() => showToast("Nao foi possivel conectar ao backend.", "danger"));
  }, []);

  const todayOpen = tasks.filter((task) => !task.done && task.due.startsWith("Hoje")).length;
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(query.toLowerCase());
    if (filter === "Concluidas") return task.done && matchesSearch;
    if (filter === "Todas") return matchesSearch;
    if (filter === "Proximos 7 dias") return matchesSearch;
    return task.due.startsWith("Hoje") && matchesSearch;
  }), [tasks, filter, query]);

  function showToast(message: string, tone: Toast["tone"]) {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, tone });
    toastTimeout.current = setTimeout(() => setToast(null), 3600);
  }

  async function toggleTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    try {
      const response = await fetch(`${API_URL}/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !task.done }) });
      if (!response.ok) throw new Error();
      const updatedTask: Task = await response.json();
      setTasks((current) => current.map((item) => item.id === id ? updatedTask : item));
      showToast(task.done ? `Tarefa reaberta: ${task.title}` : `Tarefa concluida: ${task.title}`, task.done ? "neutral" : "success");
    } catch {
      showToast("Nao foi possivel atualizar a tarefa.", "danger");
    }
  }

  async function deleteTask(task: Task) {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${task.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setTasks((current) => current.filter((item) => item.id !== task.id));
      showToast(`Tarefa apagada: ${task.title}`, "danger");
    } catch {
      showToast("Nao foi possivel excluir a tarefa.", "danger");
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    if (!title) return;
    const date = String(data.get("date") || "Hoje");
    const time = String(data.get("time") || "09:00");
    try {
      const response = await fetch(`${API_URL}/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, category: String(data.get("category") || "Pessoal"), due: `${date}, ${time}`, priority: String(data.get("priority") || "Media"), details: String(data.get("details") || "").trim(), estimate: String(data.get("estimate") || ""), reminder: String(data.get("reminder") || "") }) });
      if (!response.ok) throw new Error();
      const task: Task = await response.json();
      setTasks((current) => [task, ...current]);
      setShowModal(false);
      showToast(`Nova tarefa cadastrada: ${title}`, "success");
    } catch {
      showToast("Nao foi possivel cadastrar a tarefa.", "danger");
    }
  }

  return (
    <main className={`todo-app ${darkMode ? "dark-mode" : ""}`}>
      <header className="todo-header">
        <a className="brand-mark" href="#inicio" aria-label="Todo List - inicio">
          <img src="/todo-logo.png" alt="Todo List" />
          <span><b>todo</b><strong>LIST</strong></span>
        </a>
        <div className="header-actions">
          <button className="theme-button" onClick={() => setDarkMode((current) => !current)} aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"} aria-pressed={darkMode}><span className="theme-knob" /></button>
          <button className="icon-button" aria-label="Notificacoes"><i className="bell-icon" /><em /></button>
          <button className="profile" aria-label="Perfil de Ellen">EM</button>
        </div>
      </header>

      <div className="workspace" id="inicio">
        <aside className="side-menu" aria-label="Filtros de tarefas">
          <p className="menu-label">MINHA AGENDA</p>
          {["Hoje", "Proximos 7 dias", "Todas", "Concluidas"].map((item) => (
            <button key={item} onClick={() => setFilter(item)} className={filter === item ? "menu-item active" : "menu-item"}>
              <span className={`menu-dot ${item === "Hoje" ? "sun" : ""}`} />{item}
              {item === "Hoje" && <b>{todayOpen}</b>}
            </button>
          ))}
          <div className="lists-block">
            <p className="menu-label">LISTAS</p>
            {[["Trabalho", "pink"], ["Pessoal", "yellow"], ["Saude", "purple"]].map(([list, color]) => (
              <button key={list} className="list-link"><span className={`list-swatch ${color}`} />{list}</button>
            ))}
          </div>
        </aside>

        <section className="notebook" aria-label="Lista de tarefas">
          <div className="notebook-shadow" />
          <div className="rings" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="notebook-paper">
            <div className="paper-top">
              <div><p className="eyebrow">QUARTA-FEIRA, 26 DE AGOSTO</p><h1>Bom dia, Ellen<span>!</span></h1><p className="paper-subtitle">Pequenos checks, grandes conquistas.</p></div>
              <button className="add-button" onClick={() => setShowModal(true)}><span>+</span> Nova tarefa</button>
            </div>
            <div className="progress-strip"><span className="star">*</span><p>Voce tem <b>{todayOpen} tarefas</b> para concluir hoje.</p><button onClick={() => setFilter("Hoje")}>Ver agenda</button></div>
            <div className="task-toolbar"><h2>{filter === "Hoje" ? "Tarefas de hoje" : filter}</h2><label className="search-field"><span /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarefa" /></label></div>
            <div className="task-list">
              {visibleTasks.map((task) => (
                <article className={task.done ? "task-card completed" : "task-card"} key={task.id}>
                  <input className="notebook-check" type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} aria-label={`Concluir ${task.title}`} />
                  <div className="task-copy"><h3>{task.title}</h3>{task.details && <span className="task-details">{task.details}</span>}<p><span className="category-dot" />{task.category}<small />{task.due}{task.estimate && <><small />{task.estimate}</>}</p></div>
                  <span className={priorityClass[task.priority]}>{task.priority}</span>
                  <button className="delete-task" onClick={() => deleteTask(task)} aria-label={`Excluir ${task.title}`}>x</button>
                </article>
              ))}
              {visibleTasks.length === 0 && <div className="empty-state">Nenhuma tarefa encontrada nesta pagina.</div>}
            </div>
            <div className="paper-doodles" aria-hidden="true"><i /><i /><i /></div>
          </div>
        </section>
      </div>

      {showModal && <div className="modal-backdrop"><form onSubmit={addTask} className="task-modal"><div className="modal-heading"><div><p className="eyebrow">NOVA PAGINA</p><h2>Adicionar tarefa</h2></div><button type="button" onClick={() => setShowModal(false)} aria-label="Fechar">x</button></div><label>Nome da tarefa<input name="title" autoFocus required placeholder="Ex.: Preparar relatorio mensal" /></label><label>Descricao<textarea name="details" rows={3} placeholder="Inclua contexto, links ou o proximo passo." /></label><div className="modal-grid"><label>Lista<select name="category"><option>Trabalho</option><option>Pessoal</option><option>Saude</option></select></label><label>Prioridade<select name="priority"><option>Media</option><option>Alta</option><option>Baixa</option></select></label><label>Data<select name="date"><option>Hoje</option><option>Amanha</option><option>Esta semana</option><option>Sem prazo</option></select></label><label>Horario<input name="time" type="time" defaultValue="09:00" /></label><label>Duracao estimada<select name="estimate"><option value="">Nao definida</option><option>15 min</option><option>30 min</option><option>1 hora</option><option>2 horas ou mais</option></select></label><label>Lembrete<select name="reminder"><option value="">Sem lembrete</option><option>10 min antes</option><option>30 min antes</option><option>1 hora antes</option><option>1 dia antes</option></select></label><label>Recorrencia<select name="repeat"><option>Nao repetir</option><option>Todos os dias</option><option>Toda semana</option><option>Todo mes</option></select></label><label>Etiquetas<input name="tags" placeholder="Ex.: urgente, cliente" /></label></div><button className="submit-task">Adicionar a lista</button></form></div>}
      {toast && <aside className={`toast toast-${toast.tone}`} role="status" aria-live="polite"><span className="toast-symbol">{toast.tone === "danger" ? "!" : "✓"}</span><p>{toast.message}</p><button onClick={() => setToast(null)} aria-label="Fechar notificacao">x</button></aside>}
      <style jsx global>{`
        :root { color-scheme: light; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f55abb; color: #241923; font-family: Arial, Helvetica, sans-serif; }
        button, input, select { font: inherit; } button { cursor: pointer; }
        .todo-app { min-height: 100vh; background: linear-gradient(120deg, #f98bd0 0%, #f554bd 48%, #d442b8 100%); overflow: hidden; }
        .todo-header { height: 74px; padding: 8px clamp(20px, 5vw, 76px); display: flex; align-items: center; justify-content: space-between; background: #fff5ee; border-bottom: 3px solid #241923; position: relative; z-index: 3; }
        .brand-mark { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; font-size: 25px; letter-spacing: 0; }
        .brand-mark img { height: 55px; width: 78px; object-fit: cover; object-position: 51% 31%; border: 2px solid #241923; border-radius: 6px; }
        .brand-mark span { text-shadow: 1px 1px 0 #d040af; } .brand-mark b { font-weight: 400; } .brand-mark strong { color: #f653bf; font-weight: 800; }
        .header-actions { display: flex; align-items: center; gap: 12px; }.icon-button, .profile { border: 2px solid #241923; background: #fff; width: 40px; height: 40px; border-radius: 50%; position: relative; }.bell-icon { display: block; width: 13px; height: 15px; margin: 7px auto 0; border: 2px solid #241923; border-radius: 8px 8px 4px 4px; }.icon-button em { position: absolute; width: 8px; height: 8px; background: #f653bf; border: 1px solid #241923; border-radius: 50%; top: 5px; right: 5px; }.profile { background: #f9dc52; font-size: 12px; font-weight: 800; }
        .theme-button { width: 48px; height: 27px; padding: 2px; border: 2px solid #241923; border-radius: 999px; background: #f9dc52; position: relative; }.theme-button:before { content: ""; position: absolute; inset: 5px auto auto 7px; width: 7px; height: 7px; border: 1px solid #241923; border-radius: 50%; background: transparent; }.theme-knob { display: block; width: 19px; height: 19px; border: 2px solid #241923; border-radius: 50%; background: #fff4e9; transform: translateX(18px); transition: transform .2s ease, background .2s ease; }
        .workspace { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: 40px 0 64px; display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 34px; }.side-menu { padding-top: 72px; }.menu-label { margin: 0 0 10px 14px; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: #fff5ee; }.menu-item, .list-link { border: 0; background: transparent; width: 100%; padding: 11px 14px; color: #4a2448; text-align: left; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; border-radius: 6px; }.menu-item.active { color: #241923; background: #fff5ee; box-shadow: 4px 4px 0 #7a347a; }.menu-item b { margin-left: auto; font-size: 11px; padding: 2px 7px; border: 1px solid #241923; border-radius: 99px; background: #f9dc52; }.menu-dot { width: 10px; height: 10px; border: 2px solid #241923; border-radius: 50%; background: #ffc4e6; }.menu-dot.sun { background: #f9dc52; }.lists-block { margin-top: 36px; }.list-link { color: #fff5ee; padding-block: 9px; }.list-swatch { width: 11px; height: 11px; border: 2px solid #241923; transform: rotate(45deg); }.list-swatch.pink { background: #ff69c6; }.list-swatch.yellow { background: #f9dc52; }.list-swatch.purple { background: #b260c9; }
        .notebook { position: relative; padding: 31px 0 0 25px; }.notebook-shadow { position: absolute; inset: 47px -14px -18px 42px; background: #79357a; }.notebook-paper { position: relative; background: #fff4e9; border: 4px solid #241923; min-height: 650px; padding: 70px clamp(24px, 5vw, 62px) 42px; box-shadow: inset 0 0 0 3px #f2a4d7; }.notebook-paper:before { content: ""; position: absolute; inset: 48px 30px 30px; border: 2px solid #ed9bd4; pointer-events: none; }.rings { position: absolute; z-index: 2; display: flex; justify-content: space-around; left: 6%; right: 2%; top: 0; }.rings i { width: 34px; height: 77px; background: linear-gradient(90deg, #7d7280, #fff, #8c8190); border: 4px solid #241923; border-bottom: 0; border-radius: 50% 50% 42% 42%; transform: rotate(-7deg); box-shadow: 10px 22px 0 -2px #5b5158; }
        .paper-top, .progress-strip, .task-toolbar, .task-list { position: relative; z-index: 1; }.paper-top { display: flex; align-items: start; justify-content: space-between; gap: 20px; }.eyebrow { margin: 0 0 7px; color: #bd52aa; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; }.paper-top h1 { margin: 0; font-family: Georgia, serif; font-size: clamp(30px, 5vw, 48px); font-weight: 500; line-height: 1; }.paper-top h1 span { color: #f653bf; }.paper-subtitle { margin: 10px 0 0; font-size: 14px; color: #805878; }.add-button, .submit-task { border: 3px solid #241923; background: #f653bf; color: #fff; box-shadow: 4px 4px 0 #7a347a; padding: 11px 15px; font-size: 13px; font-weight: 800; }.add-button span { font-size: 19px; vertical-align: -1px; margin-right: 3px; }.add-button:hover, .submit-task:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #7a347a; }.progress-strip { margin: 28px 0 26px; display: flex; align-items: center; gap: 11px; padding: 12px 14px; background: #ffcdf0; border: 2px dashed #d847ae; }.progress-strip p { margin: 0; flex: 1; font-size: 13px; color: #592351; }.star { width: 23px; height: 23px; display: grid; place-items: center; background: #f9dc52; border: 2px solid #241923; border-radius: 50%; font-weight: 800; }.progress-strip button { border: 0; background: transparent; color: #a53592; font-weight: 800; font-size: 12px; }.task-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 2px solid #d987c4; padding-bottom: 13px; }.task-toolbar h2 { margin: 0; font-family: Georgia, serif; font-size: 22px; }.search-field { display: flex; align-items: center; border: 2px solid #241923; background: #fff; height: 34px; padding: 0 9px; }.search-field span { width: 12px; height: 12px; border: 2px solid #5f4a5d; border-radius: 50%; position: relative; margin-right: 8px; }.search-field span:after { content: ""; position: absolute; height: 7px; border-left: 2px solid #5f4a5d; right: -5px; bottom: -5px; transform: rotate(-45deg); }.search-field input { width: 130px; border: 0; outline: 0; font-size: 12px; background: transparent; }.task-list { padding-top: 8px; }.task-card { min-height: 68px; display: flex; align-items: center; gap: 13px; padding: 12px 3px; border-bottom: 1px solid #edb0d9; }.task-card:hover { background: rgba(255, 255, 255, .5); }.notebook-check { appearance: none; width: 23px; height: 23px; border: 2px solid #241923; background: #fff9f6; display: grid; place-items: center; flex: none; }.notebook-check:checked { background: #f653bf; }.notebook-check:checked:after { content: ""; width: 10px; height: 5px; border-left: 3px solid white; border-bottom: 3px solid white; transform: rotate(-45deg) translate(1px, -1px); }.task-copy { min-width: 0; flex: 1; }.task-copy h3 { margin: 0; font-size: 14px; line-height: 1.3; }.task-copy p { margin: 5px 0 0; color: #8a6581; font-size: 11px; }.category-dot { display: inline-block; width: 7px; height: 7px; margin-right: 4px; border: 1px solid #241923; border-radius: 50%; background: #f9dc52; }.task-copy small { display: inline-block; height: 10px; border-left: 1px solid #bd7ca7; margin: 0 8px -1px; }.task-priority { font-size: 10px; font-weight: 800; padding: 5px 9px; border: 1px solid #241923; }.task-priority-high { background: #ffc4e6; }.task-priority-medium { background: #f9dc52; }.task-priority-low { background: #b7eee1; }.delete-task { width: 25px; height: 25px; color: #874f7a; border: 0; background: transparent; font-weight: 800; font-size: 16px; }.completed { opacity: .55; }.completed h3 { text-decoration: line-through; }.empty-state { margin-top: 22px; border: 2px dashed #d987c4; padding: 34px; text-align: center; color: #8a6581; font-size: 13px; }.paper-doodles { position: absolute; z-index: 1; left: 22px; bottom: 17px; display: flex; align-items: end; gap: 9px; }.paper-doodles i { display: block; width: 13px; height: 13px; background: #f9dc52; border: 2px solid #241923; transform: rotate(45deg); }.paper-doodles i:nth-child(2) { width: 20px; height: 20px; background: #ff69c6; border-radius: 50%; }.paper-doodles i:nth-child(3) { width: 8px; height: 25px; background: #b260c9; }
        .modal-backdrop { position: fixed; inset: 0; z-index: 5; display: grid; place-items: center; padding: 20px; background: rgba(40, 12, 38, .45); }.task-modal { width: min(480px, 100%); border: 4px solid #241923; background: #fff4e9; padding: 28px; box-shadow: 11px 11px 0 #79357a; }.modal-heading { display: flex; justify-content: space-between; align-items: start; margin-bottom: 22px; }.modal-heading h2 { margin: 0; font-family: Georgia, serif; font-size: 27px; }.modal-heading button { width: 30px; height: 30px; background: #f653bf; border: 2px solid #241923; font-weight: 800; }.task-modal label { display: block; margin: 0 0 14px; font-size: 12px; font-weight: 800; }.task-modal input, .task-modal select { width: 100%; margin-top: 6px; padding: 9px; border: 2px solid #241923; background: #fff; outline-color: #f653bf; font-size: 13px; }.modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }.submit-task { width: 100%; margin-top: 8px; }
        .task-modal textarea { width: 100%; resize: vertical; margin-top: 6px; padding: 9px; border: 2px solid #241923; background: #fff; outline-color: #f653bf; font-size: 13px; }.task-details { display: block; max-width: 470px; margin-top: 3px; overflow: hidden; color: #805878; font-size: 11px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
        .dark-mode { background: linear-gradient(120deg, #351536 0%, #55204f 48%, #211629 100%); color: #fff4e9; }.dark-mode .todo-header { background: #211629; border-color: #ffd4ec; }.dark-mode .brand-mark { color: #fff4e9; }.dark-mode .menu-label, .dark-mode .list-link { color: #ffd4ec; }.dark-mode .menu-item { color: #f5c5e2; }.dark-mode .menu-item.active { color: #fff4e9; background: #6d2f66; box-shadow-color: #130d19; }.dark-mode .menu-item b { background: #f653bf; color: #241923; }.dark-mode .notebook-shadow { background: #120d18; }.dark-mode .notebook-paper { background: #2a1b2b; border-color: #ffd4ec; box-shadow: inset 0 0 0 3px #74396d; }.dark-mode .notebook-paper:before { border-color: #713c69; }.dark-mode .paper-top h1, .dark-mode .task-toolbar h2 { color: #fff4e9; }.dark-mode .paper-subtitle, .dark-mode .task-copy p, .dark-mode .task-details, .dark-mode .empty-state { color: #e7aed3; }.dark-mode .progress-strip { background: #4d2349; border-color: #e95db8; }.dark-mode .progress-strip p { color: #ffe5f4; }.dark-mode .progress-strip button { color: #ff9ad9; }.dark-mode .task-toolbar { border-color: #713c69; }.dark-mode .search-field, .dark-mode .notebook-check { background: #211629; border-color: #ffd4ec; }.dark-mode .search-field input { color: #fff4e9; }.dark-mode .search-field span { border-color: #ffd4ec; }.dark-mode .search-field span:after { border-color: #ffd4ec; }.dark-mode .task-card { border-color: #63345f; }.dark-mode .task-card:hover { background: rgba(255, 255, 255, .06); }.dark-mode .task-copy h3 { color: #fff4e9; }.dark-mode .category-dot { border-color: #ffd4ec; }.dark-mode .task-copy small { border-color: #b96eac; }.dark-mode .delete-task { color: #ffacd9; }.dark-mode .task-modal { color: #fff4e9; background: #2a1b2b; border-color: #ffd4ec; box-shadow-color: #130d19; }.dark-mode .task-modal input, .dark-mode .task-modal select, .dark-mode .task-modal textarea { color: #fff4e9; background: #211629; border-color: #ffd4ec; }.dark-mode .theme-button { background: #5d2f5b; }.dark-mode .theme-button:before { left: auto; right: 7px; background: #fff4e9; }.dark-mode .theme-knob { background: #f653bf; transform: translateX(0); }.dark-mode .icon-button { background: #2a1b2b; border-color: #ffd4ec; }.dark-mode .bell-icon { border-color: #ffd4ec; }
        .toast { position: fixed; z-index: 8; right: 22px; bottom: 22px; width: min(390px, calc(100% - 44px)); min-height: 58px; display: flex; align-items: center; gap: 11px; padding: 10px 11px; border: 3px solid #241923; box-shadow: 5px 5px 0 #79357a; background: #fff4e9; animation: toast-in .24s ease-out; }.toast-symbol { width: 28px; height: 28px; flex: none; display: grid; place-items: center; border: 2px solid #241923; border-radius: 50%; font-weight: 900; }.toast p { margin: 0; flex: 1; font-size: 12px; font-weight: 700; line-height: 1.3; }.toast button { width: 25px; height: 25px; border: 0; background: transparent; color: #67355f; font-size: 16px; font-weight: 800; }.toast-success .toast-symbol { background: #b7eee1; }.toast-neutral .toast-symbol { background: #f9dc52; }.toast-danger .toast-symbol { background: #ffc4e6; }.dark-mode .toast { background: #2a1b2b; color: #fff4e9; border-color: #ffd4ec; box-shadow-color: #130d19; }.dark-mode .toast button { color: #ffd4ec; }.dark-mode .toast-symbol { border-color: #ffd4ec; color: #241923; } @keyframes toast-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 760px) { .todo-header { height: 65px; padding-inline: 18px; }.brand-mark img { height: 48px; width: 61px; }.brand-mark { font-size: 21px; }.workspace { width: min(100% - 24px, 560px); display: block; padding-top: 20px; }.side-menu { padding: 0 0 18px; display: flex; gap: 6px; overflow-x: auto; }.side-menu .menu-label, .lists-block { display: none; }.menu-item { width: auto; white-space: nowrap; padding: 8px 10px; font-size: 12px; }.notebook { padding: 27px 0 0 12px; }.notebook-paper { min-height: 570px; padding: 54px 19px 38px; }.notebook-paper:before { inset: 38px 11px 16px; }.rings { left: 4%; }.rings i { width: 24px; height: 59px; border-width: 3px; box-shadow: 7px 17px 0 -2px #5b5158; }.paper-top h1 { font-size: 33px; }.paper-top { gap: 8px; }.paper-subtitle { font-size: 12px; }.add-button { padding: 9px; font-size: 0; }.add-button span { margin: 0; font-size: 20px; }.progress-strip { margin-block: 20px; padding: 9px; }.progress-strip p, .progress-strip button { font-size: 11px; }.task-toolbar h2 { font-size: 19px; }.search-field input { width: 92px; }.task-card { gap: 9px; }.task-copy h3 { font-size: 12px; }.task-priority { display: none; }.notebook-shadow { inset: 40px -7px -12px 22px; }.paper-doodles { display: none; } }
      `}</style>
    </main>
  );
}

/*

import { FormEvent, useMemo, useState } from "react";

type Priority = "Alta" | "Média" | "Baixa";
type Task = { id: number; title: string; category: string; due: string; priority: Priority; done: boolean };

const initialTasks: Task[] = [
  { id: 1, title: "Finalizar apresentação do projeto", category: "Trabalho", due: "Hoje, 14:00", priority: "Alta", done: false },
  { id: 2, title: "Responder e-mails importantes", category: "Trabalho", due: "Hoje, 16:30", priority: "Média", done: false },
  { id: 3, title: "Comprar ingredientes para o jantar", category: "Pessoal", due: "Hoje, 18:00", priority: "Baixa", done: false },
  { id: 4, title: "Revisar planejamento da semana", category: "Pessoal", due: "Amanhã, 09:00", priority: "Média", done: false },
  { id: 5, title: "Agendar consulta médica", category: "Saúde", due: "Amanhã, 11:00", priority: "Alta", done: true },
];

const priorityStyles: Record<Priority, string> = {
  Alta: "bg-red-50 text-red-500", Média: "bg-amber-50 text-amber-600", Baixa: "bg-emerald-50 text-emerald-600",
};

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState("Hoje");
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("Você tem 3 tarefas para concluir hoje.");

  const openTasks = tasks.filter((task) => !task.done);
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchQuery = task.title.toLowerCase().includes(query.toLowerCase());
    if (filter === "Concluídas") return task.done && matchQuery;
    if (filter === "Todas") return matchQuery;
    if (filter === "Próximos 7 dias") return matchQuery;
    return task.due.startsWith("Hoje") && matchQuery;
  }), [tasks, filter, query]);

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    if (!title) return;
    const date = String(data.get("date") || "Hoje");
    const time = String(data.get("time") || "09:00");
    setTasks((current) => [{ id: Date.now(), title, category: String(data.get("category") || "Pessoal"), due: `${date}, ${time}`, priority: String(data.get("priority") || "Média") as Priority, done: false }, ...current]);
    setNotice("Nova tarefa adicionada à sua lista.");
    setShowModal(false);
  }

  return (
    <main className="min-h-screen bg-[#f8f8fb]">
      <header className="border-b border-[#eceaf2] bg-white px-5 py-4 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#7061f4] text-xl text-white">✓</div><span className="text-xl font-bold tracking-tight">Todo<span className="text-[#7061f4]">LIST</span></span></div>
          <div className="flex items-center gap-3"><button className="relative grid h-10 w-10 place-items-center rounded-full text-lg text-[#5f5b70] hover:bg-[#f4f2ff]" aria-label="Notificações">♢<span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#ff6b6b]" /></button><div className="grid h-10 w-10 place-items-center rounded-full bg-[#dcd8ff] font-bold text-[#5245c6]">EM</div></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-10 lg:grid-cols-[205px_1fr]">
        <aside className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
          {["Hoje", "Próximos 7 dias", "Todas", "Concluídas"].map((item, i) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-xl px-4 py-3 text-left text-sm font-medium transition lg:flex lg:w-full lg:items-center lg:justify-between ${filter === item ? "bg-[#eeecff] text-[#5b4ee1]" : "text-[#6a6679] hover:bg-white"}`}><span>{["☀", "□", "☷", "✓"][i]} &nbsp;{item}</span>{item === "Hoje" && <span className="rounded-full bg-white px-2 py-0.5 text-xs">{openTasks.filter(t => t.due.startsWith("Hoje")).length}</span>}</button>)}
          <div className="hidden pt-7 lg:block"><p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#aaa6b6]">Listas</p>{["Trabalho", "Pessoal", "Saúde"].map((list, i) => <button key={list} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-[#6a6679] hover:bg-white"><span className={["bg-[#7061f4]", "bg-[#ff9f66]", "bg-[#5fc9b5]"][i] + " h-2.5 w-2.5 rounded-full"} />{list}</button>)}</div>
        </aside>

        <section>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-sm text-[#8a8698]">Quarta-feira, 26 de agosto</p><h1 className="text-3xl font-bold tracking-tight">Bom dia, Ellen! <span>☀️</span></h1></div><button onClick={() => setShowModal(true)} className="rounded-xl bg-[#7061f4] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(112,97,244,.25)] transition hover:bg-[#5d50d9]">+ &nbsp;Nova tarefa</button></div>
          <div className="mb-7 flex items-center gap-4 rounded-2xl border border-[#eeeaff] bg-[#f4f2ff] px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg">✦</span><p className="flex-1 text-sm text-[#514b6a]">{notice}</p><button onClick={() => setNotice("Lembretes atualizados. Tudo em dia!")} className="text-sm font-semibold text-[#6456e6]">Ver agenda</button></div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{filter === "Hoje" ? "Tarefas de hoje" : filter}</h2><label className="relative"><span className="absolute left-3 top-2.5 text-[#aaa6b6]">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarefa" className="w-48 rounded-xl border border-[#e7e4ec] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#7061f4]" /></label></div>
          <div className="space-y-3">{visibleTasks.map((task) => <article key={task.id} className={`flex items-center gap-4 rounded-2xl border bg-white px-4 py-4 shadow-sm transition ${task.done ? "border-transparent opacity-60" : "border-[#eceaf1] hover:border-[#d8d2ff]"}`}><input className="check" type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} aria-label={`Concluir ${task.title}`} /><div className="min-w-0 flex-1"><h3 className={`font-semibold ${task.done ? "text-[#8f8b99] line-through" : "text-[#302d3f]"}`}>{task.title}</h3><p className="mt-1 text-sm text-[#908c9b]">{task.category} <span className="mx-1">•</span> {task.due}</p></div><span className={`hidden rounded-lg px-3 py-1.5 text-xs font-semibold sm:inline ${priorityStyles[task.priority]}`}>{task.priority}</span><button onClick={() => setTasks(c => c.filter(t => t.id !== task.id))} className="text-[#b7b3c0] hover:text-red-400" aria-label="Excluir tarefa">×</button></article>)}{visibleTasks.length === 0 && <div className="rounded-2xl border border-dashed border-[#dcd8e7] p-10 text-center text-[#8a8698]">Nenhuma tarefa encontrada.</div>}</div>
        </section>
      </div>

      {showModal && <div className="fixed inset-0 z-10 grid place-items-center bg-[#242035]/35 p-5"><form onSubmit={addTask} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">Nova tarefa</h2><button type="button" onClick={() => setShowModal(false)} className="text-2xl text-[#8f8b99]">×</button></div><label className="mb-4 block text-sm font-medium">O que você precisa fazer?<input name="title" required autoFocus placeholder="Ex.: Preparar relatório" className="mt-2 w-full rounded-xl border border-[#e5e1eb] px-3 py-3 outline-none focus:border-[#7061f4]" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Lista<select name="category" className="mt-2 w-full rounded-xl border border-[#e5e1eb] bg-white px-3 py-3"><option>Trabalho</option><option>Pessoal</option><option>Saúde</option></select></label><label className="text-sm font-medium">Prioridade<select name="priority" className="mt-2 w-full rounded-xl border border-[#e5e1eb] bg-white px-3 py-3"><option>Média</option><option>Alta</option><option>Baixa</option></select></label><label className="text-sm font-medium">Quando<select name="date" className="mt-2 w-full rounded-xl border border-[#e5e1eb] bg-white px-3 py-3"><option>Hoje</option><option>Amanhã</option></select></label><label className="text-sm font-medium">Horário<input name="time" type="time" defaultValue="09:00" className="mt-2 w-full rounded-xl border border-[#e5e1eb] px-3 py-3" /></label></div><button className="mt-6 w-full rounded-xl bg-[#7061f4] py-3 font-semibold text-white hover:bg-[#5d50d9]">Adicionar tarefa</button></form></div>}
    </main>
  );
}

*/
