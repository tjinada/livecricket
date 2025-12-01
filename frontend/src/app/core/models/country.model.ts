export interface BackgroundConfig {
  type: 'image' | 'video' | 'none';
  url: string | null;
}

export interface Country {
  _id: string;
  name: string;
  code: string;
  flagUrl?: string;
  flagVideo?: string;  // Animated flag video for display overlay
  background?: BackgroundConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCountryDto {
  name: string;
  code: string;
  flagUrl?: string;
  flagVideo?: string;
  background?: BackgroundConfig;
}

export interface UpdateCountryDto {
  name?: string;
  code?: string;
  flagUrl?: string;
  flagVideo?: string;
  background?: BackgroundConfig;
}
