/**
 * File parsers for different file types
 *
 * This module provides utilities to extract text content from different file types.
 */

// PDF.js for PDF parsing
import * as pdfjs from 'pdfjs-dist'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

// Set the PDF.js worker source
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry')
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

/**
 * Reads and extracts text content from a file based on its type
 * @param file The file to read
 * @returns A promise resolving to the file content as text
 */
export async function parseFile(file: File): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''

    // Text files
    const textExtensions = [
        'txt',
        'json',
        'md',
        'js',
        'ts',
        'jsx',
        'tsx',
        'py',
        'java',
        'c',
        'cpp',
        'cs',
        'html',
        'css',
        'sql',
        'xml',
        'yml',
        'yaml',
        'sh',
        'log',
        'csv',
        'ini',
    ]
    if (textExtensions.includes(extension)) {
        return readTextFile(file)
    }

    // PDF documents
    if (extension === 'pdf') {
        try {
            return await extractPdfContent(file)
        } catch (error) {
            console.error('Error parsing PDF:', error)
            return `[Error parsing PDF: ${error.message}]`
        }
    }

    // Microsoft Word documents
    if (['doc', 'docx'].includes(extension)) {
        try {
            return await extractWordContent(file)
        } catch (error) {
            console.error(`Error parsing Word document:`, error)
            return `[Error parsing Word document: ${error.message}]`
        }
    }

    // Microsoft Excel documents
    if (['xls', 'xlsx'].includes(extension)) {
        try {
            return await extractExcelContent(file)
        } catch (error) {
            console.error(`Error parsing Excel document:`, error)
            return `[Error parsing Excel document: ${error.message}]`
        }
    }

    // PowerPoint documents (basic handling since full parsing is more complex)
    if (['ppt', 'pptx'].includes(extension)) {
        try {
            // PowerPoint parsing is more complex, we'll try to read as text first
            // but most likely will return the fallback message
            return await readBinaryFileAsText(file, `[PowerPoint presentation: ${file.name}]`)
        } catch (error) {
            return `[PowerPoint presentation: ${file.name}]`
        }
    }

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
        return `[Image file: ${file.name}]`
    }

    // Default case: try to read as text, fall back to binary info
    try {
        return await readTextFile(file)
    } catch (error) {
        return `[Binary or unsupported file: ${file.name}]`
    }
}

/**
 * Get a human-readable document type label
 */
function getDocumentTypeLabel(extension: string): string {
    switch (extension) {
        case 'doc':
        case 'docx':
            return 'Word'
        case 'xls':
        case 'xlsx':
            return 'Excel'
        case 'ppt':
        case 'pptx':
            return 'PowerPoint'
        default:
            return 'Office'
    }
}

/**
 * Reads text content from a text file
 */
function readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as string)
            } else {
                reject(new Error('Failed to read file'))
            }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsText(file)
    })
}

/**
 * Reads a binary file and returns a text representation or fallback message
 */
function readBinaryFileAsText(file: File, fallbackMessage: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Try to read the file as text first
        const reader = new FileReader()

        reader.onload = (event) => {
            try {
                if (event.target?.result) {
                    const content = event.target.result as string
                    // Check if the content is mostly readable text
                    if (isProbablyText(content)) {
                        resolve(content)
                    } else {
                        resolve(fallbackMessage + '\n[Binary content detected]')
                    }
                } else {
                    resolve(fallbackMessage)
                }
            } catch (error) {
                resolve(fallbackMessage)
            }
        }

        reader.onerror = () => resolve(fallbackMessage)
        reader.readAsText(file)
    })
}

/**
 * Checks if a string is probably human-readable text
 */
function isProbablyText(str: string): boolean {
    // If more than 10% of the characters are null bytes or control characters,
    // it's probably binary data
    const nonPrintableCount = (str.match(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g) || []).length
    return nonPrintableCount / str.length < 0.1
}

/**
 * Extracts text from PDF documents using PDF.js
 */
async function extractPdfContent(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

    let fullText = ''

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ')

        fullText += `--- Page ${i} ---\n${pageText}\n\n`
    }

    return fullText
}

/**
 * Extracts text from Word documents using mammoth.js
 */
async function extractWordContent(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()

    try {
        const result = await mammoth.extractRawText({ arrayBuffer })
        return result.value || `[Empty Word document: ${file.name}]`
    } catch (error) {
        console.error('Mammoth extraction error:', error)
        // Fallback to trying to read the file as text
        return readBinaryFileAsText(file, `[Word document: ${file.name}]`)
    }
}

/**
 * Extracts text from Excel spreadsheets using xlsx library
 */
async function extractExcelContent(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()

    try {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        let result = ''

        // Process each sheet
        workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName]
            result += `--- Sheet: ${sheetName} ---\n`

            // Convert sheet to JSON to extract cell values
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

            // Format the data as a text table
            for (const row of jsonData) {
                if (Array.isArray(row) && row.length > 0) {
                    result += row.join('\t') + '\n'
                }
            }
            result += '\n'
        })

        return result || `[Empty Excel file: ${file.name}]`
    } catch (error) {
        console.error('Excel extraction error:', error)
        // Fallback to trying to read the file as text
        return readBinaryFileAsText(file, `[Excel document: ${file.name}]`)
    }
}

/**
 * Helper function to read the file as DataURL
 * Useful for images or other binary files
 */
export function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as string)
            } else {
                reject(new Error('Failed to read file as data URL'))
            }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsDataURL(file)
    })
}
