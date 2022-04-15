"use strict";

const path = require("path");
const fs = require("fs/promises");
const lookup = require("./src/api/lookup");
const GalleryIdentifier = require("./src/api/gallery-identifier");
const commonJson = require("./src/api/gallery-info/common-json");
const request = require("./src/request");

let useEx;

class Runner {

	constructor() {

		this.site = null;
		this.useEx = false;
		this.cookieJar = null;

		this.delays = {};

        this.initCookies();
	}

    initCookies() {
        // Setup
        const exCookieString = this.readCookieString();
    
        this.useEx = (exCookieString !== null);
        this.site = (this.useEx ? "https://exhentai.org" : "https://e-hentai.org");
        this.cookieJar = request.jar();
    
        // Authentication cookies
        if (this.useEx) {
            const cookies = parseCookieString(exCookieString);
            const requiredCookieNames = [ "ipb_member_id", "ipb_pass_hash", "igneous" ];
            for (const key in cookies) {
                if (!Object.prototype.hasOwnProperty.call(cookies, key)) { continue; }
                if (requiredCookieNames.indexOf(key) < 0) { continue; }
                this.cookieJar.setCookie(request.cookie(`${key}=${cookies[key]}`), this.site);
            }
        }
    
        // Layout cookies
        this.cookieJar.setCookie(request.cookie("sl=dm_3"), this.site);
    }
    
    readCookieString() {
        const exCookieFileName = "cookies.txt";
        try {
            return fs.readFileSync(exCookieFileName, { encoding: "utf8" }).trim() || null;
        } catch (e) {
            console.log(`Failed to read cookie file: ${exCookieFileName}`);
        }
        return null;
    }

    async getGalleryInfo(galleryIdentifier){

        const galleryInfos = await lookup.getGalleryInfos(this.site, this.cookieJar, [galleryIdentifier])
        console.log(galleryInfos[0].info);
        return galleryInfos[0].info;

    }

    async getGalleryInfoJson(galleryIdentifier){
        const galleryInfo = await this.getGalleryInfo(galleryIdentifier);
        const json = commonJson.toCommonJson(galleryInfo);
        const jsonString = JSON.stringify(json, null, "  ");
        console.log(`jsonString: ${jsonString}`);
        return jsonString;
    }

}

function generateGalleryIdentifier(tags){

    console.log(tags);
    const ehexp = /.*source:\s*e(?:x|-)hentai\.org\/g\/([0-9]*)\/([0-z]*)\/*.*/i;

    if(ehexp.test(tags)){
        console.log("found source.");
    }else{
        console.log("NOT found source.");
        return null;
    }

    const result = ehexp.exec(tags);

    const id = result[1];
    const token = result[2];

    const galleryIdentifier = new GalleryIdentifier.GalleryIdentifier(id, token);
    console.log(galleryIdentifier);
    return galleryIdentifier;
}

async function main(){

    const outputPrefix = 'output/';

    const runner = new Runner();
    const backupFileData = await fs.readFile("backup.json", "utf8");
    const archivesObj = JSON.parse(backupFileData)["archives"];

    const currentArchieve = archivesObj[0];

    const galleryIdentifier = generateGalleryIdentifier(currentArchieve["tags"]);

    await fs.mkdir(outputPrefix, {recursive: true});

    if (galleryIdentifier !== null){
        const getGalleryInfoJson = await runner.getGalleryInfoJson(galleryIdentifier);
        await fs.writeFile(path.resolve(outputPrefix, `${currentArchieve["filename"]}.json`), getGalleryInfoJson, "utf8");
    } else {
        console.log(`${currentArchieve["arcid"]} ${currentArchieve["filename"]} failed`);
    }

}



if (require.main === module) {
	(async () => { await main(); })();
}
