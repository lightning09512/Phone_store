const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function readJSON(fileName, fallback) {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    console.error(`Lỗi đọc ${fileName}`, error);
    throw error;
  }
}

async function writeJSON(fileName, payload) {
  const filePath = path.join(DATA_DIR, fileName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

app.get('/api/products', async (_req, res) => {
  const products = await readJSON('products.json', []);
  res.json(products);
});

app.get('/api/orders', async (_req, res) => {
  const orders = await readJSON('orders.json', []);
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const { customer, cart, payment } = req.body;

  if (!customer?.fullName || !customer?.email || !customer?.address) {
    return res.status(400).json({ message: 'Thiếu thông tin khách hàng' });
  }

  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ message: 'Giỏ hàng trống' });
  }

  const orders = await readJSON('orders.json', []);
  const newOrder = {
    id: `ORD-${Date.now()}`,
    customer,
    cart,
    payment: payment || { method: 'cod' },
    status: 'processing',
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  await writeJSON('orders.json', orders);

  res.status(201).json(newOrder);
});

app.post('/api/users', async (req, res) => {
  const { fullName, email, phone } = req.body;
  if (!fullName || !email) {
    return res.status(400).json({ message: 'Thiếu tên hoặc email' });
  }

  const users = await readJSON('users.json', []);
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (existing) {
    return res.status(200).json(existing);
  }

  const newUser = {
    id: `USR-${Date.now()}`,
    fullName,
    email,
    phone: phone || '',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await writeJSON('users.json', users);
  res.status(201).json(newUser);
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Phone Store đang chạy tại http://localhost:${PORT}`);
});

