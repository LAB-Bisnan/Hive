"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState } from "react";

const ImagePreviews = ({ images }: ImagePreviewsProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="relative h-[450px] w-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-2">🏠</p>
          <p className="text-gray-600 font-semibold">No images available</p>
        </div>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setImageLoaded(false);
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setImageLoaded(false);
  };

  const currentImage = images[currentImageIndex];

  return (
    <div className="relative h-[450px] w-full overflow-hidden bg-gray-100">
      {/* Loading State */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Actual Image */}
      <img
        key={currentImage}
        src={currentImage}
        alt={`Property Image ${currentImageIndex + 1}`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => {
          console.log('✅ Image loaded successfully:', currentImage);
          setImageLoaded(true);
        }}
        onError={(e) => {
          console.error('❌ Image failed to load:', currentImage);
          // @ts-ignore
          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450"%3E%3Crect fill="%23fef3c7" width="800" height="450"/%3E%3Ctext fill="%2392400e" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E🏠 Image Unavailable%3C/text%3E%3C/svg%3E';
          setImageLoaded(true);
        }}
        crossOrigin="anonymous"
      />
      
      {/* Navigation Buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-primary-700 bg-opacity-70 hover:bg-opacity-100 p-3 rounded-full focus:outline-none focus:ring focus:ring-secondary-300 z-20 transition-all"
        aria-label="Previous image"
      >
        <ChevronLeft className="text-white w-6 h-6" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-700 bg-opacity-70 hover:bg-opacity-100 p-3 rounded-full focus:outline-none focus:ring focus:ring-secondary-300 z-20 transition-all"
        aria-label="Next image"
      >
        <ChevronRight className="text-white w-6 h-6" />
      </button>

      {/* Image Counter */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm z-20">
        {currentImageIndex + 1} / {images.length}
      </div>
    </div>
  );
};

export default ImagePreviews;