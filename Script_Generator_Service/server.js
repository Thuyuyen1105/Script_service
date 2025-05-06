require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors')
const scriptRoutes = require('./src/routes/scriptRoutes');

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}))

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/api/scripts', scriptRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Script Generator running on port ${PORT}`));
