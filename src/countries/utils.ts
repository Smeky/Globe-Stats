import { Vector3 } from "three"
import CountryData from "../../data/country-borders.json"
import CountryCenters from "../../data/country-centers.json"

type PolygonCoords = number[][]
type MultiPolygonCoords = number[][][]
type CountryGeometry = {
  type: "Polygon" | "MultiPolygon"
  coordinates: PolygonCoords[] | MultiPolygonCoords[]
}

type Country = {
  name: string
  iso3: string
  geometry: CountryGeometry
  center: Vector3 // relative (0-1) [lon, lat]
}

type CountryMap = Map<Country["iso3"], Country>

// Todo: lazy load during app loading screen
function loadCountries(): CountryMap {
  return CountryData.features.reduce((acc, feature) => {
    const iso3 = feature.properties.iso_a3
    const centerData = CountryCenters[iso3]

    acc.set(iso3, {
      name: feature.properties.admin,
      iso3,
      geometry: feature.geometry as CountryGeometry,
      center: centerData ? new Vector3(centerData.x, centerData.y, centerData.z) : new Vector3(0, 0, 0),
    })

    return acc
  }, new Map() as CountryMap)
}

export { loadCountries, Country, CountryGeometry, CountryMap, PolygonCoords, MultiPolygonCoords }
