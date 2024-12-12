import express from "express";
import passport from "../components/passport-config.js";
import checkAuth from "../middleware/authCheck.js";
import pool from "../components/database-connection.js";

import bcrypt from "bcrypt";
const app = express();

app.get("/", (re, res) => {
  return res.render("landing-page.ejs");
});

app.get("/signup", (re, res) => {
  return res.render("signup.ejs");
});

app.get("/signin", (re, res) => {
  return res.render("signin.ejs",{link:null});
});

// Google OAuth Routes
app.get("/google", (req, res) => {
  res.send('<h1>Home</h1><a href="/auth/google">Login with Google</a>');
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
  
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      console.log(req.user);
      const { displayName } = req.user;
      const email = req.user.emails[0].value;
      console.log("Google",req.url)
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

// Local Auth Routes
app.get("/login", (req, res) => {
  let link = "";
  if (req.query.redirectedTo) {
    link = req.query.redirectedTo;
  }
  // console.log(req.query.redirectedTo)
  res.render("signin.ejs", { link: link});
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err.message);
      return res.status(500).send("Internal Server Error");
    }
    if (!user) {
      // Handle invalid credentials
      console.error("Login failed:", info.message);
      return res.redirect("/login?error=" + encodeURIComponent(info.message));
    }
    // Log the user in
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error("Login error:", loginErr.message);
        return res.status(500).send("Internal Server Error");
      }
      console.log("QUERY", req.query);  // Log query parameters for debugging

      // Default redirect
      const redirectTo = "/dashboard"; 

      // Check for the 'user' parameter in the query string
      const { redirectedTo, user: userFromQuery } = req.query;
      if (userFromQuery) {
        // If 'user' parameter exists, redirect to '/send?user=' with the value
        return res.redirect(`/send?user=${userFromQuery}`);
      }
      if(req.body.user){
        return res.redirect(req.body.user);

      }else{
        return res.redirect(redirectTo);

      }
      console.log(req.body)
      // Otherwise, redirect to default route
    });
  })(req, res, next);
});



app.post("/signup", async (req, res) => {
  try {
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

    // res.send({
    //   status: "success",
    //   msg: "Registration Successful",
    //   data: response.rows[0],
    // });
    res.redirect("/login");
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// Dashboard Route
app.get("/dashboard", checkAuth, async (req, res) => {
  //RoUTE TO
  const hashedUser = await bcrypt.hash(req.user.displayName, 10);
  const status = req.query==undefined?"None":req.query
  console.log(status)
  // return res.send(`http://localhost:3000/send?user=${hashedUser}`);
  return res.render(`dashboard.ejs`, {
    user: req.user.displayName,
    url: `http://localhost:3000/send?user=${hashedUser}`,
  });
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err.message);
      return next(err);
    }
    req.session.destroy(); // Optional: Destroy the session
    res.redirect("/"); // Redirect to the homepage or login page
  });
});

export default app;
