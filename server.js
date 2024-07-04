const io = require("socket.io")(server, {
  cors: {
    origin: "https://share-hub-pi.vercel.app",
    // origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};
const fileChunks = {}; // Store file chunks temporarily

io.on("connection", (socket) => {
  console.log("a user connected :", socket.id);
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("createRoom", (data) => {
    const { roomId } = data;
    rooms[roomId] = { creator: socket.id };
    socket.join(roomId);
    console.log("Room created:", roomId);
  });

  socket.on("joinRoom", (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
      socket.join(roomId);
      io.to(roomId).emit("redirectToShare", { roomId });
      console.log("User joined room:", roomId);
    } else {
      socket.emit("error", { message: "Room does not exist" });
      console.log("Room does not exist:", roomId);
    }
  });

  socket.on(
    "sendFileChunk",
    ({ fileName, chunk, chunkIndex, totalChunks, roomId }) => {
      if (!fileChunks[fileName]) {
        fileChunks[fileName] = [];
      }

      fileChunks[fileName][chunkIndex] = Buffer.from(chunk);

      const receivedChunks = fileChunks[fileName].filter(Boolean).length;

      if (receivedChunks === totalChunks) {
        const fileBuffer = Buffer.concat(fileChunks[fileName]);
        io.to(roomId).emit("fileReceived", {
          fileName,
          fileData: fileBuffer.toString("base64"),
        });
        delete fileChunks[fileName]; // Clean up memory
      }
    }
  );

  // for chat section
  socket.on("message", ({ message, roomId }) => {
    console.log(message, roomId);
    roomId
      ? io.to(roomId).emit("message", { message })
      : io.emit("message", { message });
  });

  socket.on("join", ({ roomId }) => {
    socket.join(roomId);
    console.log("joined room", roomId, socket.id);
  });
});
