#!/usr/bin/env npx tsx
/**
 * Downloads preview GIFs from external URLs, uploads them to Supabase Storage,
 * and updates the thumbnail_url in the cinematic_templates table.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/upload-preview-gifs.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okzaoakyasaohohktntd.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const PREVIEW_MAP: { slug: string; sourceUrl: string }[] = [
  { slug: 'viktory',      sourceUrl: 'https://motionsites.ai/assets/hero-web3-eos-poster-DF0_WdVS.png' },
  { slug: 'lumina',        sourceUrl: 'https://motionsites.ai/assets/hero-digitwist-preview-s2pJetjQ.gif' },
  { slug: 'velorah',       sourceUrl: 'https://motionsites.ai/assets/hero-mindloop-preview-BR8xW6xW.gif' },
  { slug: 'velorah-navy',  sourceUrl: 'https://motionsites.ai/assets/hero-velorah-preview-CJNTtbpd.gif' },
  { slug: 'bloom',         sourceUrl: 'https://motionsites.ai/assets/hero-bloom-ai-preview-g6RcYLTl.gif' },
  { slug: 'logoisum',      sourceUrl: 'https://motionsites.ai/assets/hero-logoisum-preview-yhpSc7Yy.gif' },
  { slug: 'fortune',       sourceUrl: 'https://motionsites.ai/assets/hero-buzzentic-preview-CbopM29R.gif' },
  { slug: 'taskly',        sourceUrl: 'https://motionsites.ai/assets/hero-taskly-preview-Dq2MKaI0.gif' },
  { slug: 'apex',          sourceUrl: 'https://motionsites.ai/assets/hero-new-era-preview-CocuDUm9.gif' },
  { slug: 'grow',          sourceUrl: 'https://motionsites.ai/assets/hero-apex-saas-preview-CbnBKSPv.gif' },
];

async function main() {
  console.log(`Uploading ${PREVIEW_MAP.length} preview images...\n`);

  for (const { slug, sourceUrl } of PREVIEW_MAP) {
    const ext = sourceUrl.endsWith('.png') ? 'png' : 'gif';
    const contentType = ext === 'png' ? 'image/png' : 'image/gif';
    const storagePath = `cinematic-previews/${slug}.${ext}`;

    try {
      // 1. Download
      console.log(`  ↓ Downloading ${slug}...`);
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${sourceUrl}`);
      const buffer = await res.arrayBuffer();

      // 2. Upload to Storage (upsert)
      console.log(`  ↑ Uploading ${storagePath} (${(buffer.byteLength / 1024).toFixed(0)} KB)...`);
      const { error: uploadErr } = await supabase.storage
        .from('presentation-assets')
        .upload(storagePath, new Uint8Array(buffer), {
          contentType,
          cacheControl: '31536000',
          upsert: true,
        });
      if (uploadErr) throw new Error(`Upload error: ${uploadErr.message}`);

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from('presentation-assets')
        .getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // 4. Update cinematic_templates
      const { error: updateErr } = await supabase
        .from('cinematic_templates')
        .update({ thumbnail_url: publicUrl })
        .eq('slug', slug);
      if (updateErr) throw new Error(`DB update error: ${updateErr.message}`);

      console.log(`  ✓ ${slug} → ${publicUrl}\n`);
    } catch (err: any) {
      console.error(`  ✗ ${slug}: ${err.message}\n`);
    }
  }

  console.log('Done!');
}

main();
