import express from 'express'
import path from 'path'
import compression from 'compression'
import cors from 'cors'
import fs from 'fs'

const app = express()
const PORT = process.env.PORT || 3000

// Enable CORS
app.use(cors())

// Compress responses
app.use(compression())

// Determine the correct path to serve static files
const distPath = path.join(__dirname, '../../dist/renderer')
const altDistPath = path.join(__dirname, '../../dist/web')

// Check if the renderer directory exists, otherwise use the web directory
const staticPath = fs.existsSync(distPath) ? distPath : altDistPath
console.log(`Serving static files from: ${staticPath}`)

// Serve static files
app.use(express.static(staticPath))

// For any other route, send the index.html
app.get('*', (_, res) => {
    const indexPath = path.join(staticPath, 'index.html')

    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath)
    } else {
        res.status(404).send('Cannot find index.html. Make sure to run "npm run build:web" before starting the server.')
    }
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
