require('ts-node').register({
  compilerOptions: {
    module: "CommonJS",
    esModuleInterop: true,
    paths: {
      "@/*": ["./*"]
    }
  }
});
const { crawlGoogleMaps } = require('./lib/crawler/googleMapsCrawler');

async function test() {
  console.log("Starting test...");
  try {
    const leads = await crawlGoogleMaps('Oficinas', 'Torres, RS');
    console.log("Total leads:", leads.length);
    if (leads.length > 0) {
      console.log("First lead photos:", leads[0].photos);
      console.log("First lead phone:", leads[0].phone);
      console.log("First lead website:", leads[0].originalWebsite);
    }
  } catch (err) {
    console.error(err);
  }
}

test();
