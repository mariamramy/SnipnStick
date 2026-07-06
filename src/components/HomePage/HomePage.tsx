import { useState, useEffect } from 'react'
import { folderService } from '../../services/folder'
import { stickerService } from '../../services/sticker'
import { type Folder, type Sticker } from '../../types'
import FolderCard from '../FolderCard/FolderCard'
import CreateFolderButton from '../CreateFolderButton/CreateFolderButton'
import './HomePage.css'

export default function HomePage() {
    const [folders, setFolders] = useState<Folder[]>([])
    const [stickers, setStickers] = useState<Sticker[]>([])

    const loadData = async () => {
        await folderService.initializeDefaultFolder()
        const allFolders = await folderService.getAllFolders()
        const allStickers = await stickerService.getAllStickers()
        setFolders(allFolders)
        setStickers(allStickers)
    }

    useEffect(() => {
        loadData()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="home-page">
            <CreateFolderButton onFolderCreated={loadData} />
            <div className="folder-grid">
                {folders.map((folder) => (
                    <FolderCard
                        key={folder.id}
                        folder={folder}
                        stickers={stickers.filter(s => s.folderId === folder.id)}
                        onClick={(id) => console.log('open folder', id)}
                    />
                ))}
            </div>
        </div>
    )
}