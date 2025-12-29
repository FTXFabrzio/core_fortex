"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase/client";
import { listByOwner as listProjectsByOwner } from "../../repo/project.repo";
import { listByOwner as listDomainsByOwner } from "../../repo/domain.repo";
import { listByProject as listEpicsByProject } from "../../repo/epic.repo";
import {
  create as createStory,
  listByProject as listStoriesByProject,
} from "../../repo/story.repo";
import {
  create as createTask,
  listByStory as listTasksByStory,
  remove as removeTask,
  update as updateTask,
} from "../../repo/task.repo";
import type { core_domain, core_project, epic, story, task } from "../../types/db";
import styles from "./home.module.css";

const TASK_STATUSES = [
  { value: "ICEBOX", label: "Icebox" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "DISCUSSION", label: "Discusion" },
  { value: "DONE", label: "Hecho" },
] as const;

const DOMAIN_NONE = "none";

type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

const DEFAULT_USER_STORY =
  "Como [rol del usuario],\nquiero [que necesita hacer],\npara [que problema resuelve].";
const DEFAULT_ACCEPTANCE_CRITERIA =
  "- Se considera completado cuando:\n  - [condicion 1]\n  - [condicion 2]\n  - [condicion 3]";

const getBracketValues = (value: string) => {
  const bracketRegex = /\[([^\]]*)\]/g;
  return Array.from(value.matchAll(bracketRegex), (match) => match[1]);
};

const applyBracketValues = (template: string, values: string[]) => {
  let index = 0;
  const bracketRegex = /\[([^\]]*)\]/g;
  return template.replace(bracketRegex, () => `[${values[index++] ?? ""}]`);
};

const toLocalInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

const enforceTemplateEdit = (template: string, nextValue: string, fallback: string) => {
  const expectedCount = getBracketValues(template).length;
  const nextValues = getBracketValues(nextValue);
  if (nextValues.length !== expectedCount) {
    return fallback;
  }
  return applyBracketValues(template, nextValues);
};

const CirclePlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
    <path d="M9 12h6" />
    <path d="M12 9v6" />
  </svg>
);

const BrowserMaximizeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 8h8" />
    <path d="M20 11.5v6.5a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h6.5" />
    <path d="M8 4v4" />
    <path d="M16 8l5 -5" />
    <path d="M21 7.5v-4.5h-4.5" />
  </svg>
);

const ChevronsDownIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M7 7l5 5l5 -5" />
    <path d="M7 13l5 5l5 -5" />
  </svg>
);

type StoryForm = {
  title: string;
  epic_id: string;
  user_story: string;
  acceptance_criteria: string;
  priority: string;
};

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [projects, setProjects] = useState<core_project[]>([]);
  const [domains, setDomains] = useState<core_domain[]>([]);
  const [epics, setEpics] = useState<epic[]>([]);
  const [stories, setStories] = useState<story[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storyPickerOpen, setStoryPickerOpen] = useState(false);
  const [storySearch, setStorySearch] = useState("");
  const [tasks, setTasks] = useState<task[]>([]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<task | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    end_at: "",
    status: "ICEBOX" as TaskStatus,
  });
  const [taskDetailForm, setTaskDetailForm] = useState({
    title: "",
    description: "",
    end_at: "",
  });
  const [storyFormOpen, setStoryFormOpen] = useState(false);
  const [storyForm, setStoryForm] = useState<StoryForm>({
    title: "",
    epic_id: "",
    user_story: DEFAULT_USER_STORY,
    acceptance_criteria: DEFAULT_ACCEPTANCE_CRITERIA,
    priority: "3",
  });
  const [creatingStory, setCreatingStory] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const autosizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) {
      return;
    }
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  const filteredProjects = useMemo(() => {
    if (!selectedDomainId) {
      return [];
    }
    if (selectedDomainId === DOMAIN_NONE) {
      return projects.filter((project) => !project.domain_id);
    }
    return projects.filter((project) => project.domain_id === selectedDomainId);
  }, [projects, selectedDomainId]);

  const selectedStory = stories.find((item) => item.id === selectedStoryId) ?? null;

  const epicMap = useMemo(() => {
    return epics.reduce<Record<string, epic>>((acc, epicItem) => {
      acc[epicItem.id] = epicItem;
      return acc;
    }, {});
  }, [epics]);

  const storySearchLower = storySearch.trim().toLowerCase();
  const filteredStories = storySearchLower
    ? stories.filter(
        (item) =>
          item.title.toLowerCase().includes(storySearchLower) ||
          item.user_story.toLowerCase().includes(storySearchLower)
      )
    : stories;

  const loadInitialData = async (ownerUserId: string) => {
    const [projectsResponse, domainsResponse] = await Promise.all([
      listProjectsByOwner(ownerUserId),
      listDomainsByOwner(ownerUserId),
    ]);

    if (projectsResponse.error) {
      setError(projectsResponse.error.message);
      return;
    }

    if (domainsResponse.error) {
      setError(domainsResponse.error.message);
      return;
    }

    const projectList = projectsResponse.data ?? [];
    setProjects(projectList);
    setDomains(domainsResponse.data ?? []);

    const lastProjectId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("core2:lastProjectId")
        : null;
    const defaultProject =
      projectList.find((item) => item.id === lastProjectId) ??
      projectList[0] ??
      null;

    if (defaultProject?.domain_id) {
      setSelectedDomainId(defaultProject.domain_id);
    } else if (defaultProject) {
      setSelectedDomainId(DOMAIN_NONE);
    } else {
      setSelectedDomainId("");
    }

    setSelectedProjectId(defaultProject?.id ?? "");
  };

  const loadProjectDetails = async (projectId: string) => {
    if (!projectId) {
      setEpics([]);
      setStories([]);
      return;
    }

    const [epicsResponse, storiesResponse] = await Promise.all([
      listEpicsByProject(projectId),
      listStoriesByProject(projectId),
    ]);

    if (epicsResponse.error) {
      setError(epicsResponse.error.message);
    } else {
      setEpics(epicsResponse.data ?? []);
    }

    if (storiesResponse.error) {
      setError(storiesResponse.error.message);
    } else {
      setStories(storiesResponse.data ?? []);
    }
  };

  const loadStoryTasks = async (storyId: string) => {
    if (!storyId) {
      setTasks([]);
      return;
    }

    const { data, error: tasksError } = await listTasksByStory(storyId);
    if (tasksError) {
      setError(tasksError.message);
    } else {
      setTasks(data ?? []);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (!data.session) {
        router.push("/");
        return;
      }

      setSession(data.session);
      await loadInitialData(data.session.user.id);
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!currentSession) {
          router.push("/");
          return;
        }
        setSession(currentSession);
        loadInitialData(currentSession.user.id);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetails(selectedProjectId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("core2:lastProjectId", selectedProjectId);
      }
    }
    setSelectedStoryId("");
    setTasks([]);
    setStorySearch("");
    setStoryPickerOpen(false);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedStoryId) {
      setTasks([]);
      return;
    }
    loadStoryTasks(selectedStoryId);
    setTaskDetailOpen(false);
    setSelectedTask(null);
  }, [selectedStoryId]);

  const tasksByStatus = useMemo(() => {
    return TASK_STATUSES.reduce<Record<string, task[]>>((acc, status) => {
      acc[status.value] = tasks.filter((item) => item.status === status.value);
      return acc;
    }, {});
  }, [tasks]);

  const handleDropTask = async (status: TaskStatus, taskId: string | null) => {
    if (!taskId) {
      return;
    }
    setError(null);
    const taskItem = tasks.find((item) => item.id === taskId);
    if (!taskItem || taskItem.status === status) {
      return;
    }

    const { data: updatedTask, error: updateError } = await updateTask(taskItem.id, {
      status,
    });

    if (updateError) {
      setError(updateError.message);
    } else if (updatedTask) {
      setTasks((prev) =>
        prev.map((item) => (item.id === taskItem.id ? updatedTask : item))
      );
    }

    setDraggingTaskId(null);
  };

  const openTaskModal = (status: TaskStatus) => {
    setTaskForm({
      title: "",
      description: "",
      end_at: "",
      status,
    });
    setTaskModalOpen(true);
  };

  const openTaskDetail = (taskItem: task) => {
    setSelectedTask(taskItem);
    setTaskDetailForm({
      title: taskItem.title,
      description: taskItem.acceptance_note ?? "",
      end_at: taskItem.end_at ? toLocalInputValue(new Date(taskItem.end_at)) : "",
    });
    setTaskDetailOpen(true);
  };

  const handleCreateTask = async () => {
    if (!selectedStoryId) {
      setError("Selecciona una historia de usuario.");
      return;
    }

    if (!taskForm.title.trim()) {
      setError("El titulo de la tarea es requerido.");
      return;
    }

    if (!taskForm.end_at) {
      setError("La fecha fin es requerida.");
      return;
    }

    const endAt = new Date(taskForm.end_at);
    if (Number.isNaN(endAt.getTime())) {
      setError("La fecha fin no es valida.");
      return;
    }

    setError(null);
    setCreatingTask(true);
    const nextOrderNo =
      tasks.length === 0 ? 1 : Math.max(...tasks.map((item) => item.order_no)) + 1;
    const { data: newTask, error: createError } = await createTask({
      story_id: selectedStoryId,
      title: taskForm.title.trim(),
      acceptance_note: taskForm.description.trim() || null,
      status: taskForm.status,
      start_at: null,
      end_at: endAt.toISOString(),
      order_no: nextOrderNo,
    });

    if (createError) {
      setError(createError.message);
    } else if (newTask) {
      setTasks((prev) => [...prev, newTask]);
      setTaskModalOpen(false);
    }

    setCreatingTask(false);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) {
      return;
    }

    if (!taskDetailForm.title.trim()) {
      setError("El titulo de la tarea es requerido.");
      return;
    }

    if (!taskDetailForm.end_at) {
      setError("La fecha fin es requerida.");
      return;
    }

    const endAt = new Date(taskDetailForm.end_at);
    if (Number.isNaN(endAt.getTime())) {
      setError("La fecha fin no es valida.");
      return;
    }

    setError(null);
    setSavingTask(true);
    const { data: updatedTask, error: updateError } = await updateTask(selectedTask.id, {
      title: taskDetailForm.title.trim(),
      acceptance_note: taskDetailForm.description.trim() || null,
      end_at: endAt.toISOString(),
    });

    if (updateError) {
      setError(updateError.message);
    } else if (updatedTask) {
      setTasks((prev) =>
        prev.map((item) => (item.id === selectedTask.id ? updatedTask : item))
      );
      setSelectedTask(updatedTask);
      setTaskDetailOpen(false);
    }

    setSavingTask(false);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) {
      return;
    }

    setError(null);
    setDeletingTask(true);
    const { error: deleteError } = await removeTask(selectedTask.id);
    if (deleteError) {
      setError(deleteError.message);
      setDeletingTask(false);
      return;
    }

    setTasks((prev) => prev.filter((item) => item.id !== selectedTask.id));
    setSelectedTask(null);
    setTaskDetailOpen(false);
    setDeletingTask(false);
  };

  const handleSelectStory = (storyId: string) => {
    setSelectedStoryId(storyId);
    setStoryPickerOpen(false);
    setStorySearch("");
  };

  const handleCreateStory = async () => {
    if (!selectedProjectId) {
      setError("Selecciona un proyecto.");
      return;
    }

    if (!storyForm.title.trim() || !storyForm.user_story.trim()) {
      setError("Titulo e historia son requeridos.");
      return;
    }

    const priorityValue = Number(storyForm.priority);
    if (!Number.isFinite(priorityValue) || priorityValue < 1 || priorityValue > 5) {
      setError("La prioridad debe estar entre 1 y 5.");
      return;
    }

    setError(null);
    setCreatingStory(true);
    const { data: newStory, error: createError } = await createStory({
      project_id: selectedProjectId,
      epic_id: storyForm.epic_id || null,
      title: storyForm.title.trim(),
      user_story: storyForm.user_story.trim(),
      acceptance_criteria: storyForm.acceptance_criteria.trim() || "",
      status: "INICIO",
      priority: priorityValue,
    });

    if (createError) {
      setError(createError.message);
    } else if (newStory) {
      setStories((prev) => [newStory, ...prev]);
      setStoryForm({
        title: "",
        epic_id: "",
        user_story: DEFAULT_USER_STORY,
        acceptance_criteria: DEFAULT_ACCEPTANCE_CRITERIA,
        priority: "3",
      });
      setStoryFormOpen(false);
    }

    setCreatingStory(false);
  };

  if (loading) {
    return <div className={styles.loading}>Cargando...</div>;
  }

  if (!session) {
    return <div className={styles.loading}>Login requerido.</div>;
  }

  return (
    <AppShell title="Inicio" showCalendar>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.headerRow}>
        <div>
          <h2>Proyecto Activo</h2>
          <p>Tablero global y trabajo diario</p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => {
            setStoryForm({
              title: "",
              epic_id: "",
              user_story: DEFAULT_USER_STORY,
              acceptance_criteria: DEFAULT_ACCEPTANCE_CRITERIA,
              priority: "3",
            });
            setStoryFormOpen(true);
          }}
          disabled={!selectedProjectId}
        >
          Nueva Historia
        </button>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.filterField}>
          <div className={styles.selectWrapper}>
            <select
              value={selectedDomainId}
              onChange={(event) => {
                setSelectedDomainId(event.target.value);
                setSelectedProjectId("");
                setSelectedStoryId("");
                setStories([]);
                setEpics([]);
                setTasks([]);
              }}
              className={styles.select}
            >
              <option value="" disabled>
                Seleccionar Dominio
              </option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
              <option value={DOMAIN_NONE}>Sin dominio</option>
            </select>
            <ChevronsDownIcon className={styles.selectIcon} />
          </div>
        </div>
        <div className={styles.filterField}>
          <div className={styles.selectWrapper}>
            <select
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className={styles.select}
              disabled={!selectedDomainId}
            >
              <option value="" disabled>
                Seleccionar Proyecto
              </option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <ChevronsDownIcon className={styles.selectIcon} />
          </div>
        </div>
        <button
          type="button"
          className={styles.storySelect}
          onClick={() => setStoryPickerOpen(true)}
          disabled={!selectedProjectId}
        >
          <span>{selectedStory?.title ?? "Seleccionar Historia de Usuario"}</span>
          <BrowserMaximizeIcon className={styles.storySelectIcon} />
        </button>
      </div>

      {selectedStory ? (
        <div className={styles.kanban}>
          {TASK_STATUSES.map((status) => (
            <div
              key={status.value}
              className={styles.kanbanColumn}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) =>
                handleDropTask(
                  status.value,
                  event.dataTransfer.getData("text/plain") || draggingTaskId
                )
              }
            >
              <div className={styles.columnHeader}>
                <div>
                  <span>{status.label}</span>
                  <span className={styles.columnCount}>
                    {tasksByStatus[status.value]?.length ?? 0}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.columnAction}
                  onClick={() => openTaskModal(status.value)}
                >
                  <CirclePlusIcon />
                </button>
              </div>
              <div className={styles.columnBody}>
                {(tasksByStatus[status.value] ?? []).map((taskItem) => (
                  <div
                    key={taskItem.id}
                    className={styles.taskCard}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", taskItem.id);
                      setDraggingTaskId(taskItem.id);
                    }}
                    onDragEnd={() => setDraggingTaskId(null)}
                    onClick={() => openTaskDetail(taskItem)}
                  >
                    <h4>{taskItem.title}</h4>
                    {taskItem.acceptance_note ? (
                      <p>{taskItem.acceptance_note}</p>
                    ) : null}
                    {taskItem.end_at ? (
                      <div className={styles.taskDate}>
                        <span className="material-symbols-outlined">calendar_month</span>
                        {new Date(taskItem.end_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}
                {(tasksByStatus[status.value] ?? []).length === 0 ? (
                  <span className={styles.emptySmall}>Sin tareas.</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          Selecciona una historia de usuario para ver las tareas.
        </div>
      )}

      {storyPickerOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Ver Historias de Usuario</h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setStoryPickerOpen(false)}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.storyPicker}>
              <div className={styles.searchRow}>
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  value={storySearch}
                  onChange={(event) => setStorySearch(event.target.value)}
                  placeholder="Buscar"
                />
              </div>
              <div className={styles.storyList}>
                {filteredStories.length === 0 ? (
                  <span className={styles.emptySmall}>
                    No hay historias para este proyecto.
                  </span>
                ) : (
                  filteredStories.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.storyItem}
                      onClick={() => handleSelectStory(item.id)}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.epic_id ? epicMap[item.epic_id]?.title : "Sin epica"}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {storyFormOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Nueva Historia</h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setStoryFormOpen(false)}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={styles.modalSection}>
              <label>
                Titulo de la Historia
                <input
                  type="text"
                  value={storyForm.title}
                  onChange={(event) =>
                    setStoryForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Mi nueva historia"
                />
              </label>
              <label>
                Epica (opcional)
                <select
                  value={storyForm.epic_id}
                  onChange={(event) =>
                    setStoryForm((prev) => ({ ...prev, epic_id: event.target.value }))
                  }
                >
                  <option value="">Seleccionar una epica</option>
                  {epics.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Historia del Usuario
                <textarea
                  value={storyForm.user_story}
                  onChange={(event) =>
                    setStoryForm((prev) => ({
                      ...prev,
                      user_story: enforceTemplateEdit(
                        DEFAULT_USER_STORY,
                        event.target.value,
                        prev.user_story
                      ),
                    }))
                  }
                  onInput={(event) => autosizeTextarea(event.currentTarget)}
                  ref={autosizeTextarea}
                />
              </label>
              <label>
                Criterios de aceptacion
                <textarea
                  value={storyForm.acceptance_criteria}
                  onChange={(event) =>
                    setStoryForm((prev) => ({
                      ...prev,
                      acceptance_criteria: enforceTemplateEdit(
                        DEFAULT_ACCEPTANCE_CRITERIA,
                        event.target.value,
                        prev.acceptance_criteria
                      ),
                    }))
                  }
                  onInput={(event) => autosizeTextarea(event.currentTarget)}
                  ref={autosizeTextarea}
                />
              </label>
              <label>
                Prioridad
                <select
                  value={storyForm.priority}
                  onChange={(event) =>
                    setStoryForm((prev) => ({ ...prev, priority: event.target.value }))
                  }
                >
                  <option value="" disabled>
                    Seleccionar del 1 al 5
                  </option>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={String(value)}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setStoryFormOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleCreateStory}
                  disabled={creatingStory}
                >
                  {creatingStory ? "Creando..." : "Crear Historia"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {taskModalOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Nueva historia tarea</h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setTaskModalOpen(false)}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.modalSection}>
              <label>
                Titulo de tarea
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(event) =>
                    setTaskForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Reunion de TaskRecord"
                />
              </label>
              <label>
                Fecha Fin
                <input
                  type="datetime-local"
                  value={taskForm.end_at}
                  onChange={(event) =>
                    setTaskForm((prev) => ({ ...prev, end_at: event.target.value }))
                  }
                />
              </label>
              <label>
                Estado
                <select
                  value={taskForm.status}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      status: event.target.value as TaskStatus,
                    }))
                  }
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Descripcion
                <textarea
                  value={taskForm.description}
                  onChange={(event) =>
                    setTaskForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleCreateTask}
                disabled={creatingTask}
              >
                {creatingTask ? "Creando..." : "Crear tarea"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {taskDetailOpen && selectedTask ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Historia Tarea</h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setTaskDetailOpen(false)}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.modalSection}>
              <label>
                Titulo de tarea
                <input
                  type="text"
                  value={taskDetailForm.title}
                  onChange={(event) =>
                    setTaskDetailForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Fecha Fin
                <input
                  type="datetime-local"
                  value={taskDetailForm.end_at}
                  onChange={(event) =>
                    setTaskDetailForm((prev) => ({ ...prev, end_at: event.target.value }))
                  }
                />
              </label>
              <label>
                Descripcion
                <textarea
                  value={taskDetailForm.description}
                  onChange={(event) =>
                    setTaskDetailForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.darkButton}
                  onClick={handleUpdateTask}
                  disabled={savingTask}
                >
                  {savingTask ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={handleDeleteTask}
                  disabled={deletingTask}
                >
                  {deletingTask ? "Eliminando..." : "Eliminar Tarea"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
