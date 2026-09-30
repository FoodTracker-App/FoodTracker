import "./App.css";
import Auth from "./pages/Auth";
import MainLayout from "./utils/MainLayout";
import { Route, Routes } from "react-router-dom";
import BatchInventoryPage from "./pages/BatchInventory";
import AddProductPage from "./pages/Product";
import StockAdjustmentPage from "./pages/StockAdjustment";
import Dashboard from "./pages/Dashboard";
import ExpiryAlerts from "./pages/ExpiryAlerts";

function App() {
  return (
    <>
      <Routes>
        {/* Routes WITH Navbar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/batches" element={<BatchInventoryPage />} />
          <Route path="/batches/new" element={<BatchInventoryPage />} />
          <Route path="/add" element={<AddProductPage />}></Route>
          <Route path="/adjustment" element={<StockAdjustmentPage />}></Route>
          <Route path="/alert" element={<ExpiryAlerts />} />
          <Route path="/alerts" element={<ExpiryAlerts />} />
        </Route>

        {/* Routes WITHOUT Navbar */}
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </>
  );
}

export default App;
