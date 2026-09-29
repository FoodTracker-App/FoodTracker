// src/layouts/MainLayout.jsx
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../Auth/AuthContext'

export default function MainLayout() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // 1. Wait for AuthContext to restore the session from storage
  if (isLoading) {
    return (

      <div className="flex h-screen items-center justify-center bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>

        Verifying session...
      </div>
    )
  }

  // 2. Guard: If no authenticated user exists, redirect to /auth
  // `state={{ from: location }}` preserves the intended page after login
  if (!isAuthenticated && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // 3. Render layout with Navbar and nested route content
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  )
}