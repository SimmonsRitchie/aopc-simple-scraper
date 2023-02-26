# AOPC Simple Scraper

AOPC Simple Scraper is a web scraping tool built with Node.js that allows you to easily scrape criminal court dockets from the website of the Administrative Office of the Pennsylvania Courts and save the data as CSV and JSON files.

Installation
To use AOPC Simple Scraper, you will need to have Node.js installed on your computer. If you don't have Node.js installed, you can download it from the official website: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)

Once you have Node.js installed, clone this repository to your computer.

You can install AOPC Simple Scraper using npm. Navigate to the project folder in your terminal and run the following command:

```
npm install
```

### Usage
To use AOPC Simple Scraper, run the following command from the terminal in the project folder:

```
node index.js
```

This command will scrape all criminal dockets filed yesterday on AOPC's website and save the data as CSV and JSON files in the root of the project directory.

### Advanced Usage
If you want to scrape dockets for a specific county, or specific counties, you can modify the args provided to scrapeAndSave in  `index.js` and re-run the above command. For example:

```
scrapeAndSave({
    counties: ["Clarion", "Armstrong", "Butler", "Forest", "Indiana"]
})
```

You can also specify the output directory for the CSV and JSON files and change the date range for the dockets you want to scrape. Dates must be in YYYY-MM-DD format. For example:

```
scrapeAndSave({
    counties: ["Clarion", "Armstrong", "Butler", "Forest", "Indiana"],
    outputDirectory: "/path/to/output/directory",
    filedStartDate: "2023-01-01",
    filedEndDate: "2018-01-03"
})
```

That command will only scrape criminal dockets with filing dates between Jan 1, 2023 and Jan 3 2023 for the five specific counties. The data will be saved as CSV and JSON files in the /path/to/output/directory directory.

### License
AOPC Simple Scraper is licensed under the MIT License. See the LICENSE file for more information.