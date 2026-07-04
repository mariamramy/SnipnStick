import { v4 as uuidv4 } from 'uuid'
import { type Sticker } from '../types'
import { db } from '../db/database'

export const stickerService = {
    async createSticker(stickerName: string, folderId: string, originalPng: Blob, widthPx: number, heightPx: number): Promise<Sticker> {
        const sticker: Sticker = {
            id: uuidv4(),
            name: stickerName,
            folderId: folderId,
            originalPng: originalPng,
            widthPx: widthPx,
            heightPx: heightPx,
            createdAt: Date.now(),
            bgRemovedRawPng: null,
            bgRemovedPng: null,
            enhancedPng: null,
            styledPng: null,
            order: (await db.stickers.count()) + 1,
            tags: [],
            styleSettings: null,
            enhancementSettings: null
        }
        await db.stickers.add(sticker)
        return sticker
    },
    getStickerById(id: string): Promise<Sticker | undefined> {
        return db.stickers.get(id)
    },
    async updateSticker(sticker: Sticker): Promise<void> {
        await db.stickers.put(sticker)
    },  
    async moveSticker(stickerId: string, newFolderId: string): Promise<void> {
        await db.stickers.update(stickerId, { folderId: newFolderId })
    },
    async renameSticker(stickerId: string, newName: string): Promise<void> {
        await db.stickers.update(stickerId, { name: newName })
    },
    async deleteSticker(stickerId: string): Promise<void> {
        await db.stickers.delete(stickerId)
    },
    async getAllStickersbyFolder(id: string): Promise<Sticker[]> {
        return await db.stickers.where('folderId').equals(id).toArray()
    }
}