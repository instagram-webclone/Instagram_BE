const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  roomId: { type: String },
  participant: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // chats: [{ type: Object }],
  chats: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      message: String,
    },
  ],
});

chatSchema.pre("save", function (next) {
  if (this.chats.length >= 10) {
    const sliceChat = this.chats.slice(-10, this.chats.length);
    this.chats = sliceChat;
  }
  next();
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
