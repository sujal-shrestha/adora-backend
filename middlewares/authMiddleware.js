import jwt from 'jsonwebtoken';

const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token, access denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();

  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default protect;
