import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Country, CreateCountryDto, UpdateCountryDto, ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private readonly apiUrl = '/api/countries';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Country[]>> {
    return this.http.get<ApiResponse<Country[]>>(this.apiUrl);
  }

  getById(id: string): Observable<ApiResponse<Country>> {
    return this.http.get<ApiResponse<Country>>(`${this.apiUrl}/${id}`);
  }

  create(country: CreateCountryDto): Observable<ApiResponse<Country>> {
    return this.http.post<ApiResponse<Country>>(this.apiUrl, country);
  }

  update(id: string, country: UpdateCountryDto): Observable<ApiResponse<Country>> {
    return this.http.put<ApiResponse<Country>>(`${this.apiUrl}/${id}`, country);
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
