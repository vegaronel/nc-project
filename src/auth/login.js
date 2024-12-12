import express from "express";
import passport from "../passport/config.js";

const app = express();

//LOGIN VIEW
app.get("/login", (req, res) => {
  res.render("signin.ejs");
});

app.post("/login", passport.authenticate("local"), (req, res) => {
    // try {
    //   const redirectTo =  "/dashboard"; // Default to dashboard
    //   const [key, value] = Object.entries(req.query)[0];
    //   console.log(value);
    //   if (value) res.redirect(`/send?user=${value}`); // Redirect the user
    //   else res.redirect(redirectTo);
    // } catch (error) {
    //   console.error("Login error:", error.message);
    //   res.status(500).send("Internal Server Error");
    // }
});

//GOOGLE AUTHENTICATION
// Google OAuth Routes
app.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      console.log(req.user);
      const { displayName } = req.user;
      const email = req.user.emails[0].value;

      const checkData = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (checkData.rowCount === 0) {
        const addData = await pool.query(
          'INSERT INTO users ("displayName", password, type, email) VALUES($1, $2, $3, $4) RETURNING *',
          [displayName, "", "google", email]
        );
        if (!addData) throw new Error("Error Adding Data");
      }

      const redirectTo = req.session.redirectTo || "/dashboard"; // Default to dashboard
      delete req.session.redirectTo; // Clear the session variable
      res.redirect(redirectTo); // Redirect the user
    } catch (error) {
      console.error("Error in Google OAuth callback:", error.message);
      res.status(500).send("Internal Server Error");
    }
  }
);
export default app;
