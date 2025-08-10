import { fromArrayBuffer } from "geotiff"
import { Vector3 } from "three"

export const loadPopulationData = async (url: string, positions: Vector3[], globeRadius: number) => {
  const response = await fetch(url)
  const tiff = await fromArrayBuffer(await response.arrayBuffer())
  const image = await tiff.getImage()
  const rasters = await image.readRasters({ samples: [0] })
  
  const data = rasters[0]
  const bbox = image.getBoundingBox()
  const width = image.getWidth()
  const height = image.getHeight()
  
  const results = positions.map(pos => {
    const lat = Math.asin(pos.y / globeRadius) * 180 / Math.PI
    const lon = Math.atan2(-pos.z, pos.x) * 180 / Math.PI
    
    const x = Math.floor((lon - bbox[0]) / (bbox[2] - bbox[0]) * width)
    const y = Math.floor((bbox[3] - lat) / (bbox[3] - bbox[1]) * height)
    
    if (x < 0 || x >= width || y < 0 || y >= height) return 0
    
    return data[y * width + x] || 0
  })
  
  const maxValue = Math.max(...results.filter(v => v > 0))
  return results.map(v => Math.log1p(v) / Math.log1p(maxValue))
}
