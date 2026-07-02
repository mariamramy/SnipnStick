import Dexie, { type EntityTable } from 'dexie';
import { type Folder } from '../types/Folder';
import { type Sticker } from '../types/Sticker';

// Database — just the connection to IndexedDB and table definitions. No logic about how to create or manipulate data. Just "these tables exist, these are their indexes." Done.

class SnipNStickDB extends Dexie {

    folders!: EntityTable<Folder, 'id'>; // string is the type of the primary key
    stickers!: EntityTable<Sticker, 'id'>; // string is the type of the primary key

    constructor() {
        super('SnipNStickDB');   // every class that extends something needs a super() call in the constructor
        this.version(1).stores({
            folders: 'id, name, order, createdAt',
            stickers: 'id, name, folderId, order, createdAt'
        });
    }

}
export const db = new SnipNStickDB()