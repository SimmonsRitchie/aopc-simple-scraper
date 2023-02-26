
const dayjs = require("dayjs");
var customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
var utc = require("dayjs/plugin/utc"); // dependent on utc plugin
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

const strToBool = (str) => {
  if (typeof str === 'boolean') {
    console.log("strToBool: type is already bool of " + str + " returning")
    return str
  }
  return /^(t|true)$/.test(str)
};

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const arrayToCsv = (
  data,
  { columnDelimiter = ",", lineDelimiter = "\n" } = {}
) => {
  /**
   * Take an array of objects of similar structure and convert it to a CSV.
   * @source     https://halistechnology.com/2015/05/28/use-javascript-to-export-your-data-as-csv/
   * @modifiedBy sators
   * 
   * @param      {Array}  data            Array of data
   * @param      {String} options.columnDelimiter Column separator, defaults to ","
   * @param      {String} options.lineDelimiter   Line break, defaults to "\n"
   * @return     {String}                         CSV
   */

  let result, ctr, keys;
  if (data === null || !data.length) {
    return null;
  }
  keys = Object.keys(data[0]);
  result = "";
  result += keys.join(columnDelimiter);
  result += lineDelimiter;
  data.forEach((item) => {
    ctr = 0;
    keys.forEach((key) => {
      if (ctr > 0) {
        result += columnDelimiter;
      }
      result +=
        typeof item[key] === "string" && item[key].includes(columnDelimiter)
          ? `"${item[key]}"`
          : item[key];
      ctr++;
    });
    result += lineDelimiter;
  });

  return result;
};


const datetimeNowEastern = () => dayjs().tz("America/New_York")

const todayDateEasternIso = () =>
  dayjs().tz("America/New_York").format("YYYY-MM-DD");

const dateEasternIsoPriorToday = (daysPrior) =>
  dayjs().tz("America/New_York").subtract(daysPrior, 'days').format("YYYY-MM-DD")

const dateEasternIsoAfterToday = (daysAfter) =>
  dayjs().tz("America/New_York").add(daysAfter, 'days').format("YYYY-MM-DD")

const formatDate = (strDate) =>
  dayjs(strDate, "MM/DD/YYYY").format("YYYY-MM-DD");


const getDaysArray = (start, end) => {
  console.log("start", start)
  start = new Date(start)
  end = new Date(end)
  for (var arr = [], dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
    arr.push(new Date(dt).toISOString().slice(0, 10));
  }
  return arr;
};

module.exports = {
  datetimeNowEastern,
  getDaysArray,
  formatDate,
  strToBool,
  asyncForEach,
  arrayToCsv,
  todayDateEasternIso,
  dateEasternIsoAfterToday,
  dateEasternIsoPriorToDay: dateEasternIsoPriorToday,
}
