"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Errors that break the whole page: reported to Sentry, with a way back.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "sans-serif", padding: 24, textAlign: "center" }}>
        <h2>Algo salió mal.</h2>
        <p>Ya nos llegó el aviso del error.</p>
        <button onClick={() => window.location.reload()}>Volver a cargar</button>
      </body>
    </html>
  );
}
