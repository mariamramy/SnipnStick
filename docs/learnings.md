# SnipNStick — Learnings & Rules

## The Stack
- **React + TypeScript + Vite** — frontend only, no backend
- **Dexie.js** — wrapper around IndexedDB (browser database)
- **react-router-dom** — handles navigation between pages

---

## Where Data Lives
- **Cache** — browser saves site assets (images, JS) to load faster. Browser can delete anytime.
- **Site data** — belongs to the user (cart, drafts, settings). Lives until user clears it manually.
- **IndexedDB** — lives under site data. Survives tab closes, restarts. Tied to the domain.
- **localStorage** — strings only, 5MB limit. Not suitable for images.
- **Dexie** — makes IndexedDB usable. Same data, cleaner API.

> Data is per-device. No server = no sync between devices.

---

## TypeScript Rules
- **Types/interfaces** — compile-time only. Stripped when Vite builds. Never run in browser.
- **Logic (class, const, function)** — survives compilation. Runs in browser.
- The `.ts` extension just means "this file can use TypeScript syntax." Not everything in it gets stripped.
- `interface` → always stripped
- `class`, `const`, `function` → always survive

### Import syntax
```ts
import Dexie from 'dexie'           // runtime — survives
import { type Folder } from './types' // type-only — stripped
```
`type` keyword = stripped. No `type` keyword = survives.

### `@types/` packages
Third-party libraries written in JS don't have TypeScript types built in.
`@types/uuid` is a separate package of type descriptions for the `uuid` library.
It gets stripped at compile time just like your own types.

---

## Dexie Rules
- Dexie wraps IndexedDB — you don't interact with IndexedDB directly.
- You only declare fields you want to **search or filter by** (indexes). Everything else is stored automatically.
- First field in the schema string = primary key. Rest = indexes.
- `version(1).stores(...)` = runtime schema. Needed for IndexedDB to know what to index.
- `EntityTable<Type, 'id'>` = TypeScript type for a Dexie table.
- `!` after property name = non-null assertion. Tells TypeScript "Dexie sets this up, trust me."

### Dexie methods
| Method | Use |
|--------|-----|
| `db.table.add(obj)` | Insert new record |
| `db.table.get(id)` | Get one record by primary key |
| `db.table.update(id, changes)` | Update specific fields on one record |
| `db.table.put(obj)` | Replace entire record |
| `db.table.delete(id)` | Delete one record |
| `db.table.toArray()` | Get all records |
| `db.table.count()` | Count all records |
| `db.table.where('field').equals(val).toArray()` | Filter by indexed field |
| `db.table.where('field').equals(val).delete()` | Delete matching records |
| `db.table.where('field').equals(val).modify({})` | Update matching records |

### update vs modify vs put
- `update(id, changes)` — one record by primary key, partial update
- `modify(changes)` — many records by index, partial update
- `put(obj)` — one record, full replacement

---

## UUID Rules
- Dexie auto-increment gives numbers (1, 2, 3) — collide across devices
- `uuidv4()` gives unique IDs like `a3f8c2d1-...` — safe across all devices, no server needed
- Generate UUID in the service layer, before saving to DB
- `DEFAULT_FOLDER_ID = 'default-folder'` — hardcoded constant, never a real UUID

---

## Architecture Rules
```
IndexedDB → Service → Component (state) → Child Component (props)
```
- **Types** — shape descriptions only. No logic.
- **Database** — connection + table definitions only. No business logic.
- **Services** — all logic lives here. Create, read, update, delete.
- **Components** — UI only. Call services, display results.

> Components never talk to the database directly. Always go through a service.

> If state is only relevant to one component, keep it local (useState). Don't make it a prop.

---

## React Rules

### useState
Stores a value that can change. When it changes, React re-renders the component.
```tsx
const [folders, setFolders] = useState<Folder[]>([])
```

### useEffect
Runs code after the component renders. Use for loading data, subscriptions, etc.
```tsx
useEffect(() => {
    loadData()
}, []) // [] = run once on mount only
```
**Rule:** useEffect callback cannot be async. Define an inner async function and call it.

### useCallback
Prevents a function from being recreated on every render.
Use when a function is in a useEffect dependency array to avoid infinite loops.
```tsx
const loadData = useCallback(async () => { ... }, [])
```

### Callbacks (parent → child communication)
**Rule:** When a child needs to tell its parent "something happened", the parent passes a function as a prop. The child calls it when the event occurs.
```tsx
// Parent
<CreateFolderButton onFolderCreated={loadData} />

// Child
onFolderCreated() // calls parent's loadData
```

### Rendering lists
**Rule:** Use `.map()` to render lists in JSX. Always provide a `key` prop.
```tsx
{folders.map((folder) => (
    <FolderCard key={folder.id} folder={folder} />
))}
```

### Conditional rendering
**Rule:** Use ternary `condition ? a : b` or `condition && a` for conditional JSX.
```tsx
{isEditing ? <input /> : <span>{name}</span>}
```

### stopPropagation
**Rule:** `e.stopPropagation()` prevents a click from bubbling up to parent elements.
```tsx
onDoubleClick={(e) => { e.stopPropagation(); handleEdit() }}
```

### Promise.all
**Rule:** Use `Promise.all` with `.map()` to run multiple async operations in parallel and wait for all of them.
```tsx
await Promise.all(items.map((item) => db.table.update(item.id, { order: index })))
```

---

## react-router-dom Rules

### Setup
```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/folder/:folderId" element={<FolderView />} />
  </Routes>
</BrowserRouter>
```

### URL params
`:folderId` in the path = a variable that captures whatever is in the URL.

### Reading URL params (inside the target component)
```tsx
const { folderId } = useParams()
```

### Navigating between pages
```tsx
const navigate = useNavigate()
navigate(`/folder/${folder.id}`)
```

### Full navigation flow
1. User clicks folder → `navigate('/folder/abc123')` → URL changes
2. React Router matches `/folder/:folderId` → renders `FolderView`
3. `FolderView` reads `folderId` from URL → loads that folder's data

---

## Blob vs String for images
- Images are stored as `Blob` in IndexedDB (binary data, not text)
- To display a Blob as an `<img>` src, convert it: `URL.createObjectURL(blob)`
- This creates a temporary in-memory URL like `blob:https://domain.com/...`
- Works in development and production