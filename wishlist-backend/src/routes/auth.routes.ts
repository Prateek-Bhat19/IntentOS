import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { signupSchema, loginSchema } from "../validations/auth.validation";
import { authRateLimit } from "../middlewares/authRateLimit.middleware";

const router = Router();

router.post("/signup", authRateLimit, validate(signupSchema), AuthController.signup);
router.post("/login", authRateLimit, validate(loginSchema), AuthController.login);

export default router;
