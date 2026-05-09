export default function ContactPage() {
  return (
    <section className="section page-section">
      <div className="container narrow">
        <div className="panel form-grid">
          <p className="eyebrow">Contact</p>
          <h1>Talk to the Halifax print team</h1>
          <label>
            Name
            <input type="text" placeholder="Your name" />
          </label>
          <label>
            Email
            <input type="email" placeholder="name@example.com" />
          </label>
          <label className="full-width">
            Message
            <textarea rows={6} placeholder="Tell us about your print or packaging project." />
          </label>
          <button className="button button-primary" type="submit">
            Send inquiry
          </button>
        </div>
      </div>
    </section>
  );
}
