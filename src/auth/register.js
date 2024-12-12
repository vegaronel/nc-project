import express from "express";
import pool from "../database/database-connection.js";
import bcrypt from "bcrypt";
const app = express();

//REGISTER VIEW
app.get("/register", (req, res) => {
  res.render("signup.ejs");
});

//REGISTER NEW USER
app.post("/register", async (req, res) => {
  const { displayName, password } = req.body;
  if (!displayName || !password) {
    return res.status(400).send("Missing required fields.");
  }
  const hashedPassword = await bcrypt.hash(password, 5);
  const values = [displayName, hashedPassword, "local", ""];

  const checkUser = await pool.query(
    "SELECT * FROM users WHERE 'displayName' = $1",
    [displayName]
  );

  if (checkUser.rowCount > 0) {
    return res.send({
      status: "failed",
      msg: "Username already exists!",
    });
  }

  const response = await pool.query(
    'INSERT INTO users ("displayName", password, type, email) VALUES($1, $2, $3, $4) RETURNING *',
    values
  );
  res.redirect("/auth/login?status=success&msg=Registration%20Successful!");
});


export default app;
