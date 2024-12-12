import bodyParser from "body-parser";
import express from "express";
import auth from "./routes/auth.js";
import play from "./routes/play.js";
import { config } from "dotenv";
import passport from "passport";
import session from "express-session";

import http from "http";
import { Server } from "socket.io";
import pool from "./components/database-connection.js";

config(); // Load environment variables

const app = express();
const port = 3000;

const sessionMiddleware = session({
    secret: "jesterkey",
    resave: false,
    saveUninitialized: false,
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

const server = http.createServer(app);
const io = new Server(server);

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});
io.on("connection", (socket) => {
    const session = socket.request.session;

    if (!session || !session.passport || !session.passport.user) {
        console.error("Unauthenticated socket connection");
        return socket.disconnect();
    }

    const username = session.passport.user.displayName;
    console.log(`${username} connected`);

    socket.on("joinRoom", (room) => {
        socket.join(room);
        console.log(`${username} joined room: ${room}`);
        console.log(io.sockets.adapter.rooms);
    });

    socket.on("fetchRoomMessages", async (room) => {
        try {
            const { rows: messages } = await pool.query(
                `SELECT "displayName" AS sender, message, created_at 
                 FROM messages 
                 WHERE room = $1 
                 ORDER BY created_at ASC`,
                [room]
            );
            socket.emit("roomMessages", messages);
        } catch (err) {
            console.error("Error fetching messages:", err);
            socket.emit("roomMessages", []);
        }
    });

    socket.on("typing", ({ room }) => {
        socket.to(room).emit("typing", { sender: username });
        console.log(`${username} is typing in room: ${room}`);
    });
    
    socket.on("stopTyping", ({ room }) => {
        socket.to(room).emit("stopTyping");
    });
        
    socket.on("message", async ({ message, room }) => {
        try {
            // Save the message to the database
            const result = await pool.query(
                `INSERT INTO messages ("displayName", message, room) VALUES ($1, $2, $3) RETURNING created_at`,
                [username, message, room]
            );
    
            const createdAt = result.rows[0].created_at;
    
            const messageData = { sender: username, message, created_at: createdAt };
            console.log(`Broadcasting to room ${room}:`, messageData);

            // Broadcast the message to all clients in the room
            io.to(room).emit("message", messageData);
    
            console.log(`Message from ${username} to room ${room}: ${message}`);
        } catch (err) {
            console.error("Error saving message:", err);
        }
    });
    

    socket.on("disconnect", () => {
        console.log(`${username} disconnected`);
    });
});

app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/", auth);
app.use(play);

server.listen(port, () => {
    console.log(`Listening on Port ${port}`);
});
