import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePage/HomePage'
import FolderView from './components/Folder/FolderView'
import StickerEditor from './components/StickerEditor/StickerEditor'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/folder/:folderId" element={<FolderView />} />
        <Route path="/sticker/:stickerId" element={<StickerEditor />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App