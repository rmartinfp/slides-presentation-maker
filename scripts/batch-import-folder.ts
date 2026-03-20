/**
 * Batch import all Google Slides from a Drive folder.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx GOOGLE_ACCESS_TOKEN=xxx \
 *   npx tsx scripts/batch-import-folder.ts <folder-id>
 *
 * It lists all Google Slides in the folder, checks which are already
 * imported, and imports the missing ones sequentially.
 */

import { execSync } from 'child_process';

const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN || '';
const FOLDER_ID = process.argv[2] || '1q5pGd6bzodkAnnfR_n2NPnVgxR76rgmm';

if (!ACCESS_TOKEN) {
  console.error('Set GOOGLE_ACCESS_TOKEN env var');
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

async function listSlidesInFolder(folderId: string): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = [];
  let pageToken = '';

  do {
    const query = encodeURIComponent(`'${folderId}' in parents and mimeType='application/vnd.google-apps.presentation' and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=nextPageToken,files(id,name,mimeType)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    if (!res.ok) {
      console.error(`Drive API error: ${res.status} ${await res.text()}`);
      process.exit(1);
    }

    const data = await res.json();
    allFiles.push(...(data.files || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return allFiles;
}

async function main() {
  console.log(`Listing Google Slides in folder ${FOLDER_ID}...`);
  const files = await listSlidesInFolder(FOLDER_ID);
  console.log(`Found ${files.length} presentations:\n`);

  files.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.id})`));
  console.log('');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n[${'='.repeat(40)}]`);
    console.log(`[${i + 1}/${files.length}] Importing: ${file.name}`);
    console.log(`[${'='.repeat(40)}]`);

    try {
      execSync(
        `npx tsx scripts/import-pptx-template.ts ${file.id}`,
        {
          stdio: 'inherit',
          env: { ...process.env },
          timeout: 120_000, // 2 min per template
        },
      );
      imported++;
      console.log(`✓ Done: ${file.name}`);
    } catch (err: any) {
      failed++;
      console.error(`✗ Failed: ${file.name} — ${err.message || 'unknown error'}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`BATCH IMPORT COMPLETE`);
  console.log(`  Total:    ${files.length}`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`${'='.repeat(50)}`);
}

main().catch(console.error);
