import type { NextPageContext } from "next";

type ErrorPageProps = {
  statusCode?: number;
};

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main style={{ padding: "4rem 2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>{statusCode ? `An error ${statusCode} occurred on server` : "An error occurred"}</h1>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode || err?.statusCode || 404;
  return { statusCode };
};

export default ErrorPage;
