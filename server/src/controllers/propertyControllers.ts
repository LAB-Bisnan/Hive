import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { wktToGeoJSON } from "@terraformer/wkt";
import { S3Client } from "@aws-sdk/client-s3";
import { Location } from "@prisma/client";
import { Upload } from "@aws-sdk/lib-storage";
import axios from "axios";

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

export const getProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      favoriteIds,
      priceMin,
      priceMax,
      beds,
      baths,
      propertyType,
      squareFeetMin,
      squareFeetMax,
      amenities,
      availableFrom,
      latitude,
      longitude,
    } = req.query;

    let whereConditions: Prisma.Sql[] = [];

    if (favoriteIds) {
      const favoriteIdsArray = (favoriteIds as string).split(",").map(Number);
      whereConditions.push(
        Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`
      );
    }

    if (priceMin) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" >= ${Number(priceMin)}`
      );
    }

    if (priceMax) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" <= ${Number(priceMax)}`
      );
    }

    if (beds && beds !== "any") {
      whereConditions.push(Prisma.sql`p.beds >= ${Number(beds)}`);
    }

    if (baths && baths !== "any") {
      whereConditions.push(Prisma.sql`p.baths >= ${Number(baths)}`);
    }

    if (squareFeetMin) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" >= ${Number(squareFeetMin)}`
      );
    }

    if (squareFeetMax) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" <= ${Number(squareFeetMax)}`
      );
    }

    if (propertyType && propertyType !== "any") {
      whereConditions.push(
        Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`
      );
    }

    if (amenities && amenities !== "any") {
      const amenitiesArray = (amenities as string).split(",");
      whereConditions.push(Prisma.sql`p.amenities @> ${amenitiesArray}`);
    }

    if (availableFrom && availableFrom !== "any") {
      const availableFromDate =
        typeof availableFrom === "string" ? availableFrom : null;
      if (availableFromDate) {
        const date = new Date(availableFromDate);
        if (!isNaN(date.getTime())) {
          whereConditions.push(
            Prisma.sql`EXISTS (
              SELECT 1 FROM "Lease" l 
              WHERE l."propertyId" = p.id 
              AND l."startDate" <= ${date.toISOString()}
            )`
          );
        }
      }
    }

    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusInKilometers = 1000;
      const degrees = radiusInKilometers / 111; // Converts kilometers to degrees

      whereConditions.push(
        Prisma.sql`ST_DWithin(
          l.coordinates::geometry,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${degrees}
        )`
      );
    }

    const completeQuery = Prisma.sql`
      SELECT 
        p.*,
        json_build_object(
          'id', l.id,
          'address', l.address,
          'city', l.city,
          'state', l.state,
          'country', l.country,
          'postalCode', l."postalCode",
          'coordinates', json_build_object(
            'longitude', ST_X(l."coordinates"::geometry),
            'latitude', ST_Y(l."coordinates"::geometry)
          )
        ) as location
      FROM "Property" p
      JOIN "Location" l ON p."locationId" = l.id
      ${
        whereConditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}`
          : Prisma.empty
      }
    `;

    const properties = await prisma.$queryRaw(completeQuery);

    res.json(properties);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving properties: ${error.message}` });
  }
};

export const getProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const property = await prisma.property.findUnique({
      where: { id: Number(id) },
      include: {
        location: true,
      },
    });

    if (property) {
      const coordinates: { coordinates: string }[] =
        await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

      const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || "");
      const longitude = geoJSON.coordinates[0];
      const latitude = geoJSON.coordinates[1];

      const propertyWithCoordinates = {
        ...property,
        location: {
          ...property.location,
          coordinates: {
            longitude,
            latitude,
          },
        },
      };
      res.json(propertyWithCoordinates);
    }
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error retrieving property: ${err.message}` });
  }
};

export const createProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const {
      address,
      city,
      state,
      country,
      postalCode,
      managerCognitoId,
      ...propertyData
    } = req.body;

    const photoUrls = await Promise.all(
      files.map(async (file) => {
        const uploadParams = {
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: `properties/${Date.now()}-${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        const uploadResult = await new Upload({
          client: s3Client,
          params: uploadParams,
        }).done();

        return uploadResult.Location;
      })
    );

    // Geocoding with smart fallback for Philippine addresses
    let longitude = 0;
    let latitude = 0;

    try {
      const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
        {
          q: `${address}, ${city}, ${state}, ${country}`,
          format: "json",
          limit: "1",
        }
      ).toString()}`;
      
      const geocodingResponse = await axios.get(geocodingUrl, {
        headers: {
          "User-Agent": "HiveRealEstate/1.0 (justsomedummyemail@gmail.com)",
        },
        timeout: 5000,
      });
      
      if (geocodingResponse.data && geocodingResponse.data.length > 0) {
        longitude = parseFloat(geocodingResponse.data[0].lon);
        latitude = parseFloat(geocodingResponse.data[0].lat);
      } else {
        // Smart fallback: search in combined location string
        console.log(`Geocoding failed, using smart fallback`);
        
        // Combine all location fields for better matching
        const fullLocation = `${address} ${city} ${state} ${country}`.toLowerCase();
        
        // Philippine cities and districts with coordinates
        const locationFallbacks: Record<string, [number, number]> = {
          // Major cities
          'manila': [120.9842, 14.5995],
          'quezon city': [121.0244, 14.6760],
          'makati': [121.0244, 14.5547],
          'taguig': [121.0800, 14.5176],
          'pasig': [121.0800, 14.5764],
          'mandaluyong': [121.0394, 14.5794],
          'pasay': [121.0014, 14.5378],
          'caloocan': [120.9668, 14.6507],
          'paranaque': [121.0194, 14.4793],
          'las pinas': [120.9833, 14.4453],
          'muntinlupa': [121.0437, 14.3832],
          'valenzuela': [120.9833, 14.6937],
          'malabon': [120.9567, 14.6650],
          'navotas': [120.9417, 14.6667],
          'marikina': [121.1019, 14.6507],
          
          // Manila districts (for addresses like "Tondo Manila")
          'tondo': [120.9667, 14.6167],
          'divisoria': [120.9833, 14.6000],
          'binondo': [120.9736, 14.5969],
          'intramuros': [120.9736, 14.5889],
          'ermita': [120.9833, 14.5833],
          'malate': [120.9833, 14.5750],
          'sampaloc': [121.0000, 14.6167],
          'san miguel': [121.0167, 14.6000],
          'sta. cruz': [120.9833, 14.6000],
          'sta. mesa': [121.0000, 14.6000],
          'pacita': [121.0167, 14.5833],
          
          // Other major PH areas
          'makati city': [121.0244, 14.5547],
          'taguig city': [121.0800, 14.5176],
          'pasay city': [121.0014, 14.5378],
          'quezon': [121.0244, 14.6760],
        };
        
        // Try to find a match in the full location string
        let found = false;
        for (const [locationName, coords] of Object.entries(locationFallbacks)) {
          if (fullLocation.includes(locationName)) {
            [longitude, latitude] = coords;
            console.log(`Matched location: ${locationName}`);
            found = true;
            break;
          }
        }
        
        // If still no match, default to Manila
        if (!found) {
          [longitude, latitude] = [120.9842, 14.5995];
          console.log('Using default Manila coordinates');
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      // Default to Manila coordinates on error
      [longitude, latitude] = [120.9842, 14.5995];
    }

    // create location
    const [location] = await prisma.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
      RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
    `;

    // create property
    const newProperty = await prisma.property.create({
      data: {
        ...propertyData,
        photoUrls,
        locationId: location.id,
        managerCognitoId,
        amenities:
          typeof propertyData.amenities === "string"
            ? propertyData.amenities.split(",")
            : [],
        highlights:
          typeof propertyData.highlights === "string"
            ? propertyData.highlights.split(",")
            : [],
        isPetsAllowed: propertyData.isPetsAllowed === "true",
        isParkingIncluded: propertyData.isParkingIncluded === "true",
        pricePerMonth: parseFloat(propertyData.pricePerMonth),
        securityDeposit: parseFloat(propertyData.securityDeposit),
        applicationFee: parseFloat(propertyData.applicationFee),
        beds: parseInt(propertyData.beds),
        baths: parseFloat(propertyData.baths),
        squareFeet: parseInt(propertyData.squareFeet),
      },
      include: {
        location: true,
        manager: true,
      },
    });

    res.status(201).json(newProperty);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error creating property: ${err.message}` });
  }
};
