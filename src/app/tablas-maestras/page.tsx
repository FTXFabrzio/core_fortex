"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase/client";
import {
  create as createDomain,
  listByOwner as listDomainsByOwner,
} from "../../repo/domain.repo";
import { create as createProject, listByOwner as listProjectsByOwner } from "../../repo/project.repo";
import { create as createCore2 } from "../../repo/core2.repo";
import type { core_domain, core_project } from "../../types/db";
import styles from "./tablasMaestras.module.css";

const PROJECT_TYPES = [
  { value: "GREENFIELD", label: "Nuevo" },
  { value: "BROWNFIELD", label: "Existente" },
] as const;

export default function TablasMaestrasPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [domains, setDomains] = useState<core_domain[]>([]);
  const [projects, setProjects] = useState<core_project[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [savingDomain, setSavingDomain] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [domainForm, setDomainForm] = useState({
    name: "",
    code: "",
    color: "",
  });
  const [projectForm, setProjectForm] = useState<{
    name: string;
    domain_id: string;
    project_type: "" | "GREENFIELD" | "BROWNFIELD";
    drive_folder_url: string;
    primary_doc_url: string;
  }>({
    name: "",
    domain_id: "",
    project_type: "",
    drive_folder_url: "",
    primary_doc_url: "",
  });
  const router = useRouter();

  const loadData = async (ownerId: string) => {
    const [domainsResponse, projectsResponse] = await Promise.all([
      listDomainsByOwner(ownerId),
      listProjectsByOwner(ownerId),
    ]);

    if (domainsResponse.error) {
      setDomainError(domainsResponse.error.message);
      return;
    }

    if (projectsResponse.error) {
      setProjectError(projectsResponse.error.message);
      return;
    }

    setDomains(domainsResponse.data ?? []);
    setProjects(projectsResponse.data ?? []);
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
      await loadData(data.session.user.id);
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
        loadData(currentSession.user.id);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const resetDomainForm = () => {
    setDomainForm({ name: "", code: "", color: "" });
    setDomainError(null);
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: "",
      domain_id: "",
      project_type: "",
      drive_folder_url: "",
      primary_doc_url: "",
    });
    setProjectError(null);
  };

  const handleDomainSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDomainError(null);

    if (!session) {
      setDomainError("Login requerido.");
      return;
    }

    if (!domainForm.name.trim()) {
      setDomainError("El nombre es requerido.");
      return;
    }

    setSavingDomain(true);
    const { error } = await createDomain({
      owner_user_id: session.user.id,
      name: domainForm.name.trim(),
      code: domainForm.code.trim() || null,
      color: domainForm.color.trim() || null,
    });

    if (error) {
      setDomainError(error.message);
      setSavingDomain(false);
      return;
    }

    await loadData(session.user.id);
    setSavingDomain(false);
    setDomainModalOpen(false);
    resetDomainForm();
  };

  const handleProjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProjectError(null);

    if (!session) {
      setProjectError("Login requerido.");
      return;
    }

    if (!projectForm.name.trim()) {
      setProjectError("El nombre es requerido.");
      return;
    }

    if (!projectForm.project_type) {
      setProjectError("Selecciona el tipo de proyecto.");
      return;
    }

    setSavingProject(true);
    const { data: project, error } = await createProject({
      owner_user_id: session.user.id,
      domain_id: projectForm.domain_id || null,
      name: projectForm.name.trim(),
      project_type: projectForm.project_type as "GREENFIELD" | "BROWNFIELD",
      status: "INTEL",
      active: true,
      drive_folder_url: projectForm.drive_folder_url.trim() || null,
      primary_doc_url: projectForm.primary_doc_url.trim() || null,
      pause_condition: null,
    });

    if (error || !project) {
      setProjectError(error?.message ?? "No se pudo crear el proyecto.");
      setSavingProject(false);
      return;
    }

    const { error: core2Error } = await createCore2({
      project_id: project.id,
      pain_now: null,
      intel_min: null,
      context: null,
      unfreeze: null,
      bet_short: null,
      x1_short: null,
      is_done: false,
    });

    if (core2Error) {
      setProjectError(core2Error.message);
      setSavingProject(false);
      return;
    }

    await loadData(session.user.id);
    setSavingProject(false);
    setProjectModalOpen(false);
    resetProjectForm();
    router.push(`/projects/${project.id}`);
  };

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) {
      return projects;
    }

    return projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );
  }, [projects, projectSearch]);

  const domainMap = useMemo(() => {
    return domains.reduce<Record<string, core_domain>>((acc, domain) => {
      acc[domain.id] = domain;
      return acc;
    }, {});
  }, [domains]);

  if (loading) {
    return <div className={styles.loading}>Cargando...</div>;
  }

  return (
    <AppShell title="Tablas Maestras">
      <div className={styles.header}>
        <div>
          <h2>Gestion Central</h2>
          <p>Crear dominios y proyectos base</p>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Lista de Dominios</h3>
            <button
              type="button"
              className={styles.darkButton}
              onClick={() => {
                resetDomainForm();
                setDomainModalOpen(true);
              }}
            >
              Crear dominio
            </button>
          </div>
          {domainError ? <p className={styles.error}>{domainError}</p> : null}
          {domains.length === 0 ? (
            <p className={styles.empty}>Aun no hay dominios.</p>
          ) : (
            <ul className={styles.domainList}>
              {domains.map((domain) => (
                <li key={domain.id} className={styles.domainItem}>
                  <span
                    className={styles.domainAccent}
                    style={{ backgroundColor: domain.color ?? "#e2e8f0" }}
                  />
                  <div className={styles.domainInfo}>
                    <strong>{domain.name}</strong>
                    {domain.code ? (
                      <span className={styles.domainCode}>{domain.code}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Lista de Proyectos</h3>
            <button
              type="button"
              className={styles.darkButton}
              onClick={() => {
                resetProjectForm();
                setProjectModalOpen(true);
              }}
            >
              Crear proyecto
            </button>
          </div>
          <div className={styles.searchRow}>
            <span className="material-symbols-outlined">search</span>
            <input
              type="search"
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
              placeholder="Buscar"
            />
          </div>
          {projectError ? <p className={styles.error}>{projectError}</p> : null}
          {filteredProjects.length === 0 ? (
            <p className={styles.empty}>Aun no hay proyectos.</p>
          ) : (
            <ul className={styles.projectList}>
              {filteredProjects.map((project) => {
                const domain = project.domain_id
                  ? domainMap[project.domain_id]
                  : null;
                return (
                  <li key={project.id} className={styles.projectItem}>
                    <span
                      className={styles.projectAccent}
                      style={{ backgroundColor: domain?.color ?? "#e2e8f0" }}
                    />
                    <div>
                      <strong>{project.name}</strong>
                      <span>{domain?.name ?? "Sin dominio"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {domainModalOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Nuevo dominio</h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => {
                  setDomainModalOpen(false);
                  resetDomainForm();
                }}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className={styles.form} onSubmit={handleDomainSubmit}>
              <label>
                Nombre
                <input
                  type="text"
                  value={domainForm.name}
                  onChange={(event) =>
                    setDomainForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Fortex"
                />
              </label>
              <label>
                Codigo del Proyecto
                <input
                  type="text"
                  value={domainForm.code}
                  onChange={(event) =>
                    setDomainForm((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="FTX"
                />
              </label>
              <label>
                Color del Proyecto
                <input
                  type="text"
                  value={domainForm.color}
                  onChange={(event) =>
                    setDomainForm((prev) => ({ ...prev, color: event.target.value }))
                  }
                  placeholder="#2563eb"
                />
              </label>
              {domainError ? <p className={styles.error}>{domainError}</p> : null}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setDomainModalOpen(false);
                    resetDomainForm();
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryButton} disabled={savingDomain}>
                  {savingDomain ? "Guardando..." : "Crear dominio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {projectModalOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Nuevo proyecto</h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => {
                  setProjectModalOpen(false);
                  resetProjectForm();
                }}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className={styles.form} onSubmit={handleProjectSubmit}>
              <label>
                Nombre
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(event) =>
                    setProjectForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Mi nuevo proyecto"
                />
              </label>
              <label>
                Dominio
                <div className={styles.selectWrapper}>
                  <select
                    value={projectForm.domain_id}
                    onChange={(event) =>
                      setProjectForm((prev) => ({ ...prev, domain_id: event.target.value }))
                    }
                  >
                    <option value="">Seleccionar dominio</option>
                    {domains.map((domain) => (
                      <option key={domain.id} value={domain.id}>
                        {domain.name}
                      </option>
                    ))}
                  </select>
                  <span className={`material-symbols-outlined ${styles.selectIcon}`}>
                    expand_more
                  </span>
                </div>
              </label>
              <label>
                Tipo de Proyecto
                <div className={styles.selectWrapper}>
                  <select
                    value={projectForm.project_type}
                    onChange={(event) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        project_type: event.target.value as "GREENFIELD" | "BROWNFIELD",
                      }))
                    }
                  >
                    <option value="" disabled>
                      Seleccionar tipo de proyecto
                    </option>
                    {PROJECT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <span className={`material-symbols-outlined ${styles.selectIcon}`}>
                    expand_more
                  </span>
                </div>
              </label>
              <label>
                Documento Principal (opcional)
                <input
                  type="url"
                  value={projectForm.primary_doc_url}
                  onChange={(event) =>
                    setProjectForm((prev) => ({
                      ...prev,
                      primary_doc_url: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </label>
              <label>
                Enlace del Documento de Drive (opcional)
                <input
                  type="url"
                  value={projectForm.drive_folder_url}
                  onChange={(event) =>
                    setProjectForm((prev) => ({
                      ...prev,
                      drive_folder_url: event.target.value,
                    }))
                  }
                  placeholder="https://drive.google.com/..."
                />
              </label>
              {projectError ? <p className={styles.error}>{projectError}</p> : null}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setProjectModalOpen(false);
                    resetProjectForm();
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={savingProject}
                >
                  {savingProject ? "Creando..." : "Crear proyecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
