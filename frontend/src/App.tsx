import Navbar from './components/Navbar'
import './App.css'
import Auth from './pages/Auth'
import MainLayout from './utils/MainLayout'
import { Route,Routes } from 'react-router-dom'


function App() {

  return (
    <>
        <Routes>
        {/* Routes WITH Navbar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<>Hi</>} />
          
        </Route>

        {/* Routes WITHOUT Navbar */}
        <Route path="/auth" element={<Auth />} />
      </Routes>
   
    </>
  )
}

export default App
