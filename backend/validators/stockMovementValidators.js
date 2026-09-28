import Joi from "joi";

export const createAdjustmentSchema = Joi.object({
  type: Joi.string().valid("SALE", "DAMAGE", "DISPOSAL", "CORRECTION").required(),
  quantityChange: Joi.number().integer().min(-1_000_000).max(1_000_000)
    .invalid(0).strict().required()
    .when("type", {
      is: Joi.valid("SALE", "DAMAGE", "DISPOSAL"),
      then: Joi.number().negative(),
    }),
  reason: Joi.string().trim().min(1).max(500).required(),
}).unknown(false).required();

export const listMovementsSchema = Joi.object({
  page: Joi.number().integer().min(1).max(2147483647).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
}).unknown(false).custom((value, helpers) =>
  (value.page - 1) * value.pageSize <= 2147483647
    ? value
    : helpers.error("pagination.offset"),
).messages({
  "pagination.offset": "Requested pagination offset is too large.",
});
