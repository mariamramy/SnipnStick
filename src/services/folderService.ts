import { v4 as uuidv4 } from 'uuid'
import { type Folder} from '../types'
import { db } from '../db/database'



// Services — this is where the actual logic lives. "Create a new folder" 
// — generate a UUID, build the object, save it to the database. "Delete a sticker" 
// — find it, remove it. This is where UUID finally appears because this is where we actually do things.
export const folderService = {
    async getAllFolders(): Promise<Folder[]> {
        return await db.folders.toArray()
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
}