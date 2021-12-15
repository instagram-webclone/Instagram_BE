const express = require("express");

const { isAuth } = require("../middlewares/authMiddleware");
const {
  search,
  getHashtagSearchResult,
} = require("../controllers/searchController");

const router = express.Router();

router.get("/search", isAuth, search);
router.get("/search/:keyword", isAuth, getHashtagSearchResult);

module.exports = router;
