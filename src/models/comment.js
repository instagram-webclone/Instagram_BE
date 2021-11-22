const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId },
  writer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  contents: { type: String },
  childCommentId: [
    { type: mongoose.Schema.Types.ObjectId, ref: "ReplyComment" },
  ],
  createdAt: { type: String },
  like: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
