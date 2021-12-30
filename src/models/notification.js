const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  notiType: { type: String },
  receiveUser: { type: mongoose.Schema.Types.ObjectId },
  sendUser: { type: mongoose.Schema.Types.ObjectId },
  postId: { type: mongoose.Schema.Types.ObjectId },
  date: { type: Date, expires: "1h" },
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
