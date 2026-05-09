"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
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
    <section className="section page-section">
      <div className="container narrow panel centered">
        <p className="eyebrow">Something went wrong</p>
        <h1>We could not load this page.</h1>
        <p>
          The app hit a runtime error in the current route. You can try again or return to the
          home page.
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
  );
}
