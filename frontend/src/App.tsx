
import './App.css'
import Auth from './pages/Auth'
import MainLayout from './utils/MainLayout'
import { Route,Routes } from 'react-router-dom'
import BatchIntakePage from './pages/IntakeForms'
import BatchInventoryPage from './pages/BatchInventory'
import AddProductPage from './pages/Product'
import StockAdjustmentPage from './pages/StockAdjustment'
import NotFoundPage from './pages/NotFoundPage'
import LocationsPage from './pages/Location'

import Dashboard from "./pages/Dashboard";
import ExpiryAlerts from "./pages/ExpiryAlerts";

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
        {/* Routes WITH Navbar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/batches" element={<BatchInventoryPage />} />
          <Route path="/batches/new" element={<BatchInventoryPage />} />
          <Route path="/intake" element={<BatchIntakePage />} />
          <Route path ='/add' element = {<AddProductPage/>}></Route>
          <Route path= '/adjustment' element = {<StockAdjustmentPage/>}></Route>
          <Route path ='/location' element = {<LocationsPage/>}></Route>
          <Route path='/alerts' element={<ExpiryAlerts />} />
          <Route path='/alert' element ={<ExpiryAlerts/>}></Route>
          <Route path='*' element = {<NotFoundPage/>}></Route>
        </Route>

        {/* Routes WITHOUT Navbar */}
    </Routes>
  )
}

export default App;
