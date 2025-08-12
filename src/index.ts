import { scrapePeopleJob } from './jobs/scrapePeople';
import { fetchCompaniesJob } from './jobs/fetchCompanies';
import { connectJob } from './jobs/connect';

async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'scrape:people':
      await scrapePeopleJob();
      break;
    case 'fetch:companies':
      await fetchCompaniesJob();
      break;
    case 'connect':
      await connectJob();
      break;
    default:
      console.log('Usage:');
      console.log('  ts-node src/index.ts scrape:people');
      console.log('  ts-node src/index.ts fetch:companies');
      console.log('  ts-node src/index.ts connect');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 