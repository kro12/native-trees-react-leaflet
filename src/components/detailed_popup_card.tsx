import type { Feature } from 'geojson'
import type { SpeciesInfo } from '../constants'
import { getColorForSpecies } from "../utils"

type HabitatProperties = {
  cleanedSpecies?: string
  _genus: string | null;  // <--- Change from just 'string'
  COUNTY: string | string[]
  SITE_NAME?: string
  AREA: number
}

type Props = {
  feature: Feature<any, HabitatProperties>
  speciesInfo: Record<string, SpeciesInfo>
}

const DetailedPopupCard = ({ feature, speciesInfo }: Props) => {
  const species = feature.properties.cleanedSpecies || "Unknown"
  const color = getColorForSpecies(species)
  const genus = feature.properties._genus
  const info = genus ? speciesInfo[genus] : undefined

  const county = Array.isArray(feature.properties.COUNTY)
    ? feature.properties.COUNTY.join(", ")
    : feature.properties.COUNTY || "Unknown"

  return (
    <div style={{ fontFamily: "sans-serif", minWidth: "280px" }}>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>
        {feature.properties.SITE_NAME || "NSNW Site"}
      </h3>

      {info && (
        <>
          <img
            src={info.image}
            alt={species}
            style={{
              width: "100%",
              height: "150px",
              objectFit: "cover",
              borderRadius: "4px",
              marginBottom: "12px",
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = "none"
            }}
          />
          <p
            style={{
              margin: "0 0 12px 0",
              fontSize: "13px",
              color: "#666",
              lineHeight: "1.5",
            }}
          >
            {info.description}
          </p>
        </>
      )}

      <div style={{ fontSize: "13px", lineHeight: "1.8" }}>
        <div>
          <strong>County:</strong> {county}
        </div>
        <div>
          <strong>Species:</strong>{" "}
          <span style={{ color, fontWeight: "bold" }}>{species}</span>
        </div>
        <div>
          <strong>Area:</strong> {(feature.properties.AREA / 10000).toFixed(2)}{" "}
          ha
        </div>
      </div>
    </div>
  )
}

export default DetailedPopupCard
