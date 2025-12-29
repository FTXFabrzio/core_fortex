"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "../lib/supabase/client";
import CalendarPanel from "./CalendarPanel";
import styles from "./appShell.module.css";

type AppShellProps = {
  title: string;
  children: ReactNode;
  showCalendar?: boolean;
};

export default function AppShell({ title, children, showCalendar = false }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const navItems = [
    { href: "/home", label: "Inicio", icon: "home" },
    { href: "/tablas-maestras", label: "Tablas Maestras", icon: "dataset" },
    { href: "/projects", label: "Proyectos", icon: "folder" },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const activeNavLabel =
    navItems.find((item) => isActive(item.href))?.label ?? title;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true">
            <img src="/assets/logo.svg" alt="" />
          </div>
          <div className={styles.navSwitcher}>
            <button
              type="button"
              className={styles.navToggle}
              onClick={() => setNavOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={navOpen}
            >
              <span className="material-symbols-outlined">apps</span>
              <span>{activeNavLabel}</span>
              <span className={`material-symbols-outlined ${styles.navChevron}`}>
                expand_more
              </span>
            </button>
            {navOpen ? (
              <nav className={styles.navMenu} aria-label="Navegacion principal">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isActive(item.href) ? styles.navItemActive : styles.navItem
                    }
                    onClick={() => setNavOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className={styles.signOutMobile}
          onClick={handleSignOut}
          aria-label="Cerrar sesion"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
        <button
          type="button"
          className={styles.signOut}
          onClick={handleSignOut}
          aria-label="Cerrar sesion"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>
      <div className={showCalendar ? styles.layout : styles.layoutSingle}>
        <main className={styles.main}>{children}</main>
        {showCalendar ? (
          <aside className={styles.sidebar}>
            <CalendarPanel />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
