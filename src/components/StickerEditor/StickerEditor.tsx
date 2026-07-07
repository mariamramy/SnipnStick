import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stickerService } from '../../services/sticker'
import { type Sticker } from '../../types'
import './StickerEditor.css'

export default function StickerEditor() {
    const { stickerId } = useParams()
    const navigate = useNavigate()
    const [sticker, setSticker] = useState<Sticker | null>(null)

    useEffect(() => {
        async function load() {
            if (!stickerId) return
            const data = await stickerService.getStickerById(stickerId)
            setSticker(data ?? null)
        }
        load()
    }, [stickerId])

    return (
        <div className="sticker-editor">
            {sticker ? (
                <div>
                    <button onClick={() => navigate(-1)}>← Back</button>
                    <img src={URL.createObjectURL(sticker.originalPng)} alt={sticker.name} />
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    )
}