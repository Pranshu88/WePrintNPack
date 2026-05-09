"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <section className="section page-section">
          <div className="container narrow panel centered">
            <p className="eyebrow">Application error</p>
            <h1>Something broke at the app level.</h1>
            <p>
              The shell could not finish rendering. You can retry the page or jump back to the
              home screen.
            </p>
            <div className="button-row">
              <button className="button button-primary" type="button" onClick={reset}>
                Try again
              </button>
              <Link className="button button-secondary" href="/">
                Return home
              </Link>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
