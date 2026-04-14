"use client";

import Card from "@/components/Card";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { useGetAuthUserQuery, useGetManagerPropertiesQuery } from "@/state/api";
import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const Properties = () => {
  const router = useRouter(); // ← FIXED: Inside component now!
  
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: managerProperties,
    isLoading,
    error,
  } = useGetManagerPropertiesQuery(authUser?.cognitoInfo?.userId || "", {
    skip: !authUser?.cognitoInfo?.userId,
  });

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading manager properties</div>;

  return (
    <div className="dashboard-container">
      <Header
        title="My Properties"
        subtitle="View and manage your property listings"
      />
      
      {/* Action Buttons */}
      <div className="flex justify-end mb-4 gap-3">
        <button
          onClick={() => alert("Delete property feature - coming soon!")}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Property
        </button>
        <button
          onClick={() => router.push("/managers/newproperty")}
          className="bg-[#FFC107] hover:bg-[#FFA000] text-[#1c252c] font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Property
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {managerProperties?.map((property) => (
          <Card
            key={property.id}
            property={property}
            isFavorite={false}
            onFavoriteToggle={() => {}}
            showFavoriteButton={false}
            propertyLink={`/managers/properties/${property.id}`}
          />
        ))}
      </div>
      {(!managerProperties || managerProperties.length === 0) && (
        <p>You don&lsquo;t manage any properties</p>
      )}
    </div>
  );
};

export default Properties;