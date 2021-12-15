const mongoose = require("mongoose");

const hashtagFollowSchema = new mongoose.Schema({
  hashtag: { type: String },
  followUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const HashtagFollow = mongoose.model("HashtagFollow", hashtagFollowSchema);

module.exports = HashtagFollow;
