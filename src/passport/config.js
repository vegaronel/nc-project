import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { config } from "dotenv";
import pool from "../database/database-connection.js";

config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Serialize and deserialize user (for session management)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Configure the Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback", // Ensure this matches your Google Cloud configuration
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);   

// Configure the Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "displayName",
    },
    async (displayName, password, done) => {
      try {
        // Find the user by username
        const userResult = await pool.query(
          'SELECT * FROM users WHERE "displayName" = $1',
          [displayName]
        );

        if (userResult.rowCount === 0) {
          return done(null, false, { message: "Incorrect username." });
        }

        const user = userResult.rows[0];

        // Validate the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        // Authentication successful
        return done(null, user);
      } catch (error) {
        console.error("Error in LocalStrategy:", error.message);
        return done(error);
      }
    }
  )
);

// Export Passport
export default passport;
