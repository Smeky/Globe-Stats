import CountryData from "../data/country-borders.json"

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
}

type CountryMap = Map<Country["iso3"], Country>

// Todo: lazy load during app loading screen
function loadCountries(): CountryMap {
  return CountryData.features.reduce((acc, feature) => {
    const iso3 = feature.properties.iso_a3

    acc.set(iso3, {
      name: feature.properties.name,
      iso3,
      geometry: feature.geometry as CountryGeometry,
    })

    return acc
  }, new Map() as CountryMap)
}

export { loadCountries, Country, CountryGeometry, CountryMap, PolygonCoords, MultiPolygonCoords }
