const FormData = require("form-data");
const dayjs = require("dayjs");
var customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
const { parse } = require("node-html-parser");
const _ = require("lodash");
var utc = require("dayjs/plugin/utc"); // dependent on utc plugin
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);
const { formatDate } = require("./misc");
const { HttpError, ScrapeError } = require("./exceptions");


const exitOnBadStatus = (res) => {
  if (res.ok) {
    return res;
  } else {
    console.log("Website appears to be unavailable");
    throw new HttpError(res.status, res.statusText);
  }
};

const parseCountiesFromDom = (dom) => {
  const counties = [];
  const elCountyOpts = dom.querySelectorAll(
    "div#County-DivWrapper select option:not([data-aopc-BlankValue~='(blank)'])"
  );
  elCountyOpts.forEach((el) => counties.push(el.textContent));
  return counties;
};

const parseTokenFromDom = (dom) => {
  const elInput = dom.querySelector('input[name="__RequestVerificationToken"]');
  return elInput.getAttribute("value");
};

const parseDocketsFromHtml = (html) => {
  const docketsDom = parse(html);
  const docketsTable = docketsDom.querySelector("div.table-wrapper tbody");
  if (!docketsTable) {
    throw new ScrapeError(`Expected to extract table element but instead extracted ${docketsTable}. Check the provided HTML`)
  }
  const rows = docketsTable.querySelectorAll("tr");
  const docketData = [];
  const reCrimDockets = /[A-Z]{2}-\d{4,6}-CR-\d{4,8}-\d{4}/;
  console.log(`Total rows on page: ${rows.length}`);
  rows.forEach((cell) => {
    const docketId = cell.querySelectorAll("td")[2].textContent;
    const court = cell.querySelectorAll("td")[3].textContent;
    if (court === "Magisterial District" && reCrimDockets.test(docketId)) {
      const docketUrlRel = cell
        .querySelector("td:nth-child(19) div:nth-child(1) a")
        .getAttribute("href");
      const docketUrlFull = `https://ujsportal.pacourts.us${docketUrlRel}`;
      docketData.push({
        docketId,
        court,
        caption: cell.querySelectorAll("td")[4].textContent,
        status: cell.querySelectorAll("td")[5].textContent,
        filingDate: formatDate(cell.querySelectorAll("td")[6].textContent),
        primaryParticipants: cell.querySelectorAll("td")[7].textContent,
        dob: formatDate(cell.querySelectorAll("td")[8].textContent),
        county: cell.querySelectorAll("td")[9].textContent,
        courtOffice: cell.querySelectorAll("td")[10].textContent,
        policeIncidentNo: cell.querySelectorAll("td")[13].textContent,
        docketUrl: docketUrlFull,
      });
    }
  });
  console.log(`Found ${docketData.length} crim dockets`);
  const uniqueDocketItems = _.uniqBy(docketData, function (e) {
    return e.docketId;
  });
  const diff = docketData.length - uniqueDocketItems.length;
  if (diff > 0) {
    console.log(
      `Note: ${diff} crim dockets have duplicate docketIds – removing`
    );
    console.log(`Returning ${uniqueDocketItems.length} crim dockets`);
  }
  return uniqueDocketItems;
};

const parseCookies = (response) => {
  const raw = response.headers.raw()["set-cookie"];
  return raw
    .map((entry) => {
      const parts = entry.split(";");
      const cookiePart = parts[0];
      return cookiePart;
    })
    .join("; ");
};

const buildFormData = (
  token,
  county,
  filedStartDate,
  filedEndDate
) => {
  /**
   * @param      {String}           token                Verification token used by AOPC
   *                                                     website
   * @param      {String}           county               Name of county to get cases for
   * @param      {String}           filedStartDate       Start date of cases in ISO format.
   *                                                     eg. 2021-03-23
   * @param      {String}           options.filedEndDate End date of cases in ISO format.
   *                                                     Defaults to start date.
   * @return     {Object<FormData>}                      FormData for use in request
   */
  if (!filedEndDate) {
    filedEndDate = filedStartDate;
  }
  const form = new FormData();
  form.append("SearchBy", "DateFiled");
  form.append("FiledStartDate", filedStartDate);
  form.append("FiledEndDate", filedEndDate);
  form.append("__RequestVerificationToken", token);
  form.append("AdvanceSearch", "true");
  form.append("County", county);
  return form;
};

const parseName = (primaryParticipants) => {
  /** 
   * Safely parses a name into an obj of trimmed, lowercase last and first name elements.
   * If parts are invalid null is returned as key value.
   */
  const nullObj = { last: null, first: null }
  if (typeof primaryParticipants !== "string") {
    return nullObj
  }
  try {
    const nameParts = primaryParticipants.split(",")
    const cleanNameParts = nameParts.map(part => part.trim().toLowerCase())
    const last = cleanNameParts[0] ? cleanNameParts[0] : null
    const first = cleanNameParts[1] ? cleanNameParts[1] : null
    return { last, first }
  } catch {
    return nullObj
  }
}


module.exports = {
  exitOnBadStatus,
  parseCookies,
  parseDocketsFromHtml,
  parseTokenFromDom,
  parseCountiesFromDom,
  buildFormData,
  parseName,
}
