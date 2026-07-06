import { useState } from 'react'
import { folderService } from '../../services/folder'
import './CreateFolderButton.css'

interface CreateFolderButtonProps {
    onFolderCreated: () => void
}

export default function CreateFolderButton({ onFolderCreated }: CreateFolderButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [name, setName] = useState('') // tracks whether the input is showing

    const handleCreate = async () => {
        if (name.trim() === '') return // don't create empty folders
        await folderService.createFolder(name)
        setName('') // reset the input field
        setIsOpen(false) // close the input field
        onFolderCreated() // notify parent to refresh the folder list
    }

    return (
        <div>
            {isOpen ? (
          <div>
             <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Folder name" 
              />
          <button onClick={handleCreate}>Create</button>
          </div>
) : (
    <button onClick={() => setIsOpen(true)}>Create Folder</button>
)}
        </div>
    )
}