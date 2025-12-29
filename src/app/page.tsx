"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabase/client";
import styles from "./login.module.css";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      setSessionEmail(data.session?.user?.email ?? null);
      if (data.session) {
        router.push("/home");
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessionEmail(session?.user?.email ?? null);
        if (session) {
        router.push("/home");
        }
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const trimmedEmail = email.trim();

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (signInError) {
          setError(signInError.message);
        } else {
          setMessage("Sesion iniciada.");
          router.push("/home");
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage("Revisa tu email para confirmar la cuenta.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Ingresa tu email para recuperar la contrasena.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage("Enviamos un email para restablecer la contrasena.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className={styles.page}>
      <div className={styles.glowTop} aria-hidden="true" />
      <div className={styles.glowBottom} aria-hidden="true" />

      <main className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className="material-symbols-outlined">grid_view</span>
          </div>
          <h1 className={styles.title}>CORE2 Flow</h1>
          <p className={styles.subtitle}>Gestiona. Sigue. Flujo.</p>
        </div>

        {sessionEmail ? (
          <div className={styles.sessionBanner}>
            <span>Sesion activa: {sessionEmail}</span>
            <button
              type="button"
              className={styles.linkButton}
              onClick={handleSignOut}
            >
              Cerrar sesion
            </button>
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <div className={styles.inputGroup}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Ingresa tu email"
                className={styles.input}
                autoComplete="email"
                required
              />
              <span className={`${styles.icon} material-symbols-outlined`}>
                mail
              </span>
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Contrasena</span>
            <div className={styles.inputGroup}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingresa tu contrasena"
                className={styles.input}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar" : "Mostrar"}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </label>

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={handleResetPassword}
              disabled={loading}
            >
              Olvidaste la contrasena?
            </button>
          </div>

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            <span>
              {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
            </span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          {error ? <p className={styles.error}>{error}</p> : null}
          {message ? <p className={styles.message}>{message}</p> : null}
        </form>

        <div className={styles.footer}>
          <span>
            {mode === "login"
              ? "No tienes cuenta?"
              : "Ya tienes cuenta?"}
          </span>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Crear cuenta" : "Ingresar"}
          </button>
        </div>
      </main>
    </div>
  );
}
