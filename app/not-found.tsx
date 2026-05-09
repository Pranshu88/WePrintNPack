import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section page-section">
      <div className="container narrow panel centered">
        <p className="eyebrow">404</p>
        <h1>Page not found.</h1>
        <p>The page you requested does not exist or was moved.</p>
        <Link className="button button-primary" href="/">
          Return home
        </Link>
      </div>
    </section>
  );
}
