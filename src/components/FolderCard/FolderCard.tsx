import { type Folder, type Sticker } from '../../types'
import './FolderCard.css'

interface FolderCardProps {
  folder: Folder,
  stickers: Sticker[],
  onClick: (folderId: string) => void
}

export default function FolderCard({ folder, stickers, onClick }: FolderCardProps) {
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
            <div className="folder-name">{folder.name}</div>
            <div className="folder-sticker-count">{stickers.length} sticker{stickers.length !== 1 ? 's' : ''}</div>
        </div>
    </div>
)
}