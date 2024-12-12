import express from "express";
import pool from "../database/database-connection.js";
import bcrypt from "bcrypt";
const app = express();

//REGISTER VIEW
app.get("/register", (req, res) => {
  res.render("signup.ejs");
});
// REGISTER NEW USER
app.post("/register", async (req, res) => {
  try {
    const { displayName, password } = req.body;

    if (!displayName || !password) {
      return res.status(400).send("Missing required fields.");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 5);
    const values = [displayName, hashedPassword, "local", ""]; // Assuming email is left blank for now

    // Check if the username (displayName) already exists
    const checkUser = await pool.query(
      "SELECT * FROM users WHERE displayName = $1",  // Fixed column reference
      [displayName]
    );

    if (checkUser.rowCount > 0) {
      return res.send({
        status: "failed",
        msg: "Username already exists!",
      });
    }

    // Insert the new user into the database
    const response = await pool.query(
      'INSERT INTO users ("displayName", password, type, email) VALUES($1, $2, $3, $4) RETURNING *',
      values
    );

    // Redirect after successful registration
    res.redirect("/auth/login?status=success&msg=Registration%20Successful!");
  } catch (err) {
    // Log the error for debugging
    console.error("Error during registration:", err);

    // Send an error response to the client
    if (err.code === '23505') {  // 23505 is the unique violation error code
      return res.status(400).send({
        status: "failed",
        msg: "Username or Email already exists!",
      });
    }

    // For other errors, send a generic message
    return res.status(500).send({
      status: "failed",
      msg: "Internal server error during registration. Please try again later.",
    });
  }
});



export default app;
