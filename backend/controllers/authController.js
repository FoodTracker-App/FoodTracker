import { loginSchema, signupSchema } from "../validators/authValidators.js";
import * as authService from "../services/authService.js";
import {
  ACCESS_TOKEN_SECONDS,
  AUTH_COOKIE,
  cookieOptions,
} from "../config/auth.js";
import { httpError } from "../utils/errors.js";

const sendSession = (res, result, status) => {
  res.cookie(AUTH_COOKIE, result.token, {
    ...cookieOptions(),
    maxAge: ACCESS_TOKEN_SECONDS * 1000,
  });
  return res.status(status).json({
    ...result.user,
    accessToken: result.token,
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_SECONDS,
  });
};

export const signup = async (req, res, next) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      const detail = error.details[0];
      const messages = {
        firstName: "First name is required (maximum 120 characters).",
        lastName: "Last name is required (maximum 120 characters).",
        email: "A valid email is required (maximum 254 characters).",
        password: "Password is required and must not exceed 72 UTF-8 bytes.",
        confirmPassword:
          "Password confirmation is required and must match password.",
      };
      const message =
        detail.type === "name.length"
          ? "Full name must not exceed 120 characters."
          : Object.hasOwn(messages, detail.path[0])
            ? messages[detail.path[0]]
            : "Provide only firstName, lastName, email, password, and confirmPassword.";
      throw httpError(400, "VALIDATION_ERROR", message);
    }
    const result = await authService.signup(value);
    return sendSession(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      const field = error.details[0].path[0];
      const message =
        field === "email"
          ? "A valid email is required (maximum 254 characters)."
          : field === "password"
            ? "Password is required and must not exceed 72 UTF-8 bytes."
            : "Provide only email and password.";
      throw httpError(400, "VALIDATION_ERROR", message);
    }
    const result = await authService.login(value);
    return sendSession(res, result, 200);
  } catch (error) {
    next(error);
  }
};

export const me = (req, res) => res.status(200).json(req.user);

export const logout = (req, res) => {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
  res.status(200).json({ message: "Logged out." });
};
