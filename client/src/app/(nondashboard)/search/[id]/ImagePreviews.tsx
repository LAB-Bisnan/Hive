"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState } from "react";

const ImagePreviews = ({ images }: ImagePreviewsProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fallback image if the array is empty
  if (!images || images.length === 0) {
    return (
      <div className="relative h-[450px] w-full bg-gray-100 flex items-center justify-center">
        <img 
          src="/placeholder.jpg" 
          alt="No image available" 
          className="w-full h-full object-cover opacity-50"
        />
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[currentImageIndex];

  return (
    <div className="relative h-[450px] w-full overflow-hidden bg-gray-100">
      {/* Image Container */}
      <div className="absolute inset-0">
        <img
          key={currentImage} // Key forces re-render when index changes
          src={currentImage}
          alt={`Property Image ${currentImageIndex + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // If image fails, switch to placeholder
            // @ts-ignore
            if (e.target.src !== `${window.location.origin}/placeholder.jpg`) {
               e.target.src = '/placeholder.jpg';
            }
          }}
        />
      </div>
      
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