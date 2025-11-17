import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

@Injectable()
export class GeocodingService {
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org';
  private lastRequestTime = 0;

  async geocodeAddress(
    address: string,
    city?: string,
    province?: string,
  ): Promise<{ latitude: number; longitude: number; formattedAddress: string }> {
    // Respetar rate limit de 1 request/segundo
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 1000) {
      await this.delay(1000 - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();

    const fullAddress = [address, city, province, 'Argentina']
      .filter(Boolean)
      .join(', ');

    try {
      const response = await axios.get<NominatimResponse[]>(
        `${this.nominatimUrl}/search`,
        {
          params: {
            q: fullAddress,
            format: 'json',
            addressdetails: 1,
            limit: 1,
            countrycodes: 'ar',
          },
          headers: {
            'User-Agent': 'PetShopsApp/1.0',
          },
        },
      );

      if (!response.data || response.data.length === 0) {
        throw new BadRequestException(
          `No se encontraron coordenadas para: ${fullAddress}`,
        );
      }

      const result = response.data[0];

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Error al geocodificar la dirección: ${error.message}`,
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}