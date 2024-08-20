const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const config = require("../config/env");
const { AppError } = require("../middleware/errorHandler");

class UserService {
  async createUser({ username, email, password }) {
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      const field = existing.username === username ? "Username" : "Email";
      throw new AppError(`${field} already exists.`, 409);
    }

    const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

    const user = await User.create({
      username,
      password: hashedPassword,
      email,
    });

    const token = this.generateToken(user._id);
    return { token, userId: user._id, username: user.username };
  }

  async authenticateUser({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) throw new AppError("Invalid credentials.", 401);

    // Account lockout check
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${mins} minute(s).`, 423);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed attempts
      const updates = { $inc: { loginAttempts: 1 } };
      if ((user.loginAttempts || 0) + 1 >= config.maxLoginAttempts) {
        updates.$set = { lockUntil: new Date(Date.now() + config.lockoutDuration) };
        updates.$inc = { loginAttempts: 1 };
      }
      await User.findByIdAndUpdate(user._id, updates);
      throw new AppError("Invalid credentials.", 401);
    }

    // Reset attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      await User.findByIdAndUpdate(user._id, {
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 },
      });
    }

    const token = this.generateToken(user._id);
    return { token, userId: user._id, username: user.username };
  }

  async getUserById(id) {
    const user = await User.findById(id)
      .select("-password -loginAttempts -lockUntil")
      .populate("repositories")
      .populate("starRepos")
      .populate("followedUsers", "username email");

    if (!user) throw new AppError("User not found.", 404);
    return user;
  }

  async listUsers({ page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({})
        .select("-password -loginAttempts -lockUntil")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(),
    ]);

    return { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async updateUser(id, updates) {
    const fields = {};
    if (updates.email) fields.email = updates.email;
    if (updates.username) fields.username = updates.username;
    if (updates.password) {
      fields.password = await bcrypt.hash(updates.password, config.bcryptRounds);
    }

    const user = await User.findByIdAndUpdate(id, fields, {
      new: true,
      runValidators: true,
    }).select("-password -loginAttempts -lockUntil");

    if (!user) throw new AppError("User not found.", 404);
    return user;
  }

  async deleteUser(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new AppError("User not found.", 404);
    return { message: "User deleted successfully." };
  }

  generateToken(userId) {
    return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: config.jwtExpiry });
  }
}

module.exports = new UserService();
