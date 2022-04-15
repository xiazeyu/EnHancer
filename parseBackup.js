"use strict";

const path = require("path");
const fs = require("fs");
const lookup = require("./src/api/lookup");
const GalleryIdentifier = require("./src/api/gallery-identifier");
const commonJson = require("./src/api/gallery-info/common-json");
const request = require("./src/request");

const outputPrefix = 'output/';

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
            const cookies = this.parseCookieString(exCookieString);
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
        try {
            return fs.readFileSync("cookies.txt", { encoding: "utf8" }).trim() || null;
        } catch (e) {
            console.log(`Failed to read cookie file: cookies.txt ${e}`);
        }
        return null;
    }

    parseCookieString(cookieString) {
        const re = /\s*([^=]*)=([^;]*)(?:;|$)/g;
        let match;
        const results = {};
        while ((match = re.exec(cookieString)) !== null) {
            results[match[1]] = match[2];
        }
        return results;
    }

    async getGalleryInfo(galleryIdentifier){

        const galleryInfos = await lookup.getGalleryInfos(this.site, this.cookieJar, [galleryIdentifier])
        // console.log(galleryInfos[0].info);
        return galleryInfos[0].info;

    }

    async getGalleryInfoJson(galleryIdentifier){
        const galleryInfo = await this.getGalleryInfo(galleryIdentifier);
        const json = commonJson.toCommonJson(galleryInfo);
        const jsonString = JSON.stringify(json, null, "  ");
        // console.log(`jsonString: ${jsonString}`);
        return jsonString;
    }

}

function generateGalleryIdentifier(tags){

    // console.log(tags);
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

async function generateGalleryInfoJson(runner, currentArchieve){
    console.log(`now processing ${currentArchieve["arcid"]} ${currentArchieve["filename"]}.`);
    const galleryIdentifier = generateGalleryIdentifier(currentArchieve["tags"]);
    if (galleryIdentifier !== null){
        try{
            const getGalleryInfoJson = await runner.getGalleryInfoJson(galleryIdentifier);
            await fs.promises.writeFile(path.resolve(outputPrefix, `${currentArchieve["filename"]}.json`), getGalleryInfoJson, "utf8");
            return {'arcid': currentArchieve["arcid"], 'status': true}
        }catch(e){
            console.log(`${currentArchieve["arcid"]} ${currentArchieve["filename"]} failed ${e}`);
            return {'arcid': currentArchieve["arcid"], 'status': false, 'reason': e}
        }
    } else {
        console.log(`${currentArchieve["arcid"]} ${currentArchieve["filename"]} failed`);
        return {'arcid': currentArchieve["arcid"], 'status': false, 'reason': 'GalleryIdentifier not exist.'}
    }
}

async function main(){

    await fs.promises.mkdir(outputPrefix, {recursive: true});

    const runner = new Runner();
    const backupFileData = await fs.promises.readFile("backup.json", "utf8");
    const archivesObj = JSON.parse(backupFileData)["archives"];

    const final = {
        'success': new Array(),
        'fail': new Array(),
    }

    for (const currentArchieve of archivesObj) {
        const result = await generateGalleryInfoJson(runner, currentArchieve);
        await new Promise((r) => setTimeout(r, 1000))
        if(result['status']){
            final['success'].push(result);
            console.log('success!!!');
        }else{
            final['fail'].push(result);
            console.log('fail!!!');
        }
        console.log();
        await fs.promises.writeFile('final.json', JSON.stringify(final), "utf8");
    }


}

if (require.main === module) {
	(async () => { await main(); })();
}
