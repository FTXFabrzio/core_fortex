"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import AppShell from "../../../components/AppShell";
import { supabase } from "../../../lib/supabase/client";
import { getById as getProject } from "../../../repo/project.repo";
import {
  create as createCore2,
  listByProject as listCore2ByProject,
  update as updateCore2,
} from "../../../repo/core2.repo";
import {
  create as createEpic,
  listByProject as listEpicsByProject,
  remove as removeEpic,
} from "../../../repo/epic.repo";
import {
  listByEpic as listStoriesByEpic,
  listByProject as listStoriesByProject,
  remove as removeStory,
} from "../../../repo/story.repo";
import { listByStory as listTasksByStory, remove as removeTask } from "../../../repo/task.repo";
import type { core_project, epic, project_core2, story } from "../../../types/db";
import styles from "./projectDetail.module.css";

type Core2Form = {
  pain_now: string;
  intel_min: string;
  context: string;
  unfreeze: string;
  bet_short: string;
  x1_short: string;
  is_done: boolean;
};

const STORY_STATUS_LABELS: Record<string, string> = {
  INICIO: "Inicio",
  EN_PROGRESO: "En progreso",
  TERMINADO: "Terminado",
  TESTEADO: "Testeado",
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [project, setProject] = useState<core_project | null>(null);
  const [core2, setCore2] = useState<project_core2 | null>(null);
  const [epics, setEpics] = useState<epic[]>([]);
  const [stories, setStories] = useState<story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCore2, setSavingCore2] = useState(false);
  const [core2Message, setCore2Message] = useState<string | null>(null);
  const [epicError, setEpicError] = useState<string | null>(null);
  const [creatingEpic, setCreatingEpic] = useState(false);
  const [epicToDelete, setEpicToDelete] = useState<epic | null>(null);
  const [deletingEpic, setDeletingEpic] = useState(false);
  const [core2Form, setCore2Form] = useState<Core2Form>({
    pain_now: "",
    intel_min: "",
    context: "",
    unfreeze: "",
    bet_short: "",
    x1_short: "",
    is_done: false,
  });
  const [epicForm, setEpicForm] = useState({
    title: "",
    description: "",
  });

  const updateCore2Field = (field: keyof Core2Form, value: string | boolean) => {
    setCore2Message(null);
    setCore2Form((prev) => ({ ...prev, [field]: value }));
  };

  const autosizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) {
      return;
    }
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  const loadProjectData = async (currentProjectId: string) => {
    setError(null);
    setCore2Message(null);

    const projectResponse = await getProject(currentProjectId);
    if (projectResponse.error || !projectResponse.data) {
      setError(projectResponse.error?.message ?? "Proyecto no encontrado.");
      return;
    }

    setProject(projectResponse.data);

    const [core2Response, epicsResponse, storiesResponse] = await Promise.all([
      listCore2ByProject(currentProjectId),
      listEpicsByProject(currentProjectId),
      listStoriesByProject(currentProjectId),
    ]);

    if (core2Response.error) {
      setError(core2Response.error.message);
      return;
    }

    if (epicsResponse.error) {
      setEpicError(epicsResponse.error.message);
    } else {
      setEpics(epicsResponse.data ?? []);
    }

    if (storiesResponse.error) {
      setEpicError(storiesResponse.error.message);
    } else {
      setStories(storiesResponse.data ?? []);
    }

    let core2Row = core2Response.data?.[0] ?? null;
    if (!core2Row) {
      const { data: createdCore2, error: createError } = await createCore2({
        project_id: currentProjectId,
        pain_now: null,
        intel_min: null,
        context: null,
        unfreeze: null,
        bet_short: null,
        x1_short: null,
        is_done: false,
      });

      if (createError) {
        setError(createError.message);
        return;
      }

      core2Row = createdCore2 ?? null;
    }

    if (core2Row) {
      setCore2(core2Row);
      setCore2Form({
        pain_now: core2Row.pain_now ?? "",
        intel_min: core2Row.intel_min ?? "",
        context: core2Row.context ?? "",
        unfreeze: core2Row.unfreeze ?? "",
        bet_short: core2Row.bet_short ?? "",
        x1_short: core2Row.x1_short ?? "",
        is_done: core2Row.is_done,
      });
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
      await loadProjectData(projectId);
      setLoading(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("core2:lastProjectId", projectId);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!currentSession) {
          router.push("/");
          return;
        }
        setSession(currentSession);
        loadProjectData(projectId);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [projectId, router]);

  const storiesByEpic = useMemo(() => {
    const epicIds = new Set(epics.map((item) => item.id));
    return stories.reduce<Record<string, story[]>>((acc, item) => {
      const key = item.epic_id && epicIds.has(item.epic_id) ? item.epic_id : "none";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [stories]);

  const handleCore2Submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCore2Message(null);
    setError(null);

    if (!core2) {
      setError("CORE2 no esta listo.");
      return;
    }

    setSavingCore2(true);
    const { data: updatedCore2, error: updateError } = await updateCore2(core2.id, {
      pain_now: core2Form.pain_now.trim() || null,
      intel_min: core2Form.intel_min.trim() || null,
      context: core2Form.context.trim() || null,
      unfreeze: core2Form.unfreeze.trim() || null,
      bet_short: core2Form.bet_short.trim() || null,
      x1_short: core2Form.x1_short.trim() || null,
      is_done: core2Form.is_done,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setCore2(updatedCore2 ?? core2);
      setCore2Message("Guardado.");
    }

    setSavingCore2(false);
  };

  const handleEpicSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEpicError(null);

    if (!project) {
      setEpicError("Proyecto no disponible.");
      return;
    }

    if (!epicForm.title.trim()) {
      setEpicError("El titulo es requerido.");
      return;
    }

    const nextOrderNo =
      epics.length === 0 ? 1 : Math.max(...epics.map((item) => item.order_no)) + 1;

    setCreatingEpic(true);
    const { data: newEpic, error: createError } = await createEpic({
      project_id: project.id,
      title: epicForm.title.trim(),
      description: epicForm.description.trim() || null,
      order_no: nextOrderNo,
    });

    if (createError) {
      setEpicError(createError.message);
    } else if (newEpic) {
      setEpics((prev) => [...prev, newEpic]);
      setEpicForm({ title: "", description: "" });
    }

    setCreatingEpic(false);
  };

  const handleDeleteEpic = async () => {
    if (!epicToDelete) {
      return;
    }

    setDeletingEpic(true);
    setEpicError(null);

    const { data: epicStories, error: listError } = await listStoriesByEpic(
      epicToDelete.id
    );
    if (listError) {
      setEpicError(listError.message);
      setDeletingEpic(false);
      return;
    }

    for (const storyItem of epicStories ?? []) {
      const { data: storyTasks, error: taskListError } = await listTasksByStory(
        storyItem.id
      );
      if (taskListError) {
        setEpicError(taskListError.message);
        setDeletingEpic(false);
        return;
      }

      for (const taskItem of storyTasks ?? []) {
        const { error: taskDeleteError } = await removeTask(taskItem.id);
        if (taskDeleteError) {
          setEpicError(taskDeleteError.message);
          setDeletingEpic(false);
          return;
        }
      }

      const { error: storyDeleteError } = await removeStory(storyItem.id);
      if (storyDeleteError) {
        setEpicError(storyDeleteError.message);
        setDeletingEpic(false);
        return;
      }
    }

    const { error: deleteError } = await removeEpic(epicToDelete.id);
    if (deleteError) {
      setEpicError(deleteError.message);
      setDeletingEpic(false);
      return;
    }

    setEpics((prev) => prev.filter((item) => item.id !== epicToDelete.id));
    setStories((prev) => prev.filter((item) => item.epic_id !== epicToDelete.id));
    setEpicToDelete(null);
    setDeletingEpic(false);
  };

  if (loading) {
    return <div className={styles.loading}>Cargando...</div>;
  }

  if (!session || !project) {
    return <div className={styles.loading}>Login requerido.</div>;
  }

  return (
    <AppShell title={project.name}>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.projectHeader}>
        <div>
          <h2>{project.name}</h2>
          <p>Analisis de investigacion del proyecto</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Analisis de investigacion del proyecto</h3>
            <p className={styles.muted}>
              ¿Que duele HOY? ¿Que esta mal o genera perdida?
            </p>
          </div>
          <button
            type="button"
            className={`${styles.statusBadge} ${
              core2Form.is_done ? styles.statusDone : styles.statusPending
            }`}
            onClick={() => updateCore2Field("is_done", !core2Form.is_done)}
          >
            <span
              className={`${styles.statusCircle} ${
                core2Form.is_done ? styles.statusCircleOn : styles.statusCircleOff
              }`}
              aria-hidden="true"
            />
            Analisis completado
          </button>
        </div>

        <form className={styles.core2Form} onSubmit={handleCore2Submit}>
          <textarea
            value={core2Form.pain_now}
            placeholder="- ¿Que problema real estas enfrentando?\n- ¿Donde se pierde tiempo, dinero o claridad?\n- ¿Por que importa ahora?"
            onChange={(event) => updateCore2Field("pain_now", event.target.value)}
            onInput={(event) => autosizeTextarea(event.currentTarget)}
            ref={autosizeTextarea}
          />
          <label>
            ¿Que sabes hasta ahora?
            <textarea
              value={core2Form.intel_min}
              placeholder="- Hechos relevantes\n- Aprendizajes clave\n- Suposiciones actuales"
              onChange={(event) => updateCore2Field("intel_min", event.target.value)}
              onInput={(event) => autosizeTextarea(event.currentTarget)}
              ref={autosizeTextarea}
            />
          </label>
          <label>
            ¿En que entorno ocurre esto?
            <textarea
              value={core2Form.context}
              placeholder="- Quien usa el sistema\n- Restricciones reales\n- Que ya existe / que no se puede cambiar"
              onChange={(event) => updateCore2Field("context", event.target.value)}
              onInput={(event) => autosizeTextarea(event.currentTarget)}
              ref={autosizeTextarea}
            />
          </label>
          {project.project_type === "BROWNFIELD" ? (
            <label>
              ¿Que existe hoy y como funciona?
              <textarea
                value={core2Form.unfreeze}
                placeholder="- Que funciona\n- Que esta roto\n- Que no se debe tocar"
                onChange={(event) => updateCore2Field("unfreeze", event.target.value)}
                onInput={(event) => autosizeTextarea(event.currentTarget)}
                ref={autosizeTextarea}
              />
            </label>
          ) : null}
          <label>
            Define el alcance de tu MVP (1-2 lineas)
            <textarea
              value={core2Form.bet_short}
              placeholder="Sintesis de la apuesta actual."
              onChange={(event) => updateCore2Field("bet_short", event.target.value)}
              onInput={(event) => autosizeTextarea(event.currentTarget)}
              ref={autosizeTextarea}
            />
          </label>
          <label>
            Define que vas a excluir por ahora (1-2 lineas)
            <textarea
              value={core2Form.x1_short}
              placeholder="Sintesis del primer movimiento."
              onChange={(event) => updateCore2Field("x1_short", event.target.value)}
              onInput={(event) => autosizeTextarea(event.currentTarget)}
              ref={autosizeTextarea}
            />
          </label>

          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={savingCore2}>
              {savingCore2 ? "Guardando..." : "Guardar"}
            </button>
            {core2Message ? <span className={styles.success}>{core2Message}</span> : null}
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
            <div>
              <h3>Epicas</h3>
              <p className={styles.muted}>Modulos o bloques principales.</p>
            </div>
          </div>

        <form className={styles.epicForm} onSubmit={handleEpicSubmit}>
          <label>
            Titulo de la Epica
            <input
              type="text"
              value={epicForm.title}
              onChange={(event) =>
                setEpicForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Onboarding, Infraestructura, etc."
            />
          </label>
          <label>
            Descripcion (opcional)
            <textarea
              value={epicForm.description}
              onChange={(event) =>
                setEpicForm((prev) => ({ ...prev, description: event.target.value }))
              }
              onInput={(event) => autosizeTextarea(event.currentTarget)}
              ref={autosizeTextarea}
              placeholder="Contexto o alcance breve."
            />
          </label>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={creatingEpic}>
              {creatingEpic ? "Creando..." : "Crear Epica"}
            </button>
            {epicError ? <span className={styles.errorInline}>{epicError}</span> : null}
          </div>
        </form>

        {epics.length === 0 ? (
          <p className={styles.empty}>Aun no hay epicas.</p>
        ) : (
          <div className={styles.epicList}>
            {epics.map((item) => (
              <div key={item.id} className={styles.epicCard}>
                <div className={styles.epicHeader}>
                  <div>
                    <h4>{item.title}</h4>
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                  <div className={styles.epicActions}>
                    <span className={styles.epicMeta}>#{item.order_no}</span>
                    <button
                      type="button"
                      className={styles.trashButton}
                      onClick={() => setEpicToDelete(item)}
                      aria-label="Eliminar epica"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007h16z" />
                        <path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005h4z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className={styles.storyList}>
                  {(storiesByEpic[item.id] ?? []).length === 0 ? (
                    <span className={styles.emptySmall}>Sin historias.</span>
                  ) : (
                    (storiesByEpic[item.id] ?? []).map((storyItem) => (
                      <div key={storyItem.id} className={styles.storyRow}>
                        <span>{storyItem.title}</span>
                        <span className={styles.storyStatus}>
                          {STORY_STATUS_LABELS[storyItem.status] ?? storyItem.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
            {storiesByEpic.none ? (
              <div className={styles.epicCard}>
                <div className={styles.epicHeader}>
                  <div>
                    <h4>Sin Epica</h4>
                    <p>Historias asignadas sin modulo.</p>
                  </div>
                </div>
                <div className={styles.storyList}>
                  {storiesByEpic.none.map((storyItem) => (
                    <div key={storyItem.id} className={styles.storyRow}>
                      <span>{storyItem.title}</span>
                      <span className={styles.storyStatus}>
                        {STORY_STATUS_LABELS[storyItem.status] ?? storyItem.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {epicToDelete ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Eliminar epica</h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setEpicToDelete(null)}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className={styles.modalText}>
              Estas seguro que quieres eliminar una Epica?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setEpicToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleDeleteEpic}
                disabled={deletingEpic}
              >
                {deletingEpic ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
