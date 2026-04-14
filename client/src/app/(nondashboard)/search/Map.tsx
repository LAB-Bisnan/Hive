"use client";
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector } from "@/state/redux";
import { useGetPropertiesQuery } from "@/state/api";
import { Property } from "@/types/prismaTypes";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

const Map = () => {
  const mapContainerRef = useRef(null);
  const filters = useAppSelector((state) => state.global.filters);
  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  useEffect(() => {
    if (isLoading || isError || !properties) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: "mapbox://styles/mapbox/streets-v12",
      center: filters.coordinates || [-74.5, 40],
      zoom: 9,
    });

    properties.forEach((property) => {
      const marker = createPropertyMarker(property, map);
      const markerElement = marker.getElement();
      const path = markerElement.querySelector("path[fill='#3FB1CE']");
      if (path) path.setAttribute("fill", "#fec629"); 
    });

    const resizeMap = () => {
      if (map) setTimeout(() => map.resize(), 700);
    };
    resizeMap();

    return () => map.remove();
  }, [isLoading, isError, properties, filters.coordinates]);

  if (isLoading) return <>Loading...</>;
  if (isError || !properties) return <div>Failed to fetch properties</div>;

  return (
    <div className="basis-5/12 grow relative rounded-xl">
      <div
        className="map-container rounded-xl"
        ref={mapContainerRef}
        style={{
          height: "100%",
          width: "100%",
        }}
      />
    </div>
  );
};

const createPropertyMarker = (property: Property, map: mapboxgl.Map) => {
  const marker = new mapboxgl.Marker()
    .setLngLat([
      property.location.coordinates.longitude,
      property.location.coordinates.latitude,
    ])
.setPopup(
  new mapboxgl.Popup({ offset: 25, closeButton: true }).setHTML(
    `
    <div style="
      background: white; 
      padding: 12px; 
      border-radius: 8px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
      min-width: 200px;
      border: 1px solid #f0f0f0;
    ">
      <div style="margin-bottom: 8px;">
        <a href="/search/${property.id}" style="
          color: #856404; 
          font-weight: 600; 
          font-size: 15px; 
          text-decoration: none;
        ">${property.name}</a>
      </div>
      <p style="
        color: #856404; 
        font-weight: 700; 
        font-size: 18px; 
        margin: 0;
      ">
        ₱${property.pricePerMonth.toFixed(0)}
        <span style="
          font-size: 13px; 
          font-weight: 400; 
          color: #666;
        "> / month</span>
      </p>
    </div>
    `
  )
)
    .addTo(map);
  return marker;
};

export default Map;
