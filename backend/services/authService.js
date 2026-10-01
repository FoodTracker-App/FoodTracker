import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { ACCESS_TOKEN_SECONDS, getAuthSettings } from "../config/auth.js";
import { httpError, unauthorized } from "../utils/errors.js";

const DUMMY_HASH =
  "$2b$12$wKBJIN6Y8inHcLDFcLXYb.cDpPknHRz1R/8XzduIfoMuUkMBZOBs2";
const identitySelect = {
  id: true,
  fullName: true,
  email: true,
  isActive: true,
};

const createSession = (user) => {
  const token = jwt.sign({}, getAuthSettings().secret, {
    algorithm: "HS256",
    subject: user.id,
    expiresIn: ACCESS_TOKEN_SECONDS,
  });
  return {
    token,
    user: { id: user.id, fullName: user.fullName, email: user.email },
  };
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...identitySelect, passwordHash: true },
  });
  const matches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !matches || !user.isActive) {
    throw httpError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  return createSession(user);
};

const isDuplicateEmail = (error) => {
  if (error.code !== "P2002") return false;
  const constraint = error.meta?.driverAdapterError?.cause?.constraint;
  const target = error.meta?.target ?? constraint?.fields ?? constraint?.index;
  const names = Array.isArray(target) ? target : [target];
  return names.some((name) => ["email", "users_email_key"].includes(name));
};

export const signup = async ({ firstName, lastName, email, password }) => {
  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        id: randomUUID(),
        fullName: `${firstName} ${lastName}`,
        email,
        passwordHash,
      },
      select: identitySelect,
    });
  } catch (error) {
    if (isDuplicateEmail(error)) {
      throw httpError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists.",
      );
    }
    throw error;
  }
  return createSession(user);
};

export const authenticate = async (token) => {
  if (!token) throw unauthorized();
  const { secret } = getAuthSettings();
  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.NotBeforeError
    )
      throw unauthorized();
    throw error;
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      payload.sub,
    ) ||
    !Number.isFinite(payload.exp)
  )
    throw unauthorized();
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: identitySelect,
  });
  if (!user?.isActive) throw unauthorized();
  return user;
};
