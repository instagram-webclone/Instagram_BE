const express = require("express");

const { isAuth } = require("../middlewares/authMiddleware");
const {
  getChatList,
  getChatData,
  makeChatRoom,
} = require("../controllers/chatController");

const router = express.Router();

router.get("/", isAuth, getChatList);
router.get("/:roomId", getChatData);
router.post("/:roomId", isAuth, makeChatRoom);

module.exports = router;
