"use strict";

const path = require("path");
const fs = require("fs");
const lookup = require("./src/api/lookup");
const GalleryIdentifier = require("./src/api/gallery-identifier");
const commonJson = require("./src/api/gallery-info/common-json");
const request = require("./src/request");

const outputPrefix = "output/";

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

    async getGalleryInfoJson(galleryIdentifier){

        const galleryInfos = await lookup.getGalleryInfosFromJson(this.site, this.cookieJar, [galleryIdentifier])
        // console.log(galleryInfos[0].info);
        return galleryInfos[0].info;

    }

    async getGalleryInfoHtml(galleryIdentifier){

        const galleryInfos = await lookup.getGalleryInfosFromHtml(this.site, this.cookieJar, [galleryIdentifier])
        // console.log(galleryInfos[0]);
        return galleryInfos[0];

    }

    async getGalleryCommonHtml(galleryIdentifier){
        const galleryInfo = await this.getGalleryInfoHtml(galleryIdentifier);
        const json = commonJson.toCommonJson(galleryInfo);
        // console.log(`jsonString: ${jsonString}`);
        return json;
    }

    async getGalleryCommonJson(galleryIdentifier){
        const galleryInfo = await this.getGalleryInfoJson(galleryIdentifier);
        const json = commonJson.toCommonJson(galleryInfo);
        // console.log(`jsonString: ${jsonString}`);
        return json;
    }

}

function generateGalleryIdentifier(tags){

    // console.log(tags);
    const ehexp = /.*e(?:x|-)hentai\.org\/g\/([0-9]*)\/([0-z]*)\/*.*/i;

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

async function generateGalleryInfoJson(runner, currentArchieve, fromHtml = true){
    console.log(`now processing ${currentArchieve}.`);
    const galleryIdentifier = generateGalleryIdentifier(currentArchieve);
    if (galleryIdentifier !== null){
        let exist = null;
        try {
            await fs.promises.access(path.resolve(outputPrefix, `${galleryIdentifier.id}.json`));
            exist = true;
        } catch {
            exist = false;
        }
        
        if(exist){
            return {"status": true,
            "exists": true,
            "visible": true,
            "galleryIdentifier": galleryIdentifier,
            }; 
        }

        try{
            let galleryInfoJson;
        if (fromHtml){
            galleryInfoJson = await runner.getGalleryCommonHtml(galleryIdentifier);
        }else{
            galleryInfoJson = await runner.getGalleryCommonJson(galleryIdentifier);
        }
        await fs.promises.writeFile(path.resolve(outputPrefix, `${galleryIdentifier.id}.json`), JSON.stringify(galleryInfoJson, null, "  "), "utf8");
        return {"status": true,
                "exists": false,
                "visible": galleryInfoJson["gallery_info_full"]["visible"],
                "visible_reason": galleryInfoJson["gallery_info_full"]["visible_reason"],
                "galleryIdentifier": galleryIdentifier,
            }; 
        }catch(e){
            console.log(`${currentArchieve["arcid"]} ${currentArchieve["filename"]} failed ${e}`);
            return {"status": false, "exists": false, "galleryIdentifier": galleryIdentifier, "reason": `${e}`};
        }
    } else {
        console.log(`${currentArchieve["arcid"]} ${currentArchieve["filename"]} failed`);
        return {"status": false, "exists": false, "reason": "GalleryIdentifier not exist."};
    }
}

async function main(){

    await fs.promises.mkdir(outputPrefix, {recursive: true});

    const runner = new Runner();
    const backupFileData = await fs.promises.readFile("list.json", "utf8");
    const archivesObj = JSON.parse(backupFileData);

    const final = {
        "fail": new Array(),
        "success_and_visible": new Array(),
        "invisible": new Array(),
        "fallback": new Array(),
    }
    
    let count = 0;

    for (const currentArchieve of archivesObj) {
        let result = await generateGalleryInfoJson(runner, currentArchieve);
        if (!result["exists"]){
            await new Promise((r) => setTimeout(r, 1000));
        }
        // console.log(result)
        

        if(result["status"]){
            const topush = {
                arcid: result["arcid"],
                title: currentArchieve["title"],
                link: `https://exhentai.org/g/${result.galleryIdentifier.id}/${result.galleryIdentifier.token}`,
            };
            if(result["visible"]){
                final["success_and_visible"].push(topush);
            }else{
                topush["visible_reason"] = result["visible_reason"];
                final["invisible"].push(topush);
            }
            console.log(`success!!! ${count++} / ${archivesObj.length}`);
        }else{
            result = await generateGalleryInfoJson(runner, currentArchieve, fromHtml=false);
            if(result["status"]){
                const topush = {
                    arcid: result["arcid"],
                    title: currentArchieve["title"],
                    link: `https://exhentai.org/g/${result.galleryIdentifier.id}/${result.galleryIdentifier.token}`,
                };
                final["fallback"].push(topush);
                console.log(`FALLBACK!!!  ${count++} / ${archivesObj.length}`);
            }else{
                if ("galleryIdentifier" in result){
                    topush["link"] = `https://exhentai.org/g/${result.galleryIdentifier.id}/${result.galleryIdentifier.token}`;
                }
                final["fail"].push(topush);
                console.log(`FAIL!!!  ${count++} / ${archivesObj.length}`);
            }
        }
        console.log();

        await fs.promises.writeFile("final.json", JSON.stringify(final, null, "  "), "utf8");
    }


}

if (require.main === module) {
	(async () => { await main(); })();
}

module.exports = {
	Runner
};
