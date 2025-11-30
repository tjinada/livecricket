export interface BackgroundConfig {
  type: 'image' | 'video' | 'none';
  url: string | null;
}

export interface Country {
  _id: string;
  name: string;
  code: string;
  flagUrl?: string;
  background?: BackgroundConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCountryDto {
  name: string;
  code: string;
  flagUrl?: string;
  background?: BackgroundConfig;
}

export interface UpdateCountryDto {
  name?: string;
  code?: string;
  flagUrl?: string;
  background?: BackgroundConfig;
}
