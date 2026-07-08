import { useState, type MouseEvent } from 'react'
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
        setNewName(folder.name)
        setIsEditing(true)
    }

    const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
        if (isEditing) return

        const target = e.target as HTMLElement
        if (target.closest('.folder-name') || target.closest('input') || target.closest('button')) {
            e.stopPropagation()
            return
        }

        onClick(folder.id)
    }

    const handleSave = async (e?: MouseEvent<HTMLButtonElement>) => {
        e?.stopPropagation()
        const trimmedName = newName.trim()

        if (!trimmedName || trimmedName === folder.name) {
            setNewName(folder.name)
            setIsEditing(false)
            return
        }

        await folderService.renameFolder(folder.id, trimmedName)
        setIsEditing(false)
        onRenamed()
    }

    return (
        <div className="folder-card-wrapper" onClick={handleCardClick}>
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    void handleSave()
                                }
                                if (e.key === 'Escape') {
                                    setNewName(folder.name)
                                    setIsEditing(false)
                                }
                            }}
                        />
                        <button onClick={(e) => void handleSave(e)}>Save</button>
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