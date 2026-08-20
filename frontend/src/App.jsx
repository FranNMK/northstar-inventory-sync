import "./index.css";
import ProductList from "./components/ProductList";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand-dot" />
        <h1>Northstar Inventory Sync</h1>
      </header>
      <main className="page-content">
        <ProductList />
      </main>
    </div>
  );
}
