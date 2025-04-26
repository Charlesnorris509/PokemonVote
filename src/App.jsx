import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import CreatePostPage from './pages/CreatePostPage'
import PostDetailPage from './pages/PostDetailPage'
import EditPostPage from './pages/EditPostPage'
import NotFoundPage from './pages/NotFoundPage'
import AuthSetup from './components/AuthSetup'
import UserPreferences from './components/UserPreferences'
import { getCurrentUser } from './utils/auth'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showAuthSetup, setShowAuthSetup] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [appReady, setAppReady] = useState(false)
  const [userPrefs, setUserPrefs] = useState({
    colorScheme: 'default',
    showContentOnFeed: false,
    showImagesOnFeed: true
  })

  useEffect(() => {
    // Check for existing user session
    const currentUser = getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
    } else {
      setShowAuthSetup(true)
    }
    setAppReady(true)
  }, [])

  const handleAuthComplete = (userData) => {
    setUser(userData)
    setShowAuthSetup(false)
  }

  const handlePreferencesSave = (prefs) => {
    setUserPrefs(prefs)
    setShowPreferences(false)
  }

  // Make user and preferences available throughout the app
  const appContext = {
    user,
    userPrefs,
    openPreferences: () => setShowPreferences(true)
  }

  if (!appReady) {
    return <div className="loading-splash">Loading...</div>
  }

  return (
    <>
      {showAuthSetup && <AuthSetup onComplete={handleAuthComplete} />}
      {showPreferences && <UserPreferences onClose={() => setShowPreferences(false)} />}
      
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout context={appContext} />}>
            <Route index element={<HomePage context={appContext} />} />
            <Route path="create" element={<CreatePostPage context={appContext} />} />
            <Route path="post/:id" element={<PostDetailPage context={appContext} />} />
            <Route path="edit/:id" element={<EditPostPage context={appContext} />} />
            <Route path="404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </Router>
    </>
  )
}

export default App
