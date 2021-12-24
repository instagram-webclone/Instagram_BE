const express = require("express");

const { isAuth } = require("../middlewares/authMiddleware");
const {
  writeComment,
  writeReplyComment,
  deleteComment,
  commentLike,
  showCommentLikeUsers,
} = require("../controllers/commentController");

const router = express.Router();

router.post("/:postId", isAuth, writeComment);
router.post("/:postId/:commentId", isAuth, writeReplyComment);
router.delete("/:postId/:commentId", isAuth, deleteComment);
router.put("/:commentId/like", isAuth, commentLike);
router.get("/:commentId/likeUsers", isAuth, showCommentLikeUsers);

module.exports = router;
