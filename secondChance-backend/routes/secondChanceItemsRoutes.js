const express = require('express')
const multer = require('multer')
const router = express.Router()
const connectToDatabase = require('../models/db')
const logger = require('../logger')

// Define the upload directory path
const directoryPath = 'public/images'

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath) // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname) // Use the original file name
  }
})

const upload = multer({ storage })

// Get all secondChanceItems
router.get('/', async (req, res, next) => {
  logger.info('/ called')
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const secondChanceItems = await collection.find({}).toArray()
    res.json(secondChanceItems)
  } catch (e) {
    logger.console.error('oops something went wrong', e)
    next(e)
  }
})

// Add a new item
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const newItem = req.body
    if (req.file) {
      newItem.image = req.file.filename
    }
    const secondChanceItem = await collection.insertOne(newItem)
    res.status(201).json(secondChanceItem.ops[0])
  } catch (e) {
    next(e)
  }
})

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      return res.status(404).json({ message: 'Item not found' })
    }
    res.json(secondChanceItem)
  } catch (e) {
    next(e)
  }
})

// Update and existing item
router.put('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const id = req.params.id
    const updateItem = req.body
    const secondChanceItem = await collection.findOneAndUpdate(
      { id },
      { $set: updateItem },
      { returnDocument: 'after' }
    )
    if (secondChanceItem.matchedCount === 0) {
      return res.status(404).json({ message: 'Item not found' })
    }
    res.json({ id, message: 'Item has been updated successfully' })
  } catch (e) {
    next(e)
  }
})

// Delete an existing item
router.delete('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const id = req.params.id
    const result = await collection.deleteOne({ id })
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found' })
    }
    res.json({ id, message: 'Item has been deleted successfully' })
  } catch (e) {
    next(e)
  }
})

module.exports = router
