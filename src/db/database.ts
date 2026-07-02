import Dexie, { type EntityTable } from 'dexie';
import { type Folder } from '../types/Folder';
import { type Sticker } from '../types/Sticker';

class SnipNStickDB extends Dexie {

    folders!: EntityTable<Folder, 'id'>; // string is the type of the primary key
    stickers!: EntityTable<Sticker, 'id'>; // string is the type of the primary key

    constructor() {
        super('SnipNStickDB');
        this.version(1).stores({
            folders: 'id, name, order, createdAt',
            stickers: 'id, name, folderId, order, createdAt'
        });
    }

}
export const db = new SnipNStickDB()