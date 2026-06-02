// Backend/src/utils/generateToken.js
import jwt from 'jsonwebtoken';

const generateToken = (id, role) => {  // ✅ Add role parameter
    return jwt.sign(
        { id: id, role: role },  // ✅ Include role in token
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

export default generateToken;