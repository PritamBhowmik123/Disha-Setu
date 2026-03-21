const { analyzeDocumentAndRoute } = require('./src/services/document-analysis.service');

async function test() {
  const text = 'Blood test required. OPD consultation. Pharmacy for medication.';
  const buffer = Buffer.from(text, 'utf-8');
  try {
    const res = await analyzeDocumentAndRoute(buffer, 'text/plain', 'ceb6d9f9-39f8-4b9a-9c1a-1a2b3c4d5e1f', {});
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
