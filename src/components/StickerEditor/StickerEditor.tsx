import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stickerService } from '../../services/sticker'
import { type Sticker, type StyleSettings } from '../../types'
import { renderStyledImage } from '../../services/dieCutStyling'
import './StickerEditor.css'

const DEFAULT_STYLE_SETTINGS: StyleSettings = {
    paddingPx: 0,
    paddingColor: '#ffffff',
    outlineColor: '#000000',
    outlineWidthPx: 0,
    cornerStyle: 'sharp'
}

export default function StickerEditor() {
    const { stickerId } = useParams()
    const navigate = useNavigate()
    const [sticker, setSticker] = useState<Sticker | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isErasing, setIsErasing] = useState(true)
    const [isBrushMode, setIsBrushMode] = useState(false)
    const [brushSize, setBrushSize] = useState(20)
    const [brushOpacity, setBrushOpacity] = useState(0.6)
    const [history, setHistory] = useState<Sticker[]>([])
    const [styleSettings, setStyleSettings] = useState<StyleSettings>(DEFAULT_STYLE_SETTINGS)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const isDrawing = useRef(false)

    const getCurrentImage = (s: Sticker): Blob => {
        return s.styledPng ?? s.bgRemovedPng ?? s.originalPng
    }

    // The image styling (padding/outline) should always be applied to the
    // clean erased sticker, never to an already-styled result — otherwise
    // padding/outline would stack on top of itself on re-apply.
    const styleSourceImage = (s: Sticker): Blob => {
        return s.bgRemovedPng ?? s.originalPng
    }

    useEffect(() => {
        async function load() {
            if (!stickerId) return
            const data = await stickerService.getStickerById(stickerId)
            setSticker(data ?? null)
            setHistory([])
            setStyleSettings(data?.styleSettings ?? DEFAULT_STYLE_SETTINGS)
        }
        load()
    }, [stickerId])

    useEffect(() => {
        if (!isBrushMode || !sticker || !canvasRef.current) return
        
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const topImg = new Image()
        const originalImg = new Image()
        const topUrl = URL.createObjectURL(getCurrentImage(sticker))
        const originalUrl = URL.createObjectURL(sticker.originalPng)

        let topLoaded = false
        let originalLoaded = false

        const drawCanvas = () => {
            if (!topLoaded || !originalLoaded) return

            canvas.width = topImg.naturalWidth
            canvas.height = topImg.naturalHeight

            const restoreCanvas = document.createElement('canvas')
            restoreCanvas.width = canvas.width
            restoreCanvas.height = canvas.height
            const restoreCtx = restoreCanvas.getContext('2d')
            if (restoreCtx) {
                restoreCtx.drawImage(originalImg, 0, 0, canvas.width, canvas.height)
            }
            scratchCanvasRef.current = restoreCanvas

            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(topImg, 0, 0, canvas.width, canvas.height)
        }

        originalImg.onload = () => {
            originalLoaded = true
            URL.revokeObjectURL(originalUrl)
            drawCanvas()
        }

        topImg.onload = () => {
            topLoaded = true
            URL.revokeObjectURL(topUrl)
            drawCanvas()
        }

        originalImg.src = originalUrl
        topImg.src = topUrl
    }, [isBrushMode, sticker])

    const recordHistory = () => {
        if (!sticker) return
        setHistory((prev) => [...prev, { ...sticker }])
    }

    const paint = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current || !canvasRef.current || !sticker) return
        
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        if (isErasing) {
            ctx.globalAlpha = brushOpacity
            ctx.globalCompositeOperation = 'destination-out'
            ctx.beginPath()
            ctx.arc(x, y, brushSize, 0, Math.PI * 2)
            ctx.fill()
            ctx.globalCompositeOperation = 'source-over'
            ctx.globalAlpha = 1
        } else {
            if (scratchCanvasRef.current) {
                ctx.save()
                ctx.beginPath()
                ctx.arc(x, y, brushSize, 0, Math.PI * 2)
                ctx.clip()
                ctx.globalAlpha = brushOpacity
                ctx.globalCompositeOperation = 'source-over'
                ctx.drawImage(scratchCanvasRef.current, 0, 0)
                ctx.restore()
                ctx.globalAlpha = 1
            }
        }
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isBrushMode || !sticker) return
        recordHistory()
        isDrawing.current = true
        paint(e)
    }

    const handleMouseUp = async () => {
        if (!canvasRef.current || !sticker) return
        isDrawing.current = false

        canvasRef.current.toBlob(async (blob) => {
            if (!blob) return
            const updated = { ...sticker, bgRemovedPng: blob }
            await stickerService.updateSticker(updated)
            setSticker(updated)
        }, 'image/png')
    }

    const handleRemoveBg = async () => {
        if (!sticker) return
        recordHistory()
        setIsProcessing(true)
        
        const { removeBackground } = await import('@imgly/background-removal')
        const result = await removeBackground(sticker.originalPng)
        const blob = new Blob([await result.arrayBuffer()], { type: 'image/png' })
        
        const updated = { 
            ...sticker, 
            bgRemovedRawPng: blob,
            bgRemovedPng: blob 
        }
        await stickerService.updateSticker(updated)
        setSticker(updated)
        setIsProcessing(false)
    }

    const handleBrushDone = async () => {
        if (!canvasRef.current || !sticker) return
        
        canvasRef.current.toBlob(async (blob) => {
            if (!blob) return
            const updated = { ...sticker, bgRemovedPng: blob }
            await stickerService.updateSticker(updated)
            setSticker(updated)
            setIsBrushMode(false)
        }, 'image/png')
    }

    const handleUndo = async () => {
        if (!sticker || history.length === 0) return
        const previous = history[history.length - 1]
        const nextHistory = history.slice(0, -1)
        setHistory(nextHistory)
        await stickerService.updateSticker(previous)
        setSticker(previous)
        setStyleSettings(previous.styleSettings ?? DEFAULT_STYLE_SETTINGS)
    }

    const handleDeleteSticker = async () => {
        if (!sticker) return
        await stickerService.deleteSticker(sticker.id)
        navigate(-1)
    }

    const handleApplyStyle = async () => {
        if (!sticker) return

        recordHistory()
        setIsProcessing(true)
        try {
            const styledBlob = await renderStyledImage(styleSourceImage(sticker), styleSettings)
            const updated = {
                ...sticker,
                styledPng: styledBlob,
                styleSettings: { ...styleSettings }
            }
            await stickerService.updateSticker(updated)
            setSticker(updated)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="sticker-editor">
            {sticker ? (
                <>
                    <div className="sticker-editor-header">
                        <button onClick={() => navigate(-1)}>← Back</button>
                        <h2>{sticker.name}</h2>
                    </div>
                    <div className="sticker-editor-canvas">
                        {isBrushMode ? (
                            <canvas 
                                ref={canvasRef}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={() => {
                                    isDrawing.current = false
                                }}
                                onMouseMove={paint}
                                className="sticker-editor-canvas-surface"
                            />
                        ) : (
                            <img src={URL.createObjectURL(getCurrentImage(sticker))} alt={sticker.name} />
                        )}
                    </div>
                    <div className="sticker-editor-toolbar">
                        <button onClick={handleUndo} disabled={history.length === 0}>
                            Undo
                        </button>
                        <button onClick={handleRemoveBg} disabled={isProcessing}>
                            {isProcessing ? 'Removing background...' : 'Remove Background'}
                        </button>
                        <button onClick={() => setIsBrushMode(!isBrushMode)}>
                            {isBrushMode ? 'Cancel' : 'Touch Up'}
                        </button>
                        <label className="style-control">
                            Padding size
                            <input type="range" min="0" max="120" value={styleSettings.paddingPx} onChange={(e) => setStyleSettings((prev) => ({ ...prev, paddingPx: Number(e.target.value) }))} />
                        </label>
                        <label className="style-control">
                            Padding color
                            <input type="color" value={styleSettings.paddingColor} onChange={(e) => setStyleSettings((prev) => ({ ...prev, paddingColor: e.target.value }))} />
                        </label>
                        <label className="style-control">
                            Outline width
                            <input type="range" min="0" max="40" value={styleSettings.outlineWidthPx} onChange={(e) => setStyleSettings((prev) => ({ ...prev, outlineWidthPx: Number(e.target.value) }))} />
                        </label>
                        <label className="style-control">
                            Outline color
                            <input type="color" value={styleSettings.outlineColor} onChange={(e) => setStyleSettings((prev) => ({ ...prev, outlineColor: e.target.value }))} />
                        </label>
                        <button onClick={() => void handleApplyStyle()} disabled={isProcessing}>
                            {isProcessing ? 'Applying...' : 'Apply Style'}
                        </button>
                        <button className="delete-button" onClick={handleDeleteSticker}>
                            Delete Sticker
                        </button>
                        {isBrushMode && (
                            <>
                                <button className={`toolbar-toggle-button ${isErasing ? 'active' : ''}`} onClick={() => setIsErasing(true)}>Erase</button>
                                <button className={`toolbar-toggle-button ${isErasing ? '' : 'active'}`} onClick={() => setIsErasing(false)}>Restore</button>
                                <label>Size
                                    <input type="range" min="1" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
                                </label>
                                <label>Opacity
                                    <input type="range" min="0" max="100" step="1" value={Math.round(brushOpacity * 100)} onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)} />
                                </label>
                                <button onClick={handleBrushDone}>Done</button>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    )
}