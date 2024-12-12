import express from "express";
import pool from "../database/database-connection.js";
import bcrypt from "bcrypt";
const app = express();

//REGISTER VIEW
app.post("/register", async (req, res) => {
  try {
    const { displayName, email, password } = req.body;

    // Validate inputs
    if (!displayName || !password) {
      return res.status(400).json({
        status: "failed",
        msg: "Missing required fields."
      });
    }

    // Ensure email is either a valid email or an empty string
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    // Validate email format if provided
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        status: "failed",
        msg: "Invalid email format."
      });
    }

    // Check for existing username or email
    const checkUser = await pool.query(
      'SELECT * FROM users WHERE LOWER("displayName") = LOWER($1) OR (email != \'\' AND LOWER(email) = $2)',
      [displayName, normalizedEmail]
    );

    if (checkUser.rowCount > 0) {
      return res.status(400).json({
        status: "failed",
        msg: "Username or email already exists!"
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user
    await pool.query(
      'INSERT INTO users ("displayName", password, type, email) VALUES($1, $2, $3, $4)',
      [displayName, hashedPassword, "local", normalizedEmail]
    );

    // Redirect after successful registration
    res.redirect("/auth/login?status=success&msg=Registration%20Successful!");

  } catch (err) {
    console.error("Full Registration Error:", err);

    // Detailed error logging
    if (err.code === '23505') {
      console.error("Unique Constraint Violation Details:", {
        errorCode: err.code,
        errorDetail: err.detail,
        errorTable: err.table,
        errorConstraint: err.constraint
      });

      return res.status(400).json({
        status: "failed",
        msg: "Registration failed. Please check your email or username.",
        errorDetails: err.detail
      });
    }

    // Generic error handler
    return res.status(500).json({
      status: "failed",
      msg: "Internal server error during registration.",
      errorDetails: err.message
    });
  }
});



export default app;
