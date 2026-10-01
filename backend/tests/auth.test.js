import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma, disconnectDatabase } from "../config/db.js";
import { signupSchema } from "../validators/authValidators.js";
import { signup } from "../services/authService.js";

const input = {
  firstName: "  Alex  ",
  lastName: " Morgan ",
  email: "  ALEX@foodtracker.example ",
  password: " test password ",
  confirmPassword: " test password ",
};

test("staff sign-up and existing authentication", async (t) => {
  process.env.NODE_ENV = "development";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";
  process.env.JWT_ACCESS_SECRET = "test-only-secret-with-at-least-32-bytes";
  process.env.PORT = "0";
  const users = new Map();
  let databaseError;
  const selectFields = (user, select) =>
    user
      ? Object.fromEntries(Object.keys(select).map((key) => [key, user[key]]))
      : null;
  // Prisma exposes methods through proxies rather than own method descriptors.
  const replaceMethod = (target, name, implementation) => {
    const original = target[name];
    target[name] = implementation;
    t.after(() => {
      target[name] = original;
    });
  };
  replaceMethod(prisma, "$connect", async () => {});
  replaceMethod(prisma, "$queryRaw", async () => [{ result: 1 }]);
  replaceMethod(prisma.user, "create", async ({ data, select }) => {
    if (databaseError) throw databaseError;
    if (users.has(data.email)) {
      throw { code: "P2002", meta: { target: ["email"] } };
    }
    assert.deepEqual(Object.keys(data).sort(), [
      "email",
      "fullName",
      "id",
      "passwordHash",
    ]);
    const user = { ...data, isActive: true };
    users.set(data.email, user);
    return selectFields(user, select);
  });
  replaceMethod(prisma.user, "findUnique", async ({ where, select }) => {
    if (databaseError) throw databaseError;
    const user = where.email
      ? users.get(where.email)
      : [...users.values()].find((entry) => entry.id === where.id);
    return selectFields(user, select);
  });

  // Start the real middleware stack on an ephemeral port with all DB I/O mocked.
  let server;
  const originalListen = express.application.listen;
  t.mock.method(express.application, "listen", function (...args) {
    server = originalListen.apply(this, args);
    return server;
  });
  await import("../index.js");
  assert.ok(server);
  if (!server.listening) await once(server, "listening");
  t.after(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await disconnectDatabase();
  });
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const request = async (path, body, headers = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      headers: response.headers,
      body: await response.json(),
    };
  };

  await t.test("Joi normalization, required fields, and boundaries", () => {
    const valid = signupSchema.validate(input);
    assert.equal(valid.error, undefined);
    assert.equal(valid.value.firstName, "Alex");
    assert.equal(valid.value.lastName, "Morgan");
    assert.equal(valid.value.email, "alex@foodtracker.example");
    assert.equal(valid.value.password, input.password);
    for (const field of Object.keys(input)) {
      const missing = { ...input };
      delete missing[field];
      assert.ok(signupSchema.validate(missing).error, field);
      assert.ok(signupSchema.validate({ ...input, [field]: 123 }).error, field);
    }
    for (const invalid of [
      undefined,
      null,
      [],
      {},
      { ...input, firstName: " " },
      { ...input, lastName: " " },
      { ...input, email: "invalid" },
      { ...input, email: `${"a".repeat(245)}@example.com` },
      { ...input, password: "", confirmPassword: "" },
      { ...input, confirmPassword: "different" },
      { ...input, isActive: false },
      { ...input, fullName: "Override" },
      { ...input, firstName: "a".repeat(60), lastName: "b".repeat(60) },
      { ...input, password: "é".repeat(37), confirmPassword: "é".repeat(37) },
      { ...input, password: "a".repeat(73), confirmPassword: "a".repeat(73) },
    ])
      assert.ok(signupSchema.validate(invalid).error);
    assert.equal(
      signupSchema.validate({
        ...input,
        firstName: "a".repeat(60),
        lastName: "b".repeat(59),
      }).error,
      undefined,
    );
    assert.equal(
      signupSchema.validate({
        ...input,
        password: "é".repeat(36),
        confirmPassword: "é".repeat(36),
      }).error,
      undefined,
    );
  });

  let registered;
  let cookie;
  await t.test(
    "signup creates a safe identity and working cookie/Bearer sessions",
    async () => {
      const result = await request("/signup", input);
      assert.equal(result.status, 201);
      assert.equal(result.headers.get("cache-control"), "no-store");
      registered = result.body;
      assert.deepEqual(Object.keys(registered).sort(), [
        "accessToken",
        "email",
        "expiresIn",
        "fullName",
        "id",
        "tokenType",
      ]);
      assert.equal(registered.fullName, "Alex Morgan");
      assert.equal(registered.email, "alex@foodtracker.example");
      assert.equal(registered.tokenType, "Bearer");
      assert.equal(registered.expiresIn, 1800);
      const claims = jwt.verify(
        registered.accessToken,
        process.env.JWT_ACCESS_SECRET,
        { algorithms: ["HS256"] },
      );
      assert.equal(claims.sub, registered.id);
      assert.equal(claims.exp - claims.iat, 1800);
      const saved = users.get(registered.email);
      assert.equal(bcrypt.getRounds(saved.passwordHash), 12);
      assert.ok(await bcrypt.compare(input.password, saved.passwordHash));
      const setCookie = result.headers.get("set-cookie");
      assert.match(setCookie, /HttpOnly/);
      assert.match(setCookie, /SameSite=Lax/);
      assert.match(setCookie, /Max-Age=1800/);
      cookie = setCookie.split(";")[0];
      for (const headers of [
        { Cookie: cookie },
        { Authorization: `Bearer ${registered.accessToken}` },
      ]) {
        const me = await request("/me", undefined, headers);
        assert.equal(me.status, 200);
        assert.deepEqual(me.body, {
          id: registered.id,
          fullName: "Alex Morgan",
          email: registered.email,
          isActive: true,
        });
      }
    },
  );

  await t.test("validation and duplicate registrations are safe", async () => {
    const invalid = await request("/signup", {
      ...input,
      confirmPassword: "secret-mismatch",
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
    assert.ok(!JSON.stringify(invalid.body).includes("secret-mismatch"));
    const before = structuredClone(users.get(registered.email));
    const duplicate = await request("/signup", input);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, "EMAIL_ALREADY_EXISTS");
    assert.deepEqual(users.get(registered.email), before);
    const concurrent = await Promise.all([
      request("/signup", { ...input, email: "race@foodtracker.example" }),
      request("/signup", { ...input, email: "RACE@foodtracker.example" }),
    ]);
    assert.deepEqual(
      concurrent.map((result) => result.status).sort(),
      [201, 409],
    );
    assert.equal(users.size, 2);
  });

  await t.test(
    "adapter uniqueness errors and unexpected DB errors",
    async () => {
      const normalized = signupSchema.validate(input).value;
      for (const meta of [
        { target: "users_email_key" },
        {
          driverAdapterError: { cause: { constraint: { fields: ["email"] } } },
        },
        {
          driverAdapterError: {
            cause: { constraint: { index: "users_email_key" } },
          },
        },
      ]) {
        databaseError = { code: "P2002", meta };
        await assert.rejects(signup(normalized), {
          status: 409,
          code: "EMAIL_ALREADY_EXISTS",
        });
      }
      databaseError = new Error("private database details");
      const failure = await request("/signup", input);
      assert.equal(failure.status, 500);
      assert.deepEqual(failure.body, {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
        },
      });
      databaseError = { code: "P2002", meta: { target: ["id"] } };
      await assert.rejects(
        signup(normalized),
        (error) => error === databaseError,
      );
      databaseError = undefined;
    },
  );

  await t.test(
    "login, logout, inactive accounts, and origin policy",
    async () => {
      const login = await request("/login", {
        email: input.email,
        password: input.password,
      });
      assert.equal(login.status, 200);
      assert.equal(login.body.id, registered.id);
      assert.ok(login.headers.get("set-cookie"));
      const wrong = await request("/login", {
        email: input.email,
        password: "wrong",
      });
      assert.equal(wrong.status, 401);
      users.get(registered.email).isActive = false;
      assert.equal(
        (await request("/me", undefined, { Cookie: cookie })).status,
        401,
      );
      assert.equal(
        (
          await request("/login", {
            email: input.email,
            password: input.password,
          })
        ).status,
        401,
      );
      users.get(registered.email).isActive = true;
      const logout = await request("/logout", {}, { Cookie: cookie });
      assert.equal(logout.status, 200);
      assert.match(
        logout.headers.get("set-cookie"),
        /Expires=Thu, 01 Jan 1970/,
      );
      assert.equal((await request("/logout", {})).status, 401);
      const forbidden = await request("/signup", input, {
        Origin: "https://unapproved.example",
      });
      assert.equal(forbidden.status, 403);
      assert.equal(forbidden.body.error.code, "ORIGIN_FORBIDDEN");
      const allowed = await request(
        "/signup",
        {},
        { Origin: process.env.CLIENT_ORIGIN },
      );
      assert.equal(allowed.status, 400);
      assert.equal(
        allowed.headers.get("access-control-allow-origin"),
        process.env.CLIENT_ORIGIN,
      );
      assert.equal(
        allowed.headers.get("access-control-allow-credentials"),
        "true",
      );
    },
  );

  await t.test("signup has its own ten-request rate limit", async () => {
    // Seven sign-up POSTs have reached the limiter above (forbidden origin did not).
    for (let count = 7; count < 10; count++) {
      assert.equal((await request("/signup", {})).status, 400);
    }
    const limited = await request("/signup", {});
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.code, "RATE_LIMITED");
    assert.ok(limited.headers.get("ratelimit"));
    assert.equal(
      (
        await request("/login", {
          email: input.email,
          password: input.password,
        })
      ).status,
      200,
    );
  });
});
