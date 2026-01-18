import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'temp_' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', async (req, res) => {
  try {
    const [books] = await db.query('SELECT * FROM books ORDER BY created_at DESC');

    const stats = {
      total: books.length,
      unread: books.filter((b) => b.status === 'unread').length,
      reading: books.filter((b) => b.status === 'reading').length,
      read: books.filter((b) => b.status === 'read').length,
    };

    res.render('index', { books, stats });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database Error');
  }
});

app.get('/add', (req, res) => {
  res.render('add');
});

app.post('/api/books', upload.single('image'), async (req, res) => {
  try {
    const { title, author, memo, total_pages } = req.body;
    const [result] = await db.query('INSERT INTO books (title, author, memo, total_pages) VALUES (?, ?, ?, ?)', [title, author, memo, total_pages || 0]);

    const bookId = result.insertId;
    let imageFilename = null;

    if (req.file) {
      const ext = path.extname(req.file.originalname);
      imageFilename = `book_${bookId}${ext}`;
      const oldPath = req.file.path;
      const newPath = path.join('public/uploads/', imageFilename);

      fs.renameSync(oldPath, newPath);

      await db.query('UPDATE books SET image_filename = ? WHERE id = ?', [imageFilename, bookId]);
    }

    res.status(201).json({ message: 'Book added', id: bookId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error' });
  }
});

app.get('/api/books', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM books');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error' });
  }
});

app.patch('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { status, current_page, memo, total_pages } = req.body;

    if (current_page !== undefined) {
      const [rows] = await db.query('SELECT total_pages FROM books WHERE id = ?', [id]);
      if (rows.length > 0) {
        const dbTotalPages = rows[0].total_pages;
        if (dbTotalPages > 0 && parseInt(current_page) >= dbTotalPages) {
          status = 'read';
        }
      }
    }

    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (current_page !== undefined) {
      updates.push('current_page = ?');
      values.push(current_page);
    }
    if (memo !== undefined) {
      updates.push('memo = ?');
      values.push(memo);
    }
    if (total_pages !== undefined) {
      updates.push('total_pages = ?');
      values.push(total_pages);
    }

    if (updates.length > 0) {
      values.push(id);
      await db.query(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    res.json({ message: 'Update successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error' });
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query('SELECT image_filename FROM books WHERE id = ?', [id]);
    if (rows.length > 0 && rows[0].image_filename) {
      const filePath = path.join('public/uploads/', rows[0].image_filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.query('DELETE FROM books WHERE id = ?', [id]);
    res.json({ message: 'Book deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
