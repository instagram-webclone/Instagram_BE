const http = require("http");
const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");

const moment = require("./moment");

const Post = require("../src/models/post");
const User = require("../src/models/user");

module.exports = (app) => {
  const httpServer = http.createServer(app);
  const socketServer = new socketIO.Server(httpServer, {
    cors: { origin: "*" },
  });

  const connectedUser = {};
  socketServer
    .use(async (socket, next) => {
      const token = socket.handshake.headers.authorization;
      if (token !== "null") {
        const { userId: id } = await jwt.verify(token, process.env.JWT_KEY);
        const user = await User.findById(id, {
          userId: 1,
          profileImage: 1,
        }).lean();
        socket.user = {
          id: user._id,
          userId: user.userId,
          profileImage: user.profileImage,
        };
        next();
      }
    })
    .on("connection", (socket) => {
      const req = socket.request;
      const { id, userId, profileImage } = socket.user;
      connectedUser[id] = socket.id;
      console.log("Client connected " + socket.id);
      console.log(connectedUser);
      socket.on("disconnect", () => {
        delete connectedUser[id];
        console.log("Client disconnected ", socket.id);
        console.log(connectedUser);
      });
      socket.on("postLike", async (postId, targetId) => {
        try {
          const post = await Post.findById(postId, { imageUrl: 1 }).lean();
          if (connectedUser[targetId]) {
            socket.to(connectedUser[targetId]).emit("postLike", {
              notiType: "like",
              post,
              sendUser: { userId, profileImage },
              date: moment().format("YYYY-MM-DD HH:mm:ss"),
            });
          }
        } catch (error) {
          console.log(error);
        }
      });
      socket.on("follow", async (targetId) => {
        try {
          const user = await User.findById(targetId, { profileImage: 1 });
          if (connectedUser[targetId]) {
            socket.to(connectedUser[targetId]).emit("follow", {
              notiType: "follow",
              user,
              date: moment().format("YYYY-MM-DD HH:mm:ss"),
            });
          }
        } catch (error) {
          console.log(error);
        }
      });
    });

  httpServer.listen(app.get("port"), () => {
    console.log(`✅ Server listening on http://localhost:${app.get("port")}`);
  });
};
