const express = require("express");

const { isAuth } = require("../middlewares/authMiddleware");
const { search, showData } = require("../controllers/searchController");

const router = express.Router();

router.get("/search", isAuth, search);
router.get("/search/:keyword", isAuth, showData);

module.exports = router;
