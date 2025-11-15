const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const connectToDatabase = require('../models/db');
const pino = require('pino');
const dotenv = require('dotenv');

const logger = pino();

dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res, next) => {
  logger.info('/register called');
  try {
    const db = await connectToDatabase();
    const collection = db.collection('users');

    const { email, password, firstName, lastName } = req.body;
    const existingEmail = await collection.findOne({ email: email });
    if (existingEmail) {
      logger.error('Email id already exists')
      return res.status(400).json({ error: 'Email id already exists' });
    }

    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(password, salt);

    const newUser = await collection.insertOne({
      email: email,
      firstName: firstName,
      lastName: lastName,
      password: hash,
      createdAt: new Date(),
    });

    const payload = {
      user: {
        id: newUser.insertedId,
      },
    };

    const authtoken = jwt.sign(payload, JWT_SECRET);
    logger.info('User registered successfully')

    res.json({ authtoken, email })
  } catch (e) {
    logger.error(e)
    return res.status(500).send('Internal server error');
  }
})

router.post('/login', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('users');

    const { email } = req.body;

    const theUser = await collection.findOne({ email: email });

    if (theUser) {
      let result = await bcryptjs.compare(req.body.password, theUser.password);
      if (!result) {
        logger.error('Passwords do not match')
        return res.status(404).json({ error: 'Wrong pasword' });
      }

      const userName = theUser.firstName;
      const userEmail = theUser.email;

      let payload = {
        user: {
          id: theUser._id.toString(),
        },
      };
      const authtoken = jwt.sign(payload, JWT_SECRET);
      logger.info('User logged in successfully')
      return res.status(200).json({ authtoken, userName, userEmail });
    } else {
      logger.error('User not found')
      return res.status(404).json({ error: 'User not found' });
    }
  } catch (e) {
    logger.error(e)
    return res.status(500).send('Internal server error');
  }
})

router.put(
  '/update',
  [
    body('firstName')
      .optional()
      .notEmpty()
      .withMessage('First name cannot be empty'),
    body('lastName')
      .optional()
      .notEmpty()
      .withMessage('Last name cannot be empty'),
    body('password')
      .optional()
      .notEmpty()
      .withMessage('Password cannot be empty'),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      logger.error('Validation errors in update request', errors.array())
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const email = req.headers.email;
      if (!email) {
        logger.error('Email not found in the request headers')
        return res
          .status(400)
          .json({ error: 'Email not found in the request headers' });
      }

      const db = await connectToDatabase();
      const collection = db.collection('users');

      const existingUser = await collection.findOne({ email });
      if (!existingUser) {
        logger.error('User not found')
        return res.status(404).json({ error: 'User not found' });
      }
      existingUser.firstName = req.body.name;
      existingUser.updatedAt = new Date();

      const updatedUser = await collection.findOneAndUpdate(
        { email },
        { $set: existingUser },
        { returnDocument: 'after' },
      );

      const payload = {
        user: {
          id: updatedUser._id.toString(),
        },
      };
      const authtoken = jwt.sign(payload, JWT_SECRET);
      logger.info('User updated successfully')
      res.json({ authtoken })
    } catch (error) {
      logger.error(error)
      return res.status(500).send('Internal Server Error');
    }
  },
)

module.exports = router;
