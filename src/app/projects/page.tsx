"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase/client";
import { listByOwner as listProjectsByOwner } from "../../repo/project.repo";
import { listByOwner as listDomainsByOwner } from "../../repo/domain.repo";
import type { core_domain, core_project } from "../../types/db";
import styles from "./projects.module.css";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<core_project[]>([]);
  const [domains, setDomains] = useState<core_domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const domainMap = useMemo(() => {
    return domains.reduce<Record<string, core_domain>>((acc, domain) => {
      acc[domain.id] = domain;
      return acc;
    }, {});
  }, [domains]);

  const loadData = async (ownerId: string) => {
    const [projectsResponse, domainsResponse] = await Promise.all([
      listProjectsByOwner(ownerId),
      listDomainsByOwner(ownerId),
    ]);

    if (projectsResponse.error) {
      setError(projectsResponse.error.message);
      return;
    }

    if (domainsResponse.error) {
      setError(domainsResponse.error.message);
      return;
    }

    setProjects(projectsResponse.data ?? []);
    setDomains(domainsResponse.data ?? []);
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
        loadData(currentSession.user.id);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const isFiltering = search.trim().length > 0;

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      const domainName = project.domain_id ? domainMap[project.domain_id]?.name : "";
      return (
        project.name.toLowerCase().includes(query) ||
        domainName?.toLowerCase().includes(query)
      );
    });
  }, [projects, search, domainMap]);

  if (loading) {
    return <div className={styles.loading}>Cargando...</div>;
  }

  return (
    <AppShell title="Proyectos">
      <div className={styles.toolbar}>
        <div>
          <h2>Ver Proyectos</h2>
        </div>
        <div className={styles.searchBox}>
          <span className="material-symbols-outlined">search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar proyectos"
            aria-label="Buscar proyectos"
          />
          <button type="button" className={styles.filterButton} aria-label="Filtros">
            <span className="material-symbols-outlined">tune</span>
          </button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {filteredProjects.length === 0 ? (
        <div className={styles.empty}>
          {isFiltering ? "Sin resultados." : "Aun no hay proyectos."}
        </div>
      ) : (
        <div className={styles.list}>
          {filteredProjects.map((project) => {
            const domain = project.domain_id ? domainMap[project.domain_id] : null;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={styles.card}
              >
                <span
                  className={styles.accent}
                  style={{ backgroundColor: domain?.color ?? "#e2e8f0" }}
                />
                <div className={styles.cardBody}>
                  <div>
                    <h3>{project.name}</h3>
                    <p>{domain ? domain.name : "Sin dominio"}</p>
                  </div>
                  <span className={styles.cardAction}>
                    <span className="material-symbols-outlined">settings</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
