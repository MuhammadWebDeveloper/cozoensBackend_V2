// middleware/role.middleware.js
export const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin only."
        });
    }
    next();
};

export const ownerOnly = (req, res, next) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: "Access denied. Owner only."
        });
    }
    next();
};