import { v4 as uuidv4 } from 'uuid'
import { type Folder } from '../types'
import { db } from '../db/database'

// Services — this is where the actual logic lives. "Create a new folder" 
// — generate a UUID, build the object, save it to the database. "Delete a sticker" 
// — find it, remove it. This is where UUID finally appears because this is where we actually do things.

export const DEFAULT_FOLDER_ID = 'default-folder'

export const folderService = {
    async initializeDefaultFolder(): Promise<void> {
        const defaultFolder = await db.folders.get(DEFAULT_FOLDER_ID)
        if (!defaultFolder) {
            await db.folders.add({  // we dont call create folder bc it will generate its own uuid, but we want to use the default folder id
                id: DEFAULT_FOLDER_ID,
                name: 'Default',
                order: 0,
                createdAt: Date.now()
            })
        }
    },
    async getAllFolders(): Promise<Folder[]> {
        return await db.folders.toArray()
    },
    async getFolderById(id: string): Promise<Folder | undefined> {
        return await db.folders.get(id)
    },
    async createFolder(name: string): Promise<Folder> {
        const folder: Folder = {
            id: uuidv4(),
            name,
            order: (await db.folders.count()) + 1, // count returns the number of folders in the database, and we add 1 to it to get the order of the new folder
            createdAt: Date.now()
        }
        await db.folders.add(folder)
        return folder
    },
    async deleteFolder(id: string): Promise<void> {
        if (id === DEFAULT_FOLDER_ID) throw new Error("Cannot delete the default folder")
        await db.folders.delete(id)
        // Also delete all stickers in this folder
        await db.stickers.where('folderId').equals(id).delete()
        // where('folderId') — look at the folderId index
        // .equals(id) — find all records where it matches
    },
    async deleteFolderMoveStickers(id: string): Promise<void> {
        if (id === DEFAULT_FOLDER_ID) throw new Error("Cannot delete the default folder")
        // Move all stickers in this folder to the default folder
        await db.stickers.where('folderId').equals(id).modify({ folderId: DEFAULT_FOLDER_ID })
        // Object syntax .modify({ folderId: DEFAULT_FOLDER_ID }) — shorter, cleaner, use when you're just setting fields to fixed values
        // Callback syntax .modify(sticker => { sticker.folderId = DEFAULT_FOLDER_ID }) — more powerful, use when the new value depends on the current record's data
        await db.folders.delete(id)
    },
    async renameFolder(id: string, newName: string): Promise<void> {
        if (id === DEFAULT_FOLDER_ID) throw new Error("Cannot rename the default folder")
        // update(id, changes) — targets a single record by its primary key. Fast and direct.
        // where().equals().modify() — targets multiple records by any indexed field.
        await db.folders.update(id, { name: newName })
    },
    async reorderFolders(folders: Folder[]): Promise<void> {
        // create a Promise for each folder update, collect them all into an array, then wait for all of them to finish.
        await Promise.all(folders.map((folder, index) => {
            return db.folders.update(folder.id, { order: index })
        }))
    }
}