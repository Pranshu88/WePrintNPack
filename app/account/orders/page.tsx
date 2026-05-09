import { accountOrders } from "@/lib/data";

export default function AccountOrdersPage() {
  return (
    <section className="section page-section">
      <div className="container">
        <div className="panel">
          <p className="eyebrow">Customer account</p>
          <h1>Track recent orders</h1>
          <div className="table">
            <div className="table-row table-head">
              <span>Order</span>
              <span>Product</span>
              <span>Status</span>
              <span>Total</span>
            </div>
            {accountOrders.map((order) => (
              <div className="table-row" key={order.id}>
                <span>{order.id}</span>
                <span>{order.product}</span>
                <span>{order.status}</span>
                <span>{order.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
