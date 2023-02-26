const dayjs = require("dayjs");
const { dateEasternIsoPriorToDay } = require("./misc");
const Bourne = require("@hapi/bourne");
const { ALL_COUNTIES } = require("../constants/counties");
const Joi = require("joi").extend(require("@joi/date"));
const extCoerceJSON = (joi) => ({
  /**
   * Joi extension that coerces JSON strings into object.
   * Ref: JOI v16 release notes: https://github.com/sideway/joi/issues/2037
   * 
   */
  type: "object",
  base: joi.object(),
  coerce: {
    from: "string",
    // eslint-disable-next-line no-unused-vars
    method(value, helpers) {

      if (value[0] !== "{" && !/^\s*\{/.test(value)) {
        return;
      }

      try {
        return { value: Bourne.parse(value) };
      } catch (ignoreErr) {
        return
      }
    },
  },
});
const JoiJSON = Joi.extend(extCoerceJSON);

const defaultEndDate = (parent) => {
  // ensures that if filedEndDate is provided then
  const { filedStartDate, filedEndDate } = parent;
  if (!filedEndDate) {
    return filedStartDate;
  }
};

const castToIso = (value) => {
  if (value instanceof Date || value instanceof dayjs) {
    return dayjs(value).format("YYYY-MM-DD");
  }
  return value;
};

const schemaFileDt = Joi.date()
  .format("YYYY-MM-DD")
  .less("now")
  .min(dateEasternIsoPriorToDay(365));

const schemaStrArray = Joi.string().pattern(/^(\w+,?)+$/);

const schemaFileDts = Joi.object({
  filedStartDate: schemaFileDt
    .custom(castToIso, "cast back to ISO string")
    .required(),
  filedEndDate: schemaFileDt
    .min(Joi.ref("filedStartDate"))
    .custom(castToIso, "cast back to ISO str")
    .default(defaultEndDate),
});

const schemaGetDockets = Joi.object({
  /**
   * Schema for getDockets query params
   */
  pageSize: Joi.number()
    .integer()
    .positive()
    .greater(0)
    .max(100)
    .min(1)
    .default(50),
  attributes: schemaStrArray.empty(""),
  name: Joi.string().trim(),
  onlyCount: Joi.boolean(),
  county: Joi.string().trim().valid(...ALL_COUNTIES).insensitive(),
  fileDt: schemaFileDt.custom(castToIso, "cast back to ISO str"),
  orderAsc: Joi.boolean().default(false),
  exclusiveStartKey: JoiJSON.object(),
});

module.exports = {
  schemaFileDt,
  schemaFileDts,
  schemaGetDockets,
};
