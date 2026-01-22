import express from "express";
import * as userController from "../controllers/userController.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

router.get("/me", auth, userController.getMyProfile);
router.put("/me", auth, userController.updateMyProfile);
router.delete("/me", auth, userController.deleteMyAccount);
router.put("/me/password", auth, userController.changeMyPassword);

// ✅ Nova Brand Kit
router.get("/me/brand-kit", auth, userController.getMyBrandKit);
router.put("/me/brand-kit", auth, userController.updateMyBrandKit);

export default router;
