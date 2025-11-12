import express from "express";
import User from "../models/user.model.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
    res.json({ token: "fake-jwt-token", user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
