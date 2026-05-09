export default function CheckoutPage() {
  return (
    <section className="section page-section">
      <div className="container checkout-layout">
        <div className="panel form-grid">
          <p className="eyebrow">Checkout</p>
          <h1>Secure checkout flow</h1>
          <label>
            Company
            <input type="text" placeholder="We Print N Pack customer" />
          </label>
          <label>
            Contact name
            <input type="text" placeholder="Primary contact" />
          </label>
          <label>
            Email
            <input type="email" placeholder="name@example.com" />
          </label>
          <label>
            Phone
            <input type="tel" placeholder="+1 902..." />
          </label>
          <label className="full-width">
            Shipping address
            <input type="text" placeholder="Street, city, province, postal code" />
          </label>
          <label>
            Payment method
            <select defaultValue="Credit Card">
              <option>Credit Card</option>
              <option>Bank Transfer</option>
              <option>Invoice Request</option>
            </select>
          </label>
          <label>
            Delivery speed
            <select defaultValue="Standard">
              <option>Standard</option>
              <option>Rush</option>
              <option>Pickup</option>
            </select>
          </label>
          <label className="full-width">
            Order notes
            <textarea rows={5} placeholder="Special instructions, deadlines, or production notes." />
          </label>
          <button className="button button-primary" type="submit">
            Place order
          </button>
        </div>
        <aside className="panel">
          <h2>Checkout notes</h2>
          <ul className="feature-list">
            <li>Stripe or a similar gateway can be wired in next</li>
            <li>Shipping rules and taxes can be added once business rules are confirmed</li>
            <li>Customer uploads and design files can be attached to the final order record</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
