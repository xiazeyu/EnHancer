"use strict";

const fs = require("fs");

async function main(){

    const jsonFile = await fs.promises.readFile("final.json", "utf8");
    const jsonObj = JSON.parse(jsonFile);

    const final = {
        "success": new Array(),
        "tocheck": new Array(),
        "fail": new Array(),
    }
    
    let count = 0;

    for (const obj of jsonObj["fail"]) {
        if ("link" in obj){
            final["tocheck"].push(obj["link"]);
        }else{
            final["fail"].push(obj["arcid"]);
        }
        
        console.log(`${count++} / ${jsonObj["fail"].length}`);

        await fs.promises.writeFile("statistics.json", JSON.stringify(final, null, "  "), "utf8");
    }

    count = 0;

    for (const obj of jsonObj["success_and_visible"]) {
        
        final["success"].push(obj["link"]);
        
        console.log(`${count++} / ${jsonObj["success_and_visible"].length}`);

        await fs.promises.writeFile("statistics.json", JSON.stringify(final, null, "  "), "utf8");
    }

    count = 0;
    
    for (const obj of jsonObj["invisible"]) {
        
        final["tocheck"].push(obj["link"]);
        
        console.log(`${count++} / ${jsonObj["invisible"].length}`);

        await fs.promises.writeFile("statistics.json", JSON.stringify(final, null, "  "), "utf8");
    }

}

if (require.main === module) {
	(async () => { await main(); })();
}
