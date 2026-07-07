import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { folderService } from '../../services/folder'
import { stickerService } from '../../services/sticker'
import { type Folder, type Sticker } from '../../types'
import './FolderView.css'

export default function FolderView() {
 const [folder, setFolder] = useState<Folder | null>(null)
 const [stickers, setStickers] = useState<Sticker[]>([])
 const { folderId } = useParams()
 const fileInputRef = useRef<HTMLInputElement>(null)

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
const getImageDimensions = (blob: Blob): Promise<{ width: number, height: number }> => {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
            URL.revokeObjectURL(url)
        }
        img.src = url
    })
}
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!folderId || files.length === 0) return
    
    for (const file of files) {
        const blob = new Blob([await file.arrayBuffer()], { type: file.type })
        const { width, height } = await getImageDimensions(blob)
        await stickerService.createSticker(file.name, folderId, blob, width, height)
    }
    await loadData()
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
    <div key={sticker.id} className="sticker" onClick={() => navigate(`/sticker/${sticker.id}`)}>
        <img src={URL.createObjectURL(getCurrentImage(sticker))} alt={sticker.name} />
        <p>{sticker.name}</p>
    </div>
))}
                </div>
                <button onClick={() => fileInputRef.current?.click()}>+ Add Sticker</button>
<input
    type="file"
    ref={fileInputRef}
    style={{ display: 'none' }}
    accept="image/*"
    multiple
    onChange={handleFileSelect}
/>

            </div>
        ) : (
            <p>Folder not found</p>
        )}
    </div>
 )

}
