import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { folderService } from '../../services/folder'
import { stickerService } from '../../services/sticker'
import { type Folder, type Sticker } from '../../types'
import './FolderView.css'

export default function FolderView() {
 const [folder, setFolder] = useState<Folder | null>(null)
 const [stickers, setStickers] = useState<Sticker[]>([])
 const { folderId } = useParams() 
 
 const loadData = async () => {
    if (!folderId) return
    const folderData = await folderService.getFolderById(folderId)
    const stickersData = await stickerService.getStickersByFolderId(folderId)
    setFolder(folderData)
    setStickers(stickersData)
 }
 
 useEffect(() => {
    loadData()
 }, [folderId]) // eslint-disable-line react-hooks/exhaustive-deps

}