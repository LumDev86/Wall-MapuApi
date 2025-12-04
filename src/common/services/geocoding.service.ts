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
    // ==== RATE LIMIT: 1 por segundo ====
    const now = Date.now();
    const diff = now - this.lastRequestTime;
    if (diff < 1000) await this.delay(1000 - diff);
    this.lastRequestTime = Date.now();

    // =============================
    // 1) PRIMER INTENTO (más preciso)
    // =============================
    try {
      const preciseResponse = await axios.get<NominatimResponse[]>(
        `${this.nominatimUrl}/search`,
        {
          params: {
            street: address,
            city: city,
            state: province,
            country: 'Argentina',
            format: 'json',
            addressdetails: 1,
            limit: 1,
          },
          headers: { 'User-Agent': 'PetShopsApp/1.0' },
        },
      );

      if (preciseResponse.data?.length) {
        const result = preciseResponse.data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formattedAddress: result.display_name,
        };
      }
    } catch (e) {
      // No tiramos error: pasamos al fallback ↓
    }

    // =============================
    // 2) SEGUNDO INTENTO (fallback con q)
    // =============================

    const fullAddress = `${address}, ${city}, ${province}, Argentina`;

    try {
      const fallback = await axios.get<NominatimResponse[]>(
        `${this.nominatimUrl}/search`,
        {
          params: {
            q: fullAddress,
            format: 'json',
            addressdetails: 1,
            limit: 1,
            countrycodes: 'ar',
          },
          headers: { 'User-Agent': 'PetShopsApp/1.0' },
        },
      );

      if (!fallback.data || fallback.data.length === 0) {
        throw new BadRequestException(
          `No se encontraron coordenadas para: ${fullAddress}`,
        );
      }

      const result = fallback.data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
      };
    } catch (error) {
      throw new BadRequestException(
        `No se pudo obtener la ubicación. Verifica la dirección ingresada.`,
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
