/**
 * StockBadge — visual indicator for a product's stock status.
 * Props: status ("in_stock" | "low_stock" | "out_of_stock")
 */

const LABELS = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

export default function StockBadge({ status }) {
  return (
    <span className={`badge ${status}`}>
      <span className="badge-dot" />
      {LABELS[status] ?? status}
    </span>
  );
}
