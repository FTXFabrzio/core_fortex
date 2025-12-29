"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase/client";
import {
  create as createDailyTask,
  listByOwnerAndRange as listDailyTasksByRange,
  remove as removeDailyTask,
} from "../repo/dailyTask.repo";
import type { DailyTaskKind, daily_task } from "../types/db";
import styles from "./calendarPanel.module.css";

const WEEK_DAYS = ["Lu", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const KIND_OPTIONS: { value: DailyTaskKind; label: string }[] = [
  { value: "MEETING", label: "Reunion" },
  { value: "PERSONAL", label: "Personal" },
  { value: "HEALTH", label: "Salud" },
  { value: "FOCUS", label: "Focus" },
  { value: "OTHER", label: "Otro" },
];

const padNumber = (value: number) => String(value).padStart(2, "0");

const toLocalInputValue = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate()
  )}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

const formatTime = (date: Date) =>
  date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const formatSeconds = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

type DailyTaskForm = {
  title: string;
  notes: string;
  startAt: string;
  endAt: string;
  kind: DailyTaskKind;
};

type PomodoroTimer = {
  id: "pomodoro" | "short" | "long";
  label: string;
  duration: number;
  remaining: number;
  running: boolean;
  tone: "default" | "teal" | "blue";
};

export default function CalendarPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [panelMode, setPanelMode] = useState<"calendar" | "pomodoro">("calendar");
  const [timers, setTimers] = useState<PomodoroTimer[]>([
    {
      id: "pomodoro",
      label: "Pomodoro",
      duration: 25 * 60,
      remaining: 25 * 60,
      running: false,
      tone: "default",
    },
    {
      id: "short",
      label: "Descanso Corto",
      duration: 5 * 60,
      remaining: 5 * 60,
      running: false,
      tone: "teal",
    },
    {
      id: "long",
      label: "Descanso Corto",
      duration: 15 * 60,
      remaining: 15 * 60,
      running: false,
      tone: "blue",
    },
  ]);
  const [tasks, setTasks] = useState<daily_task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DailyTaskForm>({
    title: "",
    notes: "",
    startAt: "",
    endAt: "",
    kind: "MEETING",
  });

  const selectedLabel = useMemo(
    () => formatDateLabel(selectedDate),
    [selectedDate]
  );
  const monthLabel = useMemo(
    () => formatMonthLabel(currentMonth),
    [currentMonth]
  );

  const hasRunningTimer = timers.some((timer) => timer.running);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalSlots = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    return Array.from({ length: totalSlots }, (_, index) => {
      const dayNumber = index - startOffset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return null;
      }
      return new Date(year, month, dayNumber);
    });
  }, [currentMonth]);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user.id ?? null);
    };
    loadSession();
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      if (!userId) {
        return;
      }

      setLoading(true);
      setError(null);
      const startOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23,
        59,
        59,
        999
      );

      const { data, error: listError } = await listDailyTasksByRange(
        userId,
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      if (listError) {
        setError(listError.message);
      } else {
        setTasks((data ?? []).sort((left, right) => {
          return new Date(left.start_at).getTime() - new Date(right.start_at).getTime();
        }));
      }

      setLoading(false);
    };

    loadTasks();
  }, [selectedDate, userId]);

  useEffect(() => {
    if (!hasRunningTimer) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimers((prev) =>
        prev.map((timer) => {
          if (!timer.running) {
            return timer;
          }
          const nextRemaining = Math.max(timer.remaining - 1, 0);
          return {
            ...timer,
            remaining: nextRemaining,
            running: nextRemaining === 0 ? false : timer.running,
          };
        })
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [hasRunningTimer]);

  const handleSelectDay = (date: Date | null) => {
    if (!date) {
      return;
    }
    setSelectedDate(date);
  };

  const handleChangeMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const nextMonth =
        direction === "prev"
          ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
          : new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      setSelectedDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1));
      return nextMonth;
    });
  };

  const handleToggleTimer = (timerId: PomodoroTimer["id"]) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== timerId) {
          return timer;
        }
        if (timer.running) {
          return { ...timer, running: false };
        }
        return {
          ...timer,
          running: true,
          remaining: timer.remaining === 0 ? timer.duration : timer.remaining,
        };
      })
    );
  };

  const openCreateModal = (date: Date) => {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(10, 0, 0, 0);
    setForm({
      title: "",
      notes: "",
      startAt: toLocalInputValue(start),
      endAt: toLocalInputValue(end),
      kind: "MEETING",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleCreateTask = async () => {
    if (!userId) {
      return;
    }

    if (!form.title.trim()) {
      setFormError("El titulo es requerido.");
      return;
    }

    const start = new Date(form.startAt);
    const end = new Date(form.endAt);
    if (!form.startAt || !form.endAt || Number.isNaN(start.getTime())) {
      setFormError("Completa el inicio y fin.");
      return;
    }
    if (end <= start) {
      setFormError("El fin debe ser mayor al inicio.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const { data: newTask, error: createError } = await createDailyTask({
      owner_user_id: userId,
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      kind: form.kind,
    });

    if (createError) {
      setFormError(createError.message);
    } else if (newTask) {
      setTasks((prev) =>
        [...prev, newTask].sort(
          (left, right) =>
            new Date(left.start_at).getTime() - new Date(right.start_at).getTime()
        )
      );
      setModalOpen(false);
    }
    setSaving(false);
  };

  const handleDelete = async (taskId: string) => {
    const { error: deleteError } = await removeDailyTask(taskId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>
            {panelMode === "calendar" ? "Calendario" : "Pomodoro Timer"}
          </h2>
          {panelMode === "calendar" ? (
            <p className={styles.panelDate}>{selectedLabel}</p>
          ) : null}
        </div>
        <div className={styles.panelActions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={
              panelMode === "calendar"
                ? "Cambiar a Pomodoro"
                : "Volver al calendario"
            }
            onClick={() =>
              setPanelMode((prev) => (prev === "calendar" ? "pomodoro" : "calendar"))
            }
          >
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
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M6 6l6 6l-6 6" />
              <path d="M17 5v13" />
            </svg>
          </button>
        </div>
      </div>

      {panelMode === "calendar" ? (
        <>
          <div className={styles.calendarCard}>
            <div className={styles.monthHeader}>
              <span className={styles.monthTitle}>{monthLabel}</span>
              <div className={styles.monthControls}>
                <button
                  type="button"
                  className={styles.monthButton}
                  onClick={() => handleChangeMonth("prev")}
                  aria-label="Mes anterior"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  type="button"
                  className={styles.monthButton}
                  onClick={() => handleChangeMonth("next")}
                  aria-label="Mes siguiente"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
            <div className={styles.weekHeader}>
              {WEEK_DAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className={styles.daysGrid}>
              {calendarDays.map((date, index) => {
                if (!date) {
                  return (
                    <span
                      key={`empty-${index}`}
                      className={styles.dayButtonMuted}
                      aria-hidden="true"
                    ></span>
                  );
                }

                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={`${styles.dayButton} ${
                      isSelected ? styles.dayButtonSelected : ""
                    } ${isToday && !isSelected ? styles.dayButtonToday : ""}`}
                    onClick={() => handleSelectDay(date)}
                    onDoubleClick={() => openCreateModal(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.taskSection}>
            {error ? <span className={styles.error}>{error}</span> : null}
            {loading ? (
              <span className={styles.muted}>Cargando tareas...</span>
            ) : tasks.length === 0 ? (
              <span className={styles.empty}>Sin tareas para este dia.</span>
            ) : (
              <div className={styles.taskList}>
                {tasks.map((task) => {
                  const start = new Date(task.start_at);
                  const end = new Date(task.end_at);
                  return (
                    <div key={task.id} className={styles.taskItem}>
                      <div className={styles.taskIcon}>
                        <span className="material-symbols-outlined">event</span>
                      </div>
                      <div>
                        <p className={styles.taskTitle}>{task.title}</p>
                        <span className={styles.taskTime}>
                          {formatTime(start)} - {formatTime(end)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDelete(task.id)}
                        aria-label="Eliminar tarea"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.pomodoro}>
          {timers.map((timer) => {
            const toneClass =
              timer.tone === "teal"
                ? styles.pomodoroTeal
                : timer.tone === "blue"
                ? styles.pomodoroBlue
                : "";
            return (
              <div key={timer.id} className={styles.pomodoroBlock}>
                <span className={styles.pomodoroLabel}>{timer.label}</span>
                <span className={styles.pomodoroTime}>
                  {formatSeconds(timer.remaining)}
                </span>
                <button
                  type="button"
                  className={`${styles.pomodoroButton} ${toneClass}`}
                  onClick={() => handleToggleTimer(timer.id)}
                >
                  {timer.running ? "DETENER" : "INICIAR"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Nueva tarea</h3>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.form}>
              <label className={styles.label}>
                Titulo de tarea
                <input
                  className={styles.input}
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Titulo"
                />
              </label>
              <div className={styles.formRow}>
                <label className={styles.label}>
                  Inicio
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, startAt: event.target.value }))
                    }
                  />
                </label>
                <label className={styles.label}>
                  Fin
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, endAt: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className={styles.label}>
                Categoria
                <select
                  className={styles.select}
                  value={form.kind}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      kind: event.target.value as DailyTaskKind,
                    }))
                  }
                >
                  {KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Descripcion
                <textarea
                  className={styles.textarea}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </label>
              {formError ? <span className={styles.error}>{formError}</span> : null}
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleCreateTask}
                disabled={saving}
              >
                {saving ? "Creando..." : "Crear tarea"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
