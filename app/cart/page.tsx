import Link from "next/link";
import { cartItems } from "@/lib/data";

export default function CartPage() {
  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <section className="section page-section">
      <div className="container cart-layout">
        <div className="panel">
          <p className="eyebrow">Cart</p>
          <h1>Review your order</h1>
          <div className="cart-list">
            {cartItems.map((item) => (
              <article className="cart-item" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.details}</p>
                </div>
                <span>${item.price.toFixed(2)}</span>
              </article>
            ))}
          </div>
        </div>
        <aside className="panel order-summary">
          <h2>Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
          <div className="summary-row">
            <span>Estimated shipping</span>
            <strong>$24.00</strong>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <strong>${(total + 24).toFixed(2)}</strong>
          </div>
          <Link className="button button-primary full-width-button" href="/checkout">
            Continue to checkout
          </Link>
        </aside>
      </div>
    </section>
  );
}
