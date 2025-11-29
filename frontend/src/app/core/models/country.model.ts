export interface Country {
  _id: string;
  name: string;
  code: string;
  flagUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCountryDto {
  name: string;
  code: string;
  flagUrl?: string;
}

export interface UpdateCountryDto {
  name?: string;
  code?: string;
  flagUrl?: string;
}
