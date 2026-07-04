import { v4 as uuidv4 } from 'uuid'
import { type Folder} from '../types'
import { db } from '../db/database'

export const folderService = {
    async getAllFolders(): Promise<Folder[]> {
        return await db.folders.toArray()
    },
    async createFolder(name: string): Promise<Folder> {
        const folder: Folder = {
            id: uuidv4(),
            name
        }
        await db.folders.add(folder)
        return folder
    }
}