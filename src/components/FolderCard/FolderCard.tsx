import { useState } from 'react'
import { type Folder, type Sticker } from '../../types'
import './FolderCard.css'
import { folderService } from '../../services/folder'

interface FolderCardProps {
  folder: Folder,
  stickers: Sticker[],
  onClick: (folderId: string) => void
  onRenamed: () => void
}

export default function FolderCard({ folder, stickers, onClick, onRenamed }: FolderCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [newName, setNewName] = useState(folder.name)

    const handleEdit = () => {
        setIsEditing(true)
    }

    const handleSave = async () => {
        await folderService.renameFolder(folder.id, newName)
        setIsEditing(false)
        onRenamed()
    }

    return (
        <div className="folder-card-wrapper" onClick={() => onClick(folder.id)}>
            <div className="folder-visual">
                {stickers.slice(0, 3).map((sticker) => (
                    <img
                        key={sticker.id}
                        src={URL.createObjectURL(sticker.originalPng)}
                        className="folder-sticker-thumbnail"
                    />
                ))}
            </div>
            <div className="folder-info">
                {isEditing ? (
                    <div onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button onClick={handleSave}>Save</button>
                    </div>
                ) : (
                    <span className="folder-name" onDoubleClick={(e) => { e.stopPropagation(); handleEdit() }}>
                    {folder.name}
                    </span>
                )}
                <div className="folder-sticker-count">
                    {stickers.length} sticker{stickers.length !== 1 ? 's' : ''}
                </div>
            </div>
        </div>
    )
}