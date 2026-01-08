'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// Fix Leaflet icon issue
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export interface MapMarker {
  id: string
  lat: number
  lng: number
  title?: string
  description?: React.ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
}

interface MapProps {
  markers: MapMarker[]
  className?: string
  center?: [number, number]
}

export default function Map({ markers, className, center: userCenter }: MapProps) {
  // Center on Aceh by default or the first marker
  const defaultCenter: [number, number] = [4.6951, 96.7494]
  const center = userCenter || (markers.length > 0
    ? [markers[0].lat, markers[0].lng] as [number, number]
    : defaultCenter)

  return (
    <MapContainer
      center={center}
      zoom={9}
      className={className}
      style={{ height: className ? undefined : '600px', width: '100%', borderRadius: '0.5rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={icon}
        >
          <Popup>
            <div className="max-w-xs">
              {marker.title && <h3 className="font-bold mb-2">{marker.title}</h3>}
              <div className="text-sm space-y-1">
                {marker.description}
                {marker.data && (
                  <div className="mt-2 pt-2 border-t max-h-40 overflow-y-auto">
                    <pre className="text-xs bg-muted p-2 rounded">
                      {JSON.stringify(marker.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
