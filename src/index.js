// const fetch = require("node-fetch");
const fs = require("fs");
const dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc"); // dependent on utc plugin
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

const scrape = require("./scrape");
const { schemaFileDts } = require("./utils/validation");
const { arrayToCsv } = require("./utils/misc");


/**
 * Scrape criminal case docket data from website of the Administrative Office of Pennsylvania Courts and
 * save to JSON and CSV files.
 * @param {String} options.filedStartDate Start date of data to scrape in format 'YYYY-MM-DD'. Defaults to yesterday, New York.
 * @param {String} options.filedEndDate End date of data to scrape in format 'YYYY-MM-DD'. Defaults to filedStartDate
 * @param {Array, String} options.counties List of counties to get data for. Use "*" for all counties. Defaults to "*"
 * @param {Array, String} options.outputPath Where to save the file. Defaults to "./"
 * @returns undefined
 */
const scrapeAndSave = async (
    {
        filedStartDate,
        filedEndDate,
        counties = "*",
        outputPath = "."
    } = {}
) => {
    // start
    const startTime = dayjs().tz("America/New_York");
    console.log("Scrape begin:", startTime.format("ddd, MMM D, YYYY h:mm A"));

    // set defaults
    if (!filedStartDate) {
        filedStartDate = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    }

    // validate
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

    // write to files
    if (dockets.length > 0) {
        // json
        const docketJsonPath = `${outputPath}/dockets.json`;
        const prettyJson = JSON.stringify(dockets, null, 2);
        fs.writeFileSync(docketJsonPath, prettyJson);
        console.log(`Saved dockets as JSON to: ${docketJsonPath}`);

        // csv
        const docketCsvPath = `${outputPath}/dockets.csv`;
        const csvStr = arrayToCsv(dockets);
        fs.writeFileSync(docketCsvPath, csvStr);
        console.log(`Saved dockets as CSV to: ${docketCsvPath}`);

    } else {
        console.log("No dockets found for the provided date range.");
    }

    // analyze
    const endTime = dayjs().tz("America/New_York");
    console.log("Scrape end:", endTime.format("ddd, MMM D, YYYY h:mm A"));
    console.log("Total crim dockets found:", dockets.length);
    const scrapeDurationSec = endTime.diff(startTime, "seconds");
    const scrapeDurationFmt = `${scrapeDurationSec} seconds`;
    console.log(`Scrape duration: ${scrapeDurationFmt}`);
};

module.exports = scrapeAndSave