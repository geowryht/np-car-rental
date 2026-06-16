import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js'

export const protect = (req, res, next) => {
    const token = req.cookies?.access_token;

    if (!token) throw new AppError("Not authorized", 401);

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        throw new AppError("Invalid token", 401);
    }
}
