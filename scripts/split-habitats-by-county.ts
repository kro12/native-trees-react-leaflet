import fs from 'node:fs/promises'
import path from 'node:path'

import type { FeatureCollection, Feature } from 'geojson'
import { cleanTreeSpecies, getGenusFromSpecies } from '../src/utils'
import type { HabitatCollection } from '../src/constants'

const INPUT = 'public/data/NSNW_Woodland_Habitats_2010.json'
const OUT_DIR = 'public/data/habitats'
const INDEX_OUT = 'public/data/index.json'

function normalizeCountyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '')
}

async function main() {
  const raw = await fs.readFile(INPUT, 'utf8')
  const data = JSON.parse(raw) as unknown

  if (!data || typeof data !== 'object' || !('type' in data) || !('features' in data)) {
    throw new Error('Expected a GeoJSON FeatureCollection with a features array.')
  }

  const fc = data as HabitatCollection

  await fs.mkdir(OUT_DIR, { recursive: true })

  const byCounty = new Map<string, Feature[]>()
  const genera = new Set<string>()

  for (const f of fc.features) {
    const props = (f as Feature).properties as Record<string, unknown> | null | undefined
    const county = (props?.COUNTY as string | undefined)?.trim() || 'Unknown'

    // Track genus list using the SAME logic your app uses (but without mutating features)
    const rawSpecies =
      (props?.NS_SPECIES as string | undefined) ?? (props?.NSNW_DESC as string | undefined) ?? ''

    const cleaned = cleanTreeSpecies([rawSpecies])[0] ?? 'Unknown'
    const genus = getGenusFromSpecies(cleaned)
    if (genus) genera.add(genus)

    const arr = byCounty.get(county) ?? []
    arr.push(f as Feature)
    byCounty.set(county, arr)
  }

  const counties = Array.from(byCounty.keys()).sort((a, b) => a.localeCompare(b))
  const files: Record<string, string> = {}

  for (const county of counties) {
    const safe = normalizeCountyName(county)
    const filename = `${safe}.json`
    const outPath = path.join(OUT_DIR, filename)

    const outFc: FeatureCollection = {
      type: 'FeatureCollection',
      features: byCounty.get(county) ?? [],
    }

    await fs.writeFile(outPath, JSON.stringify(outFc))
    files[county] = `/data/habitats/${filename}`
  }

  const index = {
    counties: counties.filter((c) => c !== 'Unknown'),
    availableSpecies: Array.from(genera).sort((a, b) => a.localeCompare(b)),
    files,
  }

  await fs.writeFile(INDEX_OUT, JSON.stringify(index, null, 2))

  console.log(`✅ Wrote ${counties.length} county files to ${OUT_DIR}`)
  console.log(`✅ Wrote index: ${INDEX_OUT}`)
}

main().catch((err) => {
  console.error('❌ Split failed:', err)
  process.exit(1)
})
