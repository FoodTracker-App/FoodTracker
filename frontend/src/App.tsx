
import './App.css'
import Auth from './pages/Auth'
import MainLayout from './utils/MainLayout'
import { Route,Routes } from 'react-router-dom'
import BatchIntakePage from './pages/IntakeForms'
import AddProductPage from './pages/Product'
import StockAdjustmentPage from './pages/StockAdjustment'
import NotFoundPage from './pages/NotFoundPage'
import LocationsPage from './pages/Location'


function App() {

  return (
    <>
    <Route path="/auth" element={<Auth />} />
        <Routes>
        {/* Routes WITH Navbar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<>Hi</>} />
          <Route path ='/batches' element = {<BatchIntakePage/>}></Route>
          <Route path ='/add' element = {<AddProductPage/>}></Route>
          <Route path= '/adjustment' element = {<StockAdjustmentPage/>}></Route>
          <Route path ='/location' element = {<LocationsPage/>}></Route>
          <Route path='*' element = {<NotFoundPage/>}></Route>
        </Route>

        {/* Routes WITHOUT Navbar */}
        
      </Routes>
   
    </>
  )
}

export default App
