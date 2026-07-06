import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePage/HomePage'
import FolderView from './components/Folder/FolderView'

// defines the routes for the app. The HomePage is at the root path, and the FolderView is at /folder/:folderId
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/folder/:folderId" element={<FolderView />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App