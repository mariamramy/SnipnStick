import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { folderService } from '../../services/folder'
import { stickerService } from '../../services/sticker'
import { type Folder, type Sticker } from '../../types'
import './FolderView.css'

export default function FolderView() {
 const [folder, setFolder] = useState<Folder | null>(null)
 const [stickers, setStickers] = useState<Sticker[]>([])
 const { folderId } = useParams() 
const navigate = useNavigate()

 const getCurrentImage = (sticker: Sticker): Blob => {
    return sticker.styledPng ?? sticker.bgRemovedPng ?? sticker.originalPng
}

 const loadData = async () => {
    if (!folderId) return
    const folderData = await folderService.getFolderById(folderId)
    const stickersData = await stickerService.getAllStickersbyFolder(folderId)
    setFolder(folderData ?? null)
    setStickers(stickersData)
 }
 
 useEffect(() => {
    loadData()
 }, [folderId]) // eslint-disable-line react-hooks/exhaustive-deps

 return (
    <div className="folder-view">
        {folder ? (
            <div>
                <button onClick={() => navigate('/')}>← Back</button>
                <h1>{folder.name}</h1>
                <div className="stickers">
                    {stickers.map(sticker => (
                        <div key={sticker.id} className="sticker">
                            <img src={URL.createObjectURL(getCurrentImage(sticker))} alt={sticker.name} />
                            <p>{sticker.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <p>Folder not found</p>
        )}
    </div>
 )

}
