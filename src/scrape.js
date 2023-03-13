// const fetch = require("node-fetch");
const fetch = require("@adobe/node-fetch-retry");
const { parse } = require("node-html-parser");
const dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc"); // dependent on utc plugin
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);
const async = require("async");

const {
  parseCookies,
  exitOnBadStatus,
  buildFormData,
  parseDocketsFromHtml,
  parseTokenFromDom,
} = require("./utils/parse");
const { ALL_COUNTIES } = require("./constants/counties");
const { RETRY_OPTIONS } = require("./constants/fetch");
const { schemaFileDts } = require("./utils/validation");


const docketData = [];


const scrapeCounty = async ({ county, cookies, token, filedStartDate, filedEndDate }) => {
  console.log(`Getting docket data for ${county}...`);
  const form = buildFormData(token, county, filedStartDate, filedEndDate);
  const resCases = await fetch("https://ujsportal.pacourts.us/CaseSearch", {
    retryOptions: RETRY_OPTIONS,
    headers: {
      ...form.getHeaders(),
      accept: "*/*",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36",
      cookie: cookies,
    },
    body: form,
    method: "POST",
  })
    .then((res) => {
      return exitOnBadStatus(res);
    })
    .catch((err) => {
      throw err;
    });

  const docketsHtml = await resCases.text();
  const countyDockets = parseDocketsFromHtml(docketsHtml);
  docketData.push(...countyDockets);
};


const scrape = (
  counties,
  filedStartDate,
  {
    filedEndDate = null,
  } = {}
) => new Promise(async (resolve, reject) => {
  /**
   * Fetch and parse HTML from website of the Administrative Office of Pennsylvania Courts in order to 
   * get criminal case docket data.
   * @param {Array, String} counties List of counties to get data for. Use "*" for all counties.
   * @param {String} filedStartDate Start date of data to scrape in format 'YYYY-MM-DD'.
   * @param {String} options.filedEndDate End date of data to scrape in format 'YYYY-MM-DD'. Defaults to filedStartDate
   * @returns {Array} Array of docket data objects
   */

  // validation
  const { error, value } = schemaFileDts.validate({
    filedStartDate,
    filedEndDate,
  });
  if (error) {
    throw error;
  }
  filedStartDate = value.filedStartDate;
  filedEndDate = value.filedEndDate;

  // set defaults
  console.log(
    `Beginning scrape for data between ${filedStartDate} and ${filedEndDate}...`
  );
  if (counties === "*") {
    console.log("Scraping all 67 counties");
    counties = ALL_COUNTIES;
  } else {
    console.log(`Scraping the following counties: ${counties}`);
  }

  // Step one: Get AOPC cookie and verification token
  console.log("Getting AOPC cookies and token...");
  const resHomePage = await fetch("https://ujsportal.pacourts.us/CaseSearch", {
    retryOptions: RETRY_OPTIONS,
  }).then((res) => {
    return exitOnBadStatus(res);
  });
  const cookies = parseCookies(resHomePage);
  const htmlHomePage = await resHomePage.text();
  const domHomePage = parse(htmlHomePage);
  const token = parseTokenFromDom(domHomePage);
  console.log("Got AOPC cookies and token");

  // Step two: Get cases data
  countyQueue = async.queue(scrapeCounty, 5);
  counties.forEach((county) => {
    countyQueue.push({ county, cookies, token, filedStartDate, filedEndDate }, (error) => {
      if (error) {
        console.log(`An error occurred while processing ${county}`);
        reject(error);
      }
    });
  });

  countyQueue.drain(() => {
    console.log(`All ${counties.length} successfully processed`);
    resolve(docketData);
  })
});

module.exports = scrape;