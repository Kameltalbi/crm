import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import auth from '../middleware/auth.js';
import { getUploadsDir } from '../lib/uploadsDir.js';

export const uploadRoutes = Router();
uploadRoutes.use(auth);

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    const uploadDir = getUploadsDir();
    console.log('Upload directory:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Saving file:', filename);
    cb(null, filename);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

uploadRoutes.post('/', upload.single('file'), (req: any, res: any) => {
  console.log('Upload request received');
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  console.log('File saved:', req.file);
  const url = `/api/uploads/${req.file.filename}`;
  console.log('Returning URL:', url);
  res.json({ url });
});
