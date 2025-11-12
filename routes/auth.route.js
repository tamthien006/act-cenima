// routes/auth.route.js
import express from "express";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    const token = jwt.sign({ id: user._id, role: user.role }, "secret_key");
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
