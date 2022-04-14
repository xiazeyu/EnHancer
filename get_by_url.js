"use strict";

const fs = require("fs");
const path = require("path");
const Logger = require("./src/logger");
const Runner = require("./src/runner");
const lookup = require("./src/api/lookup");
const GalleryIdentifier = require("./src/api/gallery-identifier");
const commonJson = require("./src/api/gallery-info/common-json");


function getDateString(date) {
	const year = date.getFullYear().toString();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	const hour = date.getHours().toString().padStart(2, "0");
	const minute = date.getMinutes().toString().padStart(2, "0");
	const second = date.getSeconds().toString().padStart(2, "0");
	return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

async function main() {
    
	if (process.argv.length <= 2) {
		process.stderr.write("Inputs required\n");
		return -1;
	}

	// Setup config
	const configFileName = path.resolve(__dirname, "config.json");
	const configDir = path.dirname(configFileName);

	let configSource;
	try {
		configSource = fs.readFileSync(configFileName, { encoding: "utf8" });
	} catch (e) {
		process.stderr.write("Failed to read config\n");
		return -2;
	}

	let config;
	try {
		config = JSON.parse(configSource);
	} catch (e) {
		process.stderr.write("Failed to parse config\n");
		return -3;
	}

	// Setup logging
	let logFileName;
	try {
		logFileName = config.general.logFileName;
	} catch (e) {
		process.stderr.write("Invalid log file name\n");
		return -4;
	}

	const errors = [];
	let logStream = null;
	if (typeof(logFileName) === "string") {
		try {
			logFileName = path.resolve(configDir, logFileName);
			logStream = fs.createWriteStream(logFileName, { encoding: "utf8", flags: "a" });
		} catch (e) {
			errors.push(e);
		}
	}

	const log = new Logger(process.stdout, process.stderr, logStream);
	try {
		const date = new Date();
		log.debug("".padStart(70, "="));
		log.debug(`Started running at ${getDateString(date)}`);
		log.debug("");

		for (const e of errors) {
			log.error(e);
		}

		// Run
        const params = process.argv.slice(2);
        log.debug(`received params: ${params}`);
        const url = params[0];
        return await get_by_url(log, config, configDir, url);


	} finally {
		const date= new Date();
		log.debug("");
		log.debug(`Completed running at ${getDateString(date)}`);
		log.debug("".padStart(70, "="));
		log.debug("");
		await log.end();
	}
}

async function get_by_url(log, config, configDir, url) {

    const runner = new Runner(log, config, configDir);
    
    runner.initDependencies();
    runner.initCookies();

    log.debug(`current url: ${url}`);

    const galleryInfos = await lookup.getGalleryInfos(runner.site, runner.cookieJar, [GalleryIdentifier.GalleryIdentifier.createFromUrl(url)])

    const json = commonJson.toCommonJson(galleryInfos[0].info);
    const jsonString = JSON.stringify(json, null, "  ");
    log.debug(`jsonString: ${jsonString}`);

    return jsonString;

}

if (require.main === module) {
	(async () => { await main(); })();
}
