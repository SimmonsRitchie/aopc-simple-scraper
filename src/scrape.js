// const fetch = require("node-fetch");
const fetch = require("@adobe/node-fetch-retry");
const fs = require("fs");
const { parse } = require("node-html-parser");
const dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc"); // dependent on utc plugin
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

const {
  parseCookies,
  exitOnBadStatus,
  buildFormData,
  parseDocketsFromHtml,
  parseTokenFromDom,
} = require("./utils/parse");
const { ALL_COUNTIES } = require("./constants/counties");
const { RETRY_OPTIONS } = require("./constants/fetch");
const { asyncForEach, arrayToCsv } = require("./utils/misc");
const { schemaFileDts } = require("./utils/validation");



const scrape = async (
  counties,
  filedStartDate,
  {
    filedEndDate = null,
  } = {}
) => {
  /**
   * Scrape newly-filed criminal cases from website of the Administrative Office of Pennsylvania Courts
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
  const docketData = [];
  await asyncForEach(counties, async (county) => {
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
  });

  return docketData;
};

const scrapeAndSave = async (
  {
    filedStartDate,
    filedEndDate,
    counties = "*",
    outputPath = "."
  } = {}
) => {
  /**
   * Scrape and upload criminal cases from website of the Administrative Office of Pennsylvania Courts
   * @param {String} options.filedStartDate Start date of data to scrape in format 'YYYY-MM-DD'. Defaults to yesterday, New York.
   * @param {String} options.filedEndDate End date of data to scrape in format 'YYYY-MM-DD'. Defaults to filedStartDate
   * @param {Array, String} options.counties List of counties to get data for. Use "*" for all counties. Defaults to "*"
   * @param {Array, String} options.outputPath Where to save the file. Defaults to "./"
   *
   */
  // Start
  const startTime = dayjs().tz("America/New_York");
  console.log("Scrape begin:", startTime.format("ddd, MMM D, YYYY h:mm A"));

  // set defaults
  if (!filedStartDate) {
    filedStartDate = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  }

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
  console.log(`Scraping dockets between ${filedStartDate} and ${filedEndDate}...`);

  // scrape
  const dockets = await scrape(counties, filedStartDate, { filedEndDate });
  dockets.sort((a, b) =>
    String(a.primaryParticipants).localeCompare(String(b.primaryParticipants))
  );

  // write to file
  if (dockets.length > 0) {
    // write json
    const docketJsonPath = `${outputPath}/dockets.json`;
    const prettyJson = JSON.stringify(dockets, null, 2);
    fs.writeFileSync(docketJsonPath, prettyJson);
    console.log(`Saved dockets as JSON to: ${docketJsonPath}`);

    // write csv
    const docketCsvPath = `${outputPath}/dockets.csv`;
    const csvStr = arrayToCsv(dockets);
    fs.writeFileSync(docketCsvPath, csvStr);
    console.log(`Saved dockets as CSV to: ${docketCsvPath}`);

  } else {
    console.log("No dockets found for the provided date range.");
  }

  // scrape analysis
  const endTime = dayjs().tz("America/New_York");
  console.log("Scrape end:", endTime.format("ddd, MMM D, YYYY h:mm A"));
  const scrapeDurationSec = endTime.diff(startTime, "seconds");
  const scrapeDurationFmt = `${scrapeDurationSec} seconds`;
  console.log(`Scrape duration: ${scrapeDurationFmt}`);
};

module.exports = scrapeAndSave