import { SectionHeading } from "@/components/section-heading";
import { catalogGroups } from "@/lib/data";

export default function UploadArtworkPage() {
  return (
    <section className="section page-section">
      <div className="container narrow">
        <SectionHeading
          eyebrow="Artwork upload"
          title="Collect print files and production instructions"
          description="This Phase 1 screen models the upload experience customers will use before checkout or after placing an order."
        />
        <form className="panel form-grid">
          <label>
            Full name
            <input type="text" placeholder="Your name" />
          </label>
          <label>
            Email
            <input type="email" placeholder="name@example.com" />
          </label>
          <label>
            Order reference
            <input type="text" placeholder="Optional order number" />
          </label>
          <label>
            Product type
            <select defaultValue="Packaging Boxes">
              {catalogGroups.map((group) => (
                <option key={group.slug}>{group.title}</option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Printing instructions
            <textarea placeholder="Add notes for finish, turnaround, sizing, or placement." rows={6} />
          </label>
          <label className="full-width upload-dropzone">
            Artwork files
            <input type="file" multiple />
            <span>Drag and drop or choose multiple files</span>
          </label>
          <button className="button button-primary" type="submit">
            Submit artwork
          </button>
        </form>
      </div>
    </section>
  );
}
